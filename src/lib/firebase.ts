import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  initializeAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
} from "firebase/auth";
import { connectFirestoreEmulator, initializeFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
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
// Auto-detect long-polling. The default WebChannel streaming transport can hang
// ~10–15s on the first load on networks (mobile/iOS, proxies) that block it
// before falling back — the classic "Firestore is slow on first open" problem.
// Auto-detect probes once and picks the working transport immediately.
// ignoreUndefinedProperties: partial HunterCard writes legitimately carry
// `undefined` for "leave unset" optional fields (notes, optional rows, …) — treat
// them as omitted instead of throwing.
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
});
export const functions = getFunctions(app, "europe-west1");
if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === "1") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
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
