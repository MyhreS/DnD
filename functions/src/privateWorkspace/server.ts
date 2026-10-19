import { onRequest } from "firebase-functions/v2/https";
import { bearer, db, forget, session, settings } from "./auth";
import { unlock } from "./password";
import { resource } from "./files";
import { runtime } from "./runtime";
import { validReference } from "./state";
import { publicEntry, gatePolicy } from "./entry";
import { SESSION_MS } from "./policy";
import { networkAttempt } from "./limits";
const cookieOptions = { httpOnly: true, secure: true, sameSite: "strict" as const, path: "/", maxAge: SESSION_MS };
export const privateWorkspace = onRequest({ region: "europe-west1", memory: "512MiB", maxInstances: 5, concurrency: 2, cors: false }, async (req, res) => {
  res.set({ "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow, noarchive", "Cross-Origin-Opener-Policy": "same-origin", "Permissions-Policy": "camera=(), microphone=(), geolocation=()", "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'self'" });
  try {
    if (["GET","HEAD"].includes(req.method)) {
      const entry=await publicEntry(req.path);
      if(entry){res.set({"Content-Security-Policy":gatePolicy,"Cross-Origin-Opener-Policy":"same-origin-allow-popups"}).type(entry.type).send(req.method === "HEAD"?"":entry.body);return;}
    }
    const config = await settings();
    if (req.hostname !== new URL(config.origin).hostname && process.env.FUNCTIONS_EMULATOR !== "true") throw new Error("Unavailable");
    if (Object.keys(req.query).length) throw new Error("Unavailable");
    if (!["GET", "HEAD"].includes(req.method) && req.get("Origin") !== config.origin) throw new Error("Unavailable");
    if (["/api/profile", "/api/unlock"].includes(req.path)) {
      // The emulator forwards requests over IPC without a network peer. Production never uses this fixture key.
      const isolatedDemo = process.env.FUNCTIONS_EMULATOR === "true" && process.env.GCLOUD_PROJECT?.startsWith("demo-");
      await networkAttempt(config, isolatedDemo ? "emulator-loopback" : req.ip || req.socket.remoteAddress);
    }
    if (req.path === "/api/profile" && req.method === "GET") {
      const { token } = await bearer(req.get("Authorization"));
      const password = await db().doc(`privateWorkspacePasswords/${token.uid}`).get();
      res.json({ label: config.label, hasPassword: password.exists }); return;
    }
    if (req.path === "/api/unlock" && req.method === "POST") {
      if (!req.is("application/json") || req.rawBody.length > 4096) throw new Error("Unavailable");
      const header = req.get("Authorization");
      const { token, grant } = await bearer(header);
      const cookie = await unlock(header!.slice(7), token, grant, req.body?.password, req.body?.create === true);
      res.cookie("__session", cookie, cookieOptions).json({ ok: true }); return;
    }
    if (req.path === "/api/lock" && req.method === "POST" && req.get("X-Workspace-Action") === "lock") {
      await forget(req.get("Cookie"));
      res.clearCookie("__session", { httpOnly: true, secure: true, sameSite: "strict", path: "/" }).json({ ok: true }); return;
    }
    await session(req.get("Cookie"));
    if (req.path === "/api/session" && req.method === "GET") { res.json({ ok: true }); return; }
    if (req.path === "/api/state" && req.method === "GET") {
      const data = (await db().doc("privateWorkspaceData/reference").get()).data();
      res.json({ revision: data?.revision ?? 0, state: data?.state ?? null }); return;
    }
    if (req.path === "/api/state" && req.method === "PUT" && req.get("X-Workspace-Action") === "save") {
      const state: unknown = req.body;
      if (!req.is("application/json") || JSON.stringify(state).length > 256 * 1024 || !validReference(state)) throw new Error("Unavailable");
      const match = req.get("If-Match");
      if (!match || !/^\d+$/.test(match)) throw new Error("Unavailable");
      const expected = Number(match);
      if (!Number.isInteger(expected) || expected < 0) throw new Error("Unavailable");
      let revision = expected;
      await db().runTransaction(async transaction => {
        const ref = db().doc("privateWorkspaceData/reference");
        const previous = (await transaction.get(ref)).data();
        if ((previous?.revision ?? 0) !== expected) { res.status(409); throw new Error("Conflict"); }
        revision = expected + 1;
        transaction.set(ref, { state, revision });
      });
      res.json({ revision }); return;
    }
    if (!["GET", "HEAD"].includes(req.method)) throw new Error("Unavailable");
    if (req.path === "/runtime.js") { res.type("application/javascript").send(req.method === "HEAD" ? "" : runtime); return; }
    const file = await resource(config, req.path);
    res.type(file.type).send(req.method === "HEAD" ? "" : file.body);
  } catch {
    const code = res.statusCode === 409 ? 409 : 404;
    res.status(code).type("text/plain").send(code === 409 ? "Reload before saving." : "Not available.");
  }
});
