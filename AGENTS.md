# D&D repository instructions

Read and follow [`CLAUDE.md`](CLAUDE.md) for the repository architecture,
workflow, testing, and release rules.

## Critical privacy boundary: Christoffer's separate app

Treat every task that adds, changes, moves, deploys, reviews, tests, logs, or
references Christoffer's separate app, page, route, hostname, resources, assets,
API, or data as security-sensitive. Before doing that work, read and follow
[`skills/protect-christoffer-private-app/SKILL.md`](skills/protect-christoffer-private-app/SKILL.md)
in full.

The intended end-user account is exactly the verified Google account
`myhrefjell@gmail.com`. This is not the same address as
`myhrefjeld@gmail.com`, which already appears in Workshop configuration. Never
copy or inherit Workshop membership, campaign membership, DM status,
super-admin status, or any other existing role for this private app.

The non-negotiable product rule is deny by default:

- Only Christoffer's verified Google identity may discover, open, read, query,
  download, or change the private app and its data.
- Simon's normal account, super-admin account, D&D administrators, DMs,
  Workshop owners, campaign members, other authenticated users, anonymous
  users, preview users, and test-token users must have no access.
- A separate URL and a hidden navigation item are not access control. Enforce
  authorization on every server, Firestore, Storage, and API boundary.
- Do not put private resources in this public GitHub repository, a public web
  bundle, `public/`, source maps, PWA precaches, logs, analytics, error reports,
  notifications, search indexes, shared collections, or public download URLs.
- Do not open, print, summarize, screenshot, upload, or copy Christoffer's real
  private resources into agent context, terminal output, tests, tickets, or chat
  before an approved private handling boundary exists. Use synthetic fixtures.
- Do not reuse existing broadly readable Firestore locations such as
  `/characters` or `/campaigns`. Use a dedicated private namespace with explicit
  owner-only rules and matching API checks.
- Never add an admin, owner, support, debugging, preview, or emergency bypass.
  If recovery access is required, Christoffer must explicitly authorize a
  narrowly scoped design before it is implemented.
- Test denial with Simon's identity and at least one unrelated authenticated
  identity, signed-out access, direct/deep links, raw API calls, Firestore and
  Storage requests, cached/offline state, and guessed URLs. Test only with
  synthetic canary content, never Christoffer's real private data.
- Stop the release if any private content appears in the main app, a public
  artifact, logs, caches, or a non-Christoffer response. Treat a suspected leak
  as a security incident and preserve evidence without copying the leaked data
  into tickets or chat.

This repository and its Firebase/GitHub infrastructure are owned by Simon.
Application rules can block Simon's ordinary app login, but they cannot prevent
a repository, Firebase, Google Cloud, billing, backup, logging, or deployment
administrator from changing the system or using privileged infrastructure to
access code or data. Never claim otherwise. If "not Simon" includes protection
from Simon acting as infrastructure owner or administrator, do not place the
private app or its unencrypted data in this repository/project. Require a
Christoffer-owned private repository and cloud project before implementation.
