import { spawnSync } from "node:child_process";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result;
}

// Firebase web configuration is public application metadata. Reading it from
// the active Firebase project keeps local deploys reproducible when Doppler is
// not configured, without writing credentials or a generated .env file.
const apps = JSON.parse(run("firebase", ["apps:list", "--json"]).stdout).result;
const webApp = apps.find((app) => app.platform === "WEB");
if (!webApp) throw new Error("The active Firebase project has no web app.");
const firebase = JSON.parse(
  run("firebase", ["apps:sdkconfig", "WEB", webApp.appId, "--json"]).stdout,
).result.sdkConfig;

const build = spawnSync("bun", ["run", "build:ci"], {
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_FIREBASE_API_KEY: firebase.apiKey,
    VITE_FIREBASE_AUTH_DOMAIN: firebase.authDomain,
    VITE_FIREBASE_PROJECT_ID: firebase.projectId,
    VITE_FIREBASE_STORAGE_BUCKET: firebase.storageBucket,
    VITE_FIREBASE_MESSAGING_SENDER_ID: firebase.messagingSenderId,
    VITE_FIREBASE_APP_ID: firebase.appId,
    VITE_FIREBASE_MEASUREMENT_ID: firebase.measurementId,
  },
});
process.exit(build.status ?? 1);
