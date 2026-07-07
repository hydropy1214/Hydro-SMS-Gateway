---
name: Hydropy WebSocket URL bug history
description: QR code was encoding full wss:// path; gateway app doubled it — both sides now fixed
---

**The bug:** `buildQrData` in `devices.ts` emitted `wss://domain/api/ws` as `serverUrl`.
The gateway app's `toWsUrl` then appended `/api/ws` again → `…/api/ws/api/ws?token=…` which never connected.

**Fix applied:**
1. Server now emits `https://domain` (no path) — gateway appends `/api/ws` itself
2. `toWsUrl` strips `/api/ws` suffix and `wss://` prefix before normalising, handling old stored configs too

**Why:** Device stayed PENDING_CONNECTION forever because the WS upgrade never reached the server.
