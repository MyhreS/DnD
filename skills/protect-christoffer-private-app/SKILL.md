---
name: protect-christoffer-private-app
description: Protect Christoffer's separate private D&D app, page, route, hostname, resources, assets, APIs, and data so only his verified Google identity can use them. Use for any design, implementation, review, migration, deployment, debugging, logging, testing, incident response, or documentation work that could expose or connect Christoffer's app to this repository, Firebase project, main D&D app, or public internet.
---

# Protect Christoffer's Private App

## Apply the security contract

Treat privacy as a release-blocking correctness requirement, not a visual
feature. Deny access until every relevant layer positively proves the caller is
Christoffer.

Use this intended identity:

- Verified Google email: `myhrefjell@gmail.com`
- Firebase Auth UID: obtain from the verified sign-in record before enabling
  access; never guess, derive, or commit a placeholder UID
- Provider: Google

Treat `myhrefjeld@gmail.com` as a different account. It appears in existing
Workshop configuration and must not gain private-app access through that role.
Do not authorize by name, email prefix, domain, campaign, invitation, Workshop
membership, DM role, global administrator role, or ownership of the D&D app.

## Establish the achievable privacy boundary

Separate these two requirements before implementation:

1. **Product-level isolation:** block Simon and all other people when they use
   the deployed app normally. Implement this with owner-only authorization at
   every data and service boundary.
2. **Infrastructure-owner isolation:** prevent Simon from accessing the source,
   data, logs, backups, or deployment while acting as GitHub/Firebase/Google
   Cloud owner or administrator. This cannot be guaranteed inside infrastructure
   Simon controls. Admin SDK credentials bypass Firestore rules, project admins
   can change policies, and a deployment owner can alter browser code.

If Christoffer requires infrastructure-owner isolation, stop. Require a private
repository, cloud project, billing/access controls, secrets, logs, backups, and
deployment pipeline controlled by Christoffer. Do not upload his private app or
unencrypted content to this repository or the `dandd-ea955` project and do not
claim the requirement is met.

If the accepted requirement is product-level isolation, state that Simon is
blocked as an ordinary app user but retains unavoidable administrative control
of Simon-owned infrastructure.

## Prevent public-source and static-hosting leaks

Assume every tracked file in this repository is public. The repository
`MyhreS/DnD` is public, and hiding a route does not hide committed content.

Before accepting Christoffer's existing app or resources:

1. Ask Christoffer for an explicit public/private classification or a minimal
   manifest that does not itself reveal private content. Do not inspect, print,
   summarize, screenshot, upload, or copy real private resources into agent
   context, terminal output, tests, tickets, chat, or temporary public storage
   merely to classify them.
2. Commit only material Christoffer explicitly permits anyone on the internet
   to download.
3. Keep private material in an owner-only service or Christoffer-controlled
   system. Never place it in source code, `public/`, Vite imports, generated
   bundles, source maps, build logs, test fixtures, screenshots, or artifacts.
4. Treat Firebase Hosting files as publicly downloadable. A client-side login
   gate can protect later API requests but cannot make shipped HTML, JavaScript,
   CSS, images, PDFs, or other static assets private.
5. Serve sensitive resources only after server-side authentication and
   authorization, with `Cache-Control: private, no-store`. Avoid long-lived
   signed URLs because anyone holding one can use it.

Use a separate hostname and deployment target to reduce accidental coupling,
navigation leaks, service-worker overlap, and cache contamination. Do not treat
the hostname or an unlinked URL as a secret or as proof of authorization.
Treat the hostname, route names, page titles, labels, component structure,
filenames, and resource metadata as private unless Christoffer explicitly
approves each item as public. Keep any public sign-in shell generic.

## Build an owner-only authorization boundary

Prefer a dedicated origin and a thin public sign-in shell. Fetch all private
content from a server-side boundary only after Firebase verifies the Google ID
token. Bind authorization to the recorded Firebase UID and also verify:

- the token exists, has a valid signature and audience, is unexpired, and has
  not been revoked;
- the Firebase Auth user is not disabled;
- `email_verified` is `true`;
- the token email, after `trim().toLowerCase()`, exactly equals the protected
  configured value `myhrefjell@gmail.com`;
- the sign-in provider is Google; and
- the UID equals the separately verified, immutable owner UID.

Do not collapse dots, remove `+suffix` text, or otherwise treat Gmail aliases as
equivalent. Any value other than the exact configured address must be denied.

Deny access if any field is missing or differs. Locking out on uncertainty is
safer than widening access. Keep the UID/configuration in an appropriate
server-side secret or protected policy. If Firestore or Storage rules use a
custom claim, issue that claim only from trusted server-side provisioning after
verifying the exact UID, email, verified-email state, and Google provider. Never
accept an identity or access flag supplied in request data by the browser.

Apply the same predicate independently at every boundary:

- HTML/resource delivery when the delivered resource itself is private;
- Cloud Functions, Cloud Run, callable functions, and every API handler;
- Firestore documents and collection queries;
- Cloud Storage objects and metadata;
- background jobs, exports, search/indexing, notifications, and webhooks;
- support, debugging, migration, backup, restore, and administrative tooling.

Remember that Functions using the Firebase Admin SDK bypass Firestore and
Storage rules. Check the verified caller inside every function before reading or
writing private data. Never rely on the browser to pass a trusted email or UID.

## Isolate the app from existing D&D roles and data

Create a dedicated private data namespace and dedicated API modules. Do not
store private data in collections whose current rules allow broad reads,
including `/characters` and `/campaigns`.

Do not reuse or extend any of these as authorization for the private app:

