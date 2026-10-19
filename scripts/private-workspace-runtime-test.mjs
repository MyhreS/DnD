import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {runtime}=require(fileURLToPath(new URL('../functions/lib/privateWorkspace/runtime.js',import.meta.url)));
function fixture(path='/app/'){
 const events={},requests=[],intervals=[],channels=[],navigation=[],storage=new Map();let focused=true;
 const document={title:'Synthetic private fixture',hidden:false,documentElement:{style:{}},body:{removed:false,appended:0,replaceChildren(){this.removed=true;},append(){this.appended++;}},hasFocus:()=>focused,addEventListener:(name,fn)=>{events[`document:${name}`]=fn;},createElement:()=>({style:{}})};
 const store={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key),clear:()=>storage.clear()};
 const scope={document,window:{},localStorage:store,sessionStorage:store,location:{pathname:path,replace:value=>navigation.push(value)},BroadcastChannel:class{constructor(){channels.push(this);}postMessage(value){this.sent=value;}},addEventListener:(name,fn)=>{events[name]=fn;},setInterval:fn=>intervals.push(fn),fetch:async(url,options)=>{requests.push({url,options});return {ok:true,status:200,json:async()=>({revision:0,state:null})};}};
 runInNewContext(runtime,scope);
 return {scope,document,events,requests,intervals,channels,navigation,storage,focus:value=>{focused=value;}};
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const main=fixture();main.events.DOMContentLoaded();assert.equal(main.document.body.appended,1);assert.equal(main.document.documentElement.style.visibility,'hidden');main.events.pageshow();await flush();assert.equal(main.document.documentElement.style.visibility,'visible');
main.focus(false);main.events.blur();main.intervals[0]();await flush();assert.equal(main.document.documentElement.style.visibility,'hidden','Background checks cannot reveal a blurred GM screen');
const presentation=fixture('/app/view/');presentation.events.DOMContentLoaded();assert.equal(presentation.document.body.appended,0,'Player artwork must not have a GM lock overlay');presentation.focus(false);assert.equal(presentation.events.blur,undefined,'Player presentation must stay visible when its window loses focus');presentation.events.pageshow();await flush();assert.equal(presentation.document.documentElement.style.visibility,'visible');
presentation.events.offline();assert.equal(presentation.document.documentElement.style.visibility,'hidden');assert.equal(presentation.document.body.removed,true);assert.deepEqual(presentation.navigation,['/']);assert.equal(presentation.storage.get('workspace-lock-pending'),'1');
const delayed=fixture();let finish;delayed.scope.fetch=()=>new Promise(resolve=>{finish=resolve;});delayed.events.pageshow();delayed.events.offline();finish({ok:true,status:200});await flush();assert.equal(delayed.document.documentElement.style.visibility,'hidden','A late request cannot reveal content after lock/offline');
const lock=fixture();await lock.scope.window.protectedWorkspace.lock();assert.equal(lock.document.body.removed,true);assert.equal(lock.channels[0].sent,'lock');assert.equal(lock.requests[0].url,'/api/lock');assert.equal(lock.requests[0].options.headers['X-Workspace-Action'],'lock');
const otherWindow=fixture();otherWindow.channels[0].onmessage({data:'lock'});assert.equal(otherWindow.document.body.removed,true);assert.deepEqual(otherWindow.navigation,['/']);
console.log('Synthetic runtime checks passed: offline clearing, late-response lock, cross-window lock, background GM privacy and stable player presentation.');
