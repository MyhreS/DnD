import './private-workspace-runtime-test.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
if(!process.env.FIRESTORE_EMULATOR_HOST||!process.env.FIREBASE_AUTH_EMULATOR_HOST||!process.env.GCLOUD_PROJECT?.startsWith('demo-'))throw Error('Isolated demo emulators are required.');
const require=createRequire(new URL('../functions/package.json',import.meta.url));
const {initializeApp}=require('firebase-admin/app');const {getAuth}=require('firebase-admin/auth');const {getFirestore}=require('firebase-admin/firestore');
const project=process.env.GCLOUD_PROJECT;
const app=initializeApp({projectId:project});const auth=getAuth(app),db=getFirestore(app);
const prefix=`http://127.0.0.1:5001/${project}/europe-west1`;
const origin='https://fixture-secure.web.app';
const password='Synthetic-test-password-42';
const hash=value=>createHash('sha256').update(value).digest('hex');
async function google(email){
 const googleToken=[Buffer.from(JSON.stringify({alg:'none',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:email,email,email_verified:true,name:'Synthetic fixture',iss:'https://accounts.google.com',aud:'fixture-client',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),''].join('.');
 const r=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestUri:'http://localhost',postBody:new URLSearchParams({providerId:'google.com',id_token:googleToken}).toString(),returnSecureToken:true})});
 const body=await r.json();assert.ok(r.ok,JSON.stringify(body));return {uid:body.localId,idToken:body.idToken};
}
async function call(path,{user,cookie,body,method='GET',headers={}}={}){
 return fetch(`${prefix}/privateWorkspace${path}`,{method,headers:{Origin:origin,...(user?{Authorization:`Bearer ${user.idToken}`} : {}),...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
}
async function callable(name,user){return fetch(`${prefix}/${name}`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${user.idToken}`},body:'{"data":{}}'});}
const body=Buffer.from('<!doctype html><html><head></head><body>SYNTHETIC_PRIVATE_CANARY_7f19</body></html>');
const manifest=JSON.stringify({'index.html':{sha256:hash(body),type:'text/html',bytes:body.length,chunks:1}});const release=hash(manifest);
await db.doc(`privateWorkspaceReleases/${release}/files/${hash("index.html")}/chunks/000`).set({bytes:body});
await db.doc(`privateWorkspaceReleases/${release}`).set({manifest});
await db.doc('privateWorkspaceSettings/current').set({enabled:true,origin,label:'Synthetic private workspace',release,networkSalt:'a'.repeat(64)});
const gm=await google('gm@example.test'),admin=await google('admin@example.test'),player=await google('player@example.test');
for(const [u,role] of [[gm,'gm'],[admin,'admin']])await db.doc(`privateWorkspaceGrants/${u.uid}`).set({uid:u.uid,email:`${role==='gm'?'gm':'admin'}@example.test`,role,enabled:true,sessionVersion:'fixture-session-version'});
await db.doc('games/fixture-unrelated-game').set({dmUid:player.uid});
await db.doc('allowlist/player@example.test').set({accessRole:'admin',playerType:'dm'});
assert.equal((await call('/app/')).status,404);
const gate=await call('/');assert.equal(gate.status,200);assert.doesNotMatch(await gate.text(),/SYNTHETIC_PRIVATE_CANARY_7f19/);assert.match(gate.headers.get('content-security-policy'),/frame-ancestors 'none'/);
for(const path of ['/api/session','/api/state','/runtime.js'])assert.equal((await call(path)).status,404);
assert.equal((await call('/app/',{user:gm})).status,404,'Google login alone must not bypass password');
for(const user of [undefined,player]){assert.equal((await call('/api/profile',{user})).status,404);assert.equal((await call('/api/unlock',{user,method:'POST',body:{password,create:true}})).status,404);}
for(const user of [gm,admin]){
 assert.equal((await call('/api/profile',{user})).status,200);
 const unlocked=await call('/api/unlock',{user,method:'POST',body:{password,create:true}});assert.equal(unlocked.status,200,await unlocked.text());
 assert.match(unlocked.headers.get('set-cookie'),/HttpOnly/);assert.match(unlocked.headers.get('set-cookie'),/Secure/);assert.match(unlocked.headers.get('set-cookie'),/SameSite=Strict/);
 user.cookie=unlocked.headers.get('set-cookie').split(';')[0];
 const resource=await call('/app/',{cookie:user.cookie});assert.equal(resource.status,200);assert.match(await resource.text(),/SYNTHETIC_PRIVATE_CANARY_7f19/);assert.match(resource.headers.get('cache-control'),/private.*no-store/);
}
const reusedEntry={sha256:hash(body),type:'text/html',bytes:body.length,chunks:1,sourceRelease:release};
for(const [entry,expected] of [[reusedEntry,200],[{...reusedEntry,sourceRelease:'../outside'},404],[{...reusedEntry,sourceRelease:'f'.repeat(64)},404],[{...reusedEntry,sha256:'0'.repeat(64)},404]]){
 const nextManifest=JSON.stringify({'index.html':entry}),nextRelease=hash(nextManifest);
 await db.doc(`privateWorkspaceReleases/${nextRelease}`).set({manifest:nextManifest});await db.doc('privateWorkspaceSettings/current').update({release:nextRelease});
 const response=await call('/app/',{cookie:gm.cookie});assert.equal(response.status,expected,'Reused payloads must retain path, source and checksum verification');
 if(expected===200)assert.match(await response.text(),/SYNTHETIC_PRIVATE_CANARY_7f19/);else assert.doesNotMatch(await response.text(),/SYNTHETIC_PRIVATE_CANARY_7f19/);
 assert.equal((await call('/app/',{user:player})).status,404,'Payload reuse cannot bypass password or identity checks');
}
await db.doc('privateWorkspaceSettings/current').update({release});
assert.equal((await call('/api/unlock',{user:gm,method:'POST',body:{password},headers:{Origin:'https://unrelated.example.test'}})).status,404,'Cross-origin unlock must be denied');
const reference={version:3,npcEdits:{},creatureArt:{},customItems:[]};
assert.deepEqual(await (await call('/api/state',{cookie:gm.cookie})).json(),{revision:0,state:null});
assert.equal((await call('/api/state',{cookie:gm.cookie,method:'PUT',body:reference,headers:{'X-Workspace-Action':'save'}})).status,404,'Missing revision must not silently overwrite');
const saveHeaders={'X-Workspace-Action':'save','If-Match':'0'};
assert.deepEqual(await (await call('/api/state',{cookie:gm.cookie,method:'PUT',body:reference,headers:saveHeaders})).json(),{revision:1});
assert.equal((await call('/api/state',{cookie:admin.cookie,method:'PUT',body:reference,headers:saveHeaders})).status,409,'Stale edits must not overwrite another GM');
assert.equal((await call('/api/state',{cookie:gm.cookie,method:'PUT',body:{...reference,unexpected:true},headers:{...saveHeaders,'If-Match':'1'}})).status,404);
assert.equal((await call('/api/state',{cookie:gm.cookie,method:'PUT',body:reference,headers:{...saveHeaders,'If-Match':'1',Origin:'https://unrelated.example.test'}})).status,404);
assert.deepEqual(await (await call('/api/state',{cookie:gm.cookie})).json(),{revision:1,state:reference});
assert.equal((await call('/api/unlock',{user:gm,method:'POST',body:{password:'Synthetic-wrong-password',create:false}})).status,404);
const deniedCall=await callable('getPrivateWorkspaceAccess',player);assert.equal((await deniedCall.json()).result.available,false);
assert.equal((await callable('getPrivateWorkspaceAccess',gm)).status,200);
for(const path of ['/app/assets/unknown.png','/app/%2e%2e/secret','/app/index.html?token=bad'])assert.equal((await call(path,{cookie:gm.cookie})).status,404);
const firestoreBase=`http://${process.env.FIRESTORE_EMULATOR_HOST}/v1/projects/${project}/databases/(default)/documents`;
for(const user of [undefined,gm,admin,player]){
 const headers=user?{Authorization:`Bearer ${user.idToken}`}:{ };
 for(const path of [`privateWorkspaceGrants/${gm.uid}`,'privateWorkspaceSettings/current',`privateWorkspaceReleases/${release}`,`privateWorkspaceReleases/${release}/files/${hash('index.html')}/chunks/000`]){
   const read=await fetch(`${firestoreBase}/${path}`,{headers});assert.equal(read.status,403,'Direct Firestore reads must stay denied even for approved accounts');
 }
 const list=await fetch(`${firestoreBase}/privateWorkspaceGrants`,{headers});assert.equal(list.status,403);
}
const customToken=await auth.createCustomToken(gm.uid);
const customResponse=await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:customToken,returnSecureToken:true})});
const custom=await customResponse.json();assert.equal((await call('/api/profile',{user:{idToken:custom.idToken}})).status,404,'Custom/test tokens must be denied');
for(let i=0;i<9;i++)assert.equal((await call('/api/unlock',{user:gm,method:'POST',body:{password:'Synthetic-wrong-password'}})).status,404);
assert.equal((await call('/api/unlock',{user:gm,method:'POST',body:{password}})).status,404,'Correct password cannot bypass an attempt lock');
await db.doc(`privateWorkspaceAttempts/${gm.uid}`).delete();
const network=(await db.collection('privateWorkspaceNetworkAttempts').get()).docs;assert.equal(network.length,1);
await network[0].ref.update({count:60});assert.equal((await call('/api/profile',{user:gm})).status,404,'Network attempt limit must apply before password work');await network[0].ref.update({count:0});
const locked=await call('/api/lock',{cookie:gm.cookie,method:'POST',headers:{'X-Workspace-Action':'lock'}});assert.equal(locked.status,200);assert.match(locked.headers.get('set-cookie'),/Expires=Thu, 01 Jan 1970/);
assert.equal((await call('/app/',{cookie:gm.cookie})).status,404,'Lock must invalidate the old cookie proof');
const again=await call('/api/unlock',{user:gm,method:'POST',body:{password}});assert.equal(again.status,200);gm.cookie=again.headers.get('set-cookie').split(';')[0];
await auth.updateUser(admin.uid,{emailVerified:false});assert.equal((await call('/app/',{cookie:admin.cookie})).status,404);await auth.updateUser(admin.uid,{emailVerified:true});
await auth.updateUser(admin.uid,{disabled:true});assert.equal((await call('/app/',{cookie:admin.cookie})).status,404);
await callable('revokePrivateWorkspaceSessions',gm);assert.equal((await call('/app/',{cookie:gm.cookie})).status,404,'Main-app sign-out revokes private sessions');
console.log('Protected workspace emulator checks passed: two approved roles, password requirement, unrelated game owner/admin denial, direct files/data, custom tokens, disabled accounts and session revocation.');
