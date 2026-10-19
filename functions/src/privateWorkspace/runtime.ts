// This generic runtime contains no application content and is served only after authorization.
export const runtime = `(()=>{
  let locked=false; const bus=new BroadcastChannel('protected-workspace-session');
  const clear=()=>{localStorage.clear();sessionStorage.clear();};
  const hide=()=>{document.documentElement.style.visibility='hidden';};
  const presentation=location.pathname.startsWith('/app/view/');
  const leave=()=>{if(locked)return;locked=true;hide();clear();localStorage.setItem('workspace-lock-pending','1');document.title='Private workspace';document.body?.replaceChildren();location.replace('/');};
  const check=async()=>{if(locked)return;if(localStorage.getItem('workspace-lock-pending')){leave();return;}try{const r=await fetch('/api/session',{cache:'no-store'});if(!r.ok)leave();else if(!locked&&(presentation||document.hasFocus())&&!document.hidden)document.documentElement.style.visibility='visible';}catch{leave();}};
  hide();
  bus.onmessage=e=>{if(e.data==='lock')leave();};
  addEventListener('offline',leave);
  addEventListener('pagehide',hide);
  addEventListener('pageshow',()=>{hide();void check();});
  addEventListener('focus',()=>void check());
  if(!presentation){addEventListener('blur',hide);document.addEventListener('visibilitychange',()=>{if(document.hidden)hide();else void check();});}
  setInterval(()=>void check(),30000);
  const lock=async()=>{hide();bus.postMessage('lock');try{await fetch('/api/lock',{method:'POST',headers:{'X-Workspace-Action':'lock'}});}finally{leave();}};
  const state={read:async()=>{const r=await fetch('/api/state',{cache:'no-store'});if(!r.ok){leave();throw Error('Locked');}return r.json();},write:async(data,revision)=>{const r=await fetch('/api/state',{method:'PUT',headers:{'Content-Type':'application/json','X-Workspace-Action':'save','If-Match':String(revision)},body:JSON.stringify(data)});if(r.status===401||r.status===403){leave();throw Error('Locked');}if(!r.ok)throw Error(r.status===409?'Another GM changed this reference. Reload before saving again.':'Could not save.');return r.json();}};
  window.protectedWorkspace={state,lock};
  addEventListener('DOMContentLoaded',()=>{const button=document.createElement('button');button.textContent='Lock workspace';button.style.cssText='position:fixed;bottom:12px;left:12px;z-index:100;background:#111b17;color:#ddd;border:1px solid #667058;border-radius:5px;padding:8px 12px;font:11px sans-serif';button.onclick=lock;document.body.append(button);});
})();`;
