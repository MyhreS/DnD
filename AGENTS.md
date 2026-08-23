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
`myhrefjeld@gmail.com`, which is already used for Christoffer's Google login.
`myhrefjell@gmail.com` was a previously supplied typo and must not be authorized.
Although the correct account also appears in Workshop configuration, never copy
or inherit Workshop membership, campaign membership, DM status, super-admin
status, or any other existing role as authorization for this private app.

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

## GitHub Actions deployment

The `Deploy` workflow automatically deploys the main D&D app to Firebase after
a merge to `main` and also supports a one-click manual production run. Any
GitHub repository collaborator with write access may open **Actions → Deploy →
Run workflow**, select `main`, and run it. Manual production runs from any other
branch must fail closed.

The workflow uses protected repository secrets; never print, copy, expose, or
replace them to let a collaborator deploy. Automatic and manual production
deployments share one non-cancelling concurrency group so they cannot overwrite
one another in parallel.

The current workflow deploys the existing main-app Hosting target, Firestore and
Storage rules, and Cloud Functions. When Christoffer's separate app receives its
own protected deployment target, add that target to GitHub Actions in the same
implementation change and verify it with a manual run from `main`. Do not claim
the private app is deployable merely because the existing main-app job passes.
