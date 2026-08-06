import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from "firebase/auth";
import { connectFirestoreEmulator, initializeFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const config: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  throw new Error("Missing Firebase configuration for the Workshop.");
}

const app = initializeApp(config, "dnd-workshop");
export const workshopAuth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
  popupRedirectResolver: browserPopupRedirectResolver,
});
export const workshopDb = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  ignoreUndefinedProperties: true,
});
export const workshopFunctions = getFunctions(app, "europe-west1");
export const workshopStorage = getStorage(app);
export const workshopGoogleProvider = new GoogleAuthProvider();
workshopGoogleProvider.setCustomParameters({ prompt: "select_account" });

if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATORS === "1") {
  connectAuthEmulator(workshopAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(workshopDb, "127.0.0.1", 8080);
  connectFunctionsEmulator(workshopFunctions, "127.0.0.1", 5001);
  connectStorageEmulator(workshopStorage, "127.0.0.1", 9199);
}
