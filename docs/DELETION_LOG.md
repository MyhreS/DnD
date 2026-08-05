# Code deletion log

## 2026-08-05 — Session-owned DM controls

Removed the separate DM board, per-device DM mode, role switcher, and client-side allowlist manager. Their useful table workflow now lives directly inside each Game session: any user may create a session, and the session creator can search for Hunters, inspect their sheets, and manage the table.

The underlying authentication and Firestore permission model remains in place. Only obsolete navigation, settings, board persistence, and unused client management surfaces were removed.

Also removed the old shared search component and role-display helpers that no
longer had callers after those surfaces were retired.
