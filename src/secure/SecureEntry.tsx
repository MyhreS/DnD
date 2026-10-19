import { useState, type FormEvent } from "react";
import { useSecureEntry } from "./hooks/useSecureEntry";
export function SecureEntry(){
  const gate=useSecureEntry();
  const [password,setPassword]=useState("");const [confirmation,setConfirmation]=useState("");
  function submit(event:FormEvent){event.preventDefault();void gate.unlock(password,confirmation);setPassword("");setConfirmation("");}
  return <main className="gate"><span className="mark" aria-hidden="true">◆</span><p className="eyebrow">Restricted access</p><h1>{gate.access?.label??"Private workspace"}</h1>
    {!gate.access?<><p>Sign in with your approved Google account to continue.</p><button onClick={()=>void gate.signIn()} disabled={gate.busy}>{gate.busy?"Checking…":"Sign in with Google"}</button></>:<><p>{gate.access.hasPassword?"Enter your workspace password.":"Choose a workspace password of at least 12 characters. This is separate from your Google password."}</p><form onSubmit={submit}><label>Password<input autoFocus type="password" autoComplete={gate.access.hasPassword?"current-password":"new-password"} required minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)}/></label>{!gate.access.hasPassword&&<label>Confirm password<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>}<button disabled={gate.busy}>{gate.busy?"Unlocking…":gate.access.hasPassword?"Unlock":"Set password and unlock"}</button></form><button className="quiet" disabled={gate.busy} onClick={()=>void gate.changeAccount()}>Use another account</button></>}
    {gate.error&&<p className="error" role="alert">{gate.error}</p>}<small>Your workspace locks when you sign out. Private content is never available offline.</small>
  </main>;
}
