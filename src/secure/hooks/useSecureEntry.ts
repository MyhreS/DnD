import { useEffect, useState } from "react";
import { signInWithPopup, signOut, type User } from "firebase/auth";
import { secureAuth, provider } from "../firebase";
import { profile, unlockWorkspace, hasActiveSession } from "../api";
export function useSecureEntry() {
  const [user,setUser]=useState<User|null>(null);
  const [access,setAccess]=useState<{label:string;hasPassword:boolean}|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{let active=true;void hasActiveSession().then(ok=>{if(active&&ok)location.replace('/app/');});return()=>{active=false;};},[]);
  async function signIn(){setBusy(true);setError("");try{const result=await signInWithPopup(secureAuth,provider);const details=await profile(result.user);setUser(result.user);setAccess(details);}catch{setUser(null);setAccess(null);setError("This account cannot open this workspace, or sign-in was cancelled.");await signOut(secureAuth);}finally{setBusy(false);}}
  async function unlock(password:string,confirmation:string){if(!user||!access)return;setError("");if(!access.hasPassword&&(password.length<12||password!==confirmation)){setError("Use at least 12 characters and enter the same password twice.");return;}setBusy(true);try{await unlockWorkspace(user,password,!access.hasPassword);location.replace('/app/');}catch(e){setError(e instanceof Error?e.message:"Could not unlock.");setBusy(false);}}
  async function changeAccount(){await signOut(secureAuth);setUser(null);setAccess(null);setError("");}
  return {user,access,busy,error,signIn,unlock,changeAccount};
}
