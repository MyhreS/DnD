import { spawnSync } from "node:child_process";

const [command, ...args] = process.argv.slice(2);
if (!command) throw new Error("Pass a command to run with Firebase web configuration.");

function capture(tool, toolArgs) {
  const result = spawnSync(tool, toolArgs, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `${tool} failed`);
  return result.stdout;
}

const account = "simonmyhre1@gmail.com";
const project = "dandd-ea955";
const common = ["--account", account, "--project", project];
const apps = JSON.parse(capture("firebase", [...common, "apps:list", "--json"])).result;
const webApp = apps.find((app) => app.platform === "WEB");
if (!webApp) throw new Error("The D&D Firebase project has no web app.");
const firebase = JSON.parse(capture("firebase", [...common, "apps:sdkconfig", "WEB", webApp.appId, "--json"])).result.sdkConfig;

const child = spawnSync(command, args, {
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
process.exit(child.status ?? 1);
