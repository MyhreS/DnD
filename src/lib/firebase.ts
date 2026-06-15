import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  initializeAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Fail loudly during development if env vars are missing, rather than getting a
// cryptic Firebase error later.
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error(
    "Missing Firebase config. These come from Doppler (project `dnd`). Run via " +
      "`doppler run -- bun run dev` / `bun run dev` (already wrapped), or `doppler setup` first.",
  );
}

export const app = initializeApp(firebaseConfig);
// Persist the session locally so installed (home-screen) launches stay signed
// in and never re-prompt. IndexedDB first, with a localStorage fallback.
export const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});
export const db = getFirestore(app);
// Functions are deployed in europe-west1 (see functions/src/index.ts).
export const functions = getFunctions(app, "europe-west1");

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Analytics is optional and only works in supported (browser, https) contexts.
analyticsSupported()
  .then((ok) => {
    if (ok && firebaseConfig.measurementId) getAnalytics(app);
  })
  .catch(() => {
    /* analytics is best-effort; ignore failures */
  });
