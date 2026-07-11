// Bundle the DM's reference content with the Cloud Functions package so the AI
// HTTP API can serve it at runtime (read from disk, NOT from Firestore).
//
// Runs as the first step of `npm --prefix functions run build` (which the
// firebase functions predeploy also invokes), so the copy is always fresh in
// both the emulator and a real deploy. The destination is git-ignored — it is a
// generated build artifact, and the source of truth stays in resources/.
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "..", "resources", "master.json");
const dest = path.join(__dirname, "..", "master.json");

if (!fs.existsSync(src)) {
  console.error(`copy-master: source not found at ${src}`);
  process.exit(1);
}

fs.copyFileSync(src, dest);
const kb = (fs.statSync(dest).size / 1024).toFixed(0);
console.log(`copy-master: bundled master.json (${kb} KB) -> ${dest}`);
