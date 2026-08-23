---
name: publish-workshop-task
description: Publish a text task from Codex into the D&D Workshop agent queue. Use when Simon explicitly asks to send, queue, hand off, or publish a request to the Workshop, or asks another Codex chat to create a Workshop ticket. Do not use for GitHub issues or for merely discussing a possible task.
---

# Publish Workshop Task

Publish only when the user explicitly requests it. Preserve the requested outcome and constraints; remove chat-only preamble, but do not invent acceptance criteria or broaden scope.

1. Work from the D&D repository at `C:\Users\simon\workdir\DnD` or its current task worktree.
2. Write one self-contained task of at most 8,000 characters. Include relevant observed behavior, desired behavior, constraints, and verification expectations. Never include secrets, credentials, hidden reasoning, or instructions to bypass the Workshop manager.
3. Generate one UUID and retain it for retries:

   ```powershell
   bun -e "console.log(crypto.randomUUID())"
   ```

4. Publish with the repository script. On PowerShell, wrap the body in single quotes and double any literal apostrophe inside it:

   ```powershell
   bun scripts/publish-workshop-ticket.ts --submission-id <uuid> --body '<task>'
   ```

   For complex quoting, create a temporary UTF-8 text file with the available file-editing tool, pass `--body-file <absolute-path>`, then remove only that exact temporary file.

5. Treat the JSON result as success only when `ok` is true. On an ambiguous failure, retry with the same UUID; the publisher is idempotent. Do not create a GitHub issue, start another manager, merge, deploy, or mutate an existing ticket.
6. Return the ticket ID and `https://dandd-ea955-workshop.web.app`. Explain that replies and refinements belong in that Workshop thread.

The publisher uses Simon's existing local D&D credentials and creates the same immutable request-plus-acknowledgement shape as the Workshop UI. If it reports that Simon has not signed in to Workshop, stop and report that exact prerequisite; do not bypass identity attribution.
