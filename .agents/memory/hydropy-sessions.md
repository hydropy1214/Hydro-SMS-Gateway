---
name: Hydropy DB-backed sessions
description: Sessions switched from in-memory Map to PostgreSQL sessions table — survives server restarts
---

Sessions are stored in `sessionsTable` (lib/db/src/schema/sessions.ts).
- `createSession` / `destroySession` / `resolveSession` are all async DB calls
- `requireAuth` in `auth.ts` awaits `resolveSession(token)` — callers must await
- `purgeExpiredSessions` runs at startup + every 6h via setInterval in index.ts
- Session TTL = 7 days

**Why:** In-memory Map lost all sessions on every server restart, causing mass 401 errors.

**How to apply:** Any new route that creates/destroys sessions must await these functions. Do not revert to synchronous Map storage.
