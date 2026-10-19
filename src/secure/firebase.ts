import { initializeApp } from "firebase/app";
import { initializeAuth, inMemoryPersistence, browserPopupRedirectResolver, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}, "secure-entry");
export const secureAuth = initializeAuth(app, { persistence: inMemoryPersistence, popupRedirectResolver: browserPopupRedirectResolver });
export const provider = new GoogleAuthProvider();
provider.setCustomParameters({prompt:"select_account"});

if(import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === "1") connectAuthEmulator(secureAuth,"http://127.0.0.1:9099",{disableWarnings:true});
