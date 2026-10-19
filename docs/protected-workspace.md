# Protected shared workspace

This generic host supports an explicitly approved shared GM/admin workspace. It does not relax the separate owner-only privacy contract for any other creator material. A campaign role, an unrelated game's DM, the legacy allowlist, Workshop membership, a role preview and a custom/test token do not grant access.

The public repository contains only the generic entry, delivery code and synthetic tests. Application source, catalogs, rules, artwork, resource names, grants, identities and release manifests stay outside this repository and outside all public app builds.

## Delivery and access

`privateWorkspace` has its own Cloud Functions v2/Cloud Run origin. Its public resources are a generic Google sign-in/password screen. It has no service worker, analytics or content cache. The main app asks `getPrivateWorkspaceAccess` for an entry label/URL; only an approved identity receives either.

Authorization independently checks a revoked-token-aware Firebase session, enabled and verified Google account, exact UID/email binding, a dedicated enabled GM/admin grant and a password proof. Grants are private server-managed records, not values from the browser. Session proofs expire after eight hours and are invalidated by grant/password revisions. Main-app sign-out revokes private sessions for provisioned accounts. The workspace has a lock control that clears its session, private windows and browser state. Never put passwords in URLs, source, logs or GitHub configuration.

Passwords are individual, with a minimum length of twelve characters. Store only salted scrypt output (N=131072, r=8, p=1). Setup requires a recent verified Google authentication; ten failed attempts lock that identity's password attempts for fifteen minutes. Entry attempts also have a network limit, keyed by a private configuration salt so raw addresses are not stored. Server concurrency and instance counts are bounded. Password recovery is a separate explicitly authorized operation, not an administrator bypass in the web app.

Private releases live in dedicated Firestore namespaces, with binary resources split into chunks below the document limit. Existing default-deny rules prohibit direct client access. Only the authenticated delivery function uses the Admin SDK to retrieve them. Release manifests and every resource are checked against SHA-256 before delivery. Names exposed in resource requests should be opaque content identifiers, not campaign names or original filenames.

Never copy a private application into `src`, `public`, static Hosting output, source maps, PWA caches or CI artifacts. Use a trusted local importer after the production access boundary passes synthetic canary checks. The public entry build goes into ignored `functions/secure-entry`, included with the backend deployment; it contains no private application code.

## Provisioning and release

Verify the approved accounts through actual Firebase Auth records. Bind dedicated grants to the observed UID and exact verified Google email. Store grants and private configuration only through the protected administrative channel, including a random 32-byte hexadecimal `networkSalt`. Provision the `protectedWorkspace` custom claim for sign-out coordination; the claim alone never authorizes delivery. Re-read records after writing. Back up existing affected data first. No player characters need modification.

Build the generic entry with `build:secure:ci` and Functions with the existing backend build. The normal protected GitHub Actions deployment publishes both. Use the function's dedicated service URI as its configured origin and add that hostname to Firebase Auth's authorized domains. Configure the active release only after uploading it privately and validating every object. Do not treat the main Hosting deployment as evidence that the protected server works.

Run the ordinary repository gate plus `test:private-workspace` and `test:private-workspace:emulator`. Emulator tests require a `demo-` project and explicitly refuse to run against live data. Exercise both approved roles, wrong/unverified/disabled identities, anonymous and custom/test tokens, unrelated DM/admin records, password failures, session revocation, direct files, direct Firestore reads/queries, no-store headers and traversal. Test the actual deployed origin using synthetic content before importing real resources. Check both mobile and desktop entry screens.

Infrastructure administrators retain their normal cloud/project control. This protects content from ordinary app users; it is not a claim that the infrastructure owner is unable to change the system.