- `isSuperAdmin()` or Simon's bootstrap access;
- `isWorkshopAccount()` or `isWorkshopMember()`;
- campaign DM, member, invite, or participant status;
- the legacy allowlist;
- preview roles, test-token roles, developer mode, or local-storage flags.

Do not add a universal admin/support override. Do not make the private owner UID
enumerable through a generally readable document. Prevent list/query access,
not only single-document reads.

Keep the main D&D app unaware of private content. For non-Christoffer users:

- show no navigation item, title, preview, count, recent activity, notification,
  search result, error detail, or resource filename from the private app;
- return a generic not-found or access-denied response without confirming what
  exists;
- never include private payloads in shared Zustand stores, React props, page
  source, preloaded JSON, API responses, or browser storage;
- never copy private data into shared game, activity, user, Workshop, or audit
  collections.

## Control caches, telemetry, and secondary copies

Use a distinct service-worker scope or no service worker for the private origin.
Do not precache private routes or responses. Clear owner-session caches on
sign-out and prevent a later browser user from seeing prior content through the
back button, IndexedDB, Cache Storage, local storage, or offline mode.

Keep secrets and private payloads out of URLs, query strings, document IDs,
filenames, console output, analytics, performance traces, error reports, CI
logs, deployment summaries, tickets, chat, screenshots, and test recordings.
Disable telemetry on the private app unless its collection and access model have
been reviewed. Redact payloads before recording unavoidable operational events.

Set `noindex` and an `X-Robots-Tag` where possible to reduce discovery, while
remembering that crawler directives are not access control.

Inventory every secondary copy: backups, exports, mirrors, CDN caches, email,
notifications, generated PDFs, thumbnails, search indexes, and local developer
fixtures. Give each copy the same or stronger access boundary, or do not create
it.

## Harden the web boundary

Use HTTPS only. Add restrictive security headers appropriate to the private
origin, including a Content Security Policy with narrowly enumerated sources,
`frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, a restrictive
`Referrer-Policy`, and a minimal `Permissions-Policy`.

Allow cross-origin API requests only from the exact private origin; never use a
wildcard CORS origin with credentials. Treat CORS as browser hardening, not
authorization. Authenticate and authorize every request even when its origin is
allowed.

If using cookies, set `Secure`, `HttpOnly`, and an appropriate `SameSite` value,
and add CSRF protection to state-changing requests. If using bearer tokens, keep
them in the authorization header rather than URLs or logs. Apply per-identity
and per-network rate limits without logging private payloads.

Validate every input with a strict schema, size limits, and allowlisted file
types. Escape untrusted text and sanitize any intentionally rendered markup to
prevent stored content from becoming an XSS path to Christoffer's session. Keep
error responses generic and do not reflect private input.

## Verify identity provisioning safely

Before first release:

1. Have Christoffer sign in through the intended Google flow.
2. Verify the Firebase Auth record shows exactly `myhrefjell@gmail.com`, a
   verified email, Google as the provider, and an enabled account.
3. Record the observed UID through the protected deployment/configuration path.
4. Re-read the configured identity independently.
5. Keep the private app disabled if the observed address differs, including if
   it is `myhrefjeld@gmail.com`.

Never post tokens, session cookies, resource contents, or private configuration
into a public issue or committed file. Treat the UID as a personal identifier,
not a secret; keep it out of public files unless the reviewed authorization
design requires it and Christoffer has accepted that it will be public.

## Run the mandatory denial matrix

Use synthetic canary content that cannot be confused with Christoffer's real
resources. Exercise the deployed architecture, not just React route visibility.

Verify all of the following:

| Actor/path | Required result |
| --- | --- |
| Christoffer's verified Google account and recorded UID | May access only the intended private app and data |
| Simon's normal/super-admin Google account | No discovery, page, API, Firestore, Storage, or cached access |
| `myhrefjeld@gmail.com` Workshop identity | No access |
| Another verified D&D user | No access |
| Signed-out browser | No access |
| Preview and minted test-token identities | No access |
| Correct email with wrong UID/provider or unverified email | No access |
| Guessed URL, deep link, asset URL, API endpoint, document ID, and query | No content or existence leak |
| Browser used by Christoffer, then signed out and reopened/offline | No residual private content |

Test both allowed and denied Firestore queries against the Emulator Suite, and
test Storage and every Function/API separately. Include direct network requests
that bypass the UI. Confirm production headers and public build artifacts do not
contain the canary. Confirm the main app's bundles, PWA precache manifest,
screenshots, logs, analytics, and error reporting contain no private payload or
private resource names.

Make these negative tests automated and release-blocking. A successful
Christoffer login alone is not sufficient evidence.

## Review and release

Before merging or deploying:

1. Review the diff for private files, copied assets, hard-coded content, public
   paths, role reuse, broad rules, Admin SDK bypasses, logs, and caches.
2. Run repository checks plus the complete denial matrix.
3. Inspect the built artifacts directly for private canary strings and resource
   names.
4. Deploy through a dedicated target without changing the main app's access
   model.
5. Repeat the denial matrix against production using synthetic data.
6. Report product-level isolation separately from infrastructure ownership. Do
   not say "only Christoffer can ever access it" while Simon owns the hosting,
   repository, project, credentials, logs, or backups.

Do not release on partial evidence, client-only gating, or an untested rule.

## Respond to a suspected leak

Stop publication and further copying. Preserve minimal evidence without placing
private content in chat, tickets, logs, or screenshots. Identify every exposure
surface and secondary copy, revoke public URLs/tokens, invalidate caches and
sessions where supported, close the rule/API gap, and rerun the full denial
matrix. Tell Simon that a security incident requires Christoffer's involvement;
do not silently inspect Christoffer's private content to assess impact.
