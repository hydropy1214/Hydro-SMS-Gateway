# HYDROPY SMS Gateway Platform

A distributed SMS gateway management platform where Android phones act as SMS gateway devices controlled by a web dashboard.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Setup & Running](#setup--running)
4. [Default Credentials](#default-credentials)
5. [How to Use the Dashboard](#how-to-use-the-dashboard)
6. [Connecting an Android Gateway](#connecting-an-android-gateway)
7. [How SMS Dispatch Works](#how-sms-dispatch-works)
8. [API Reference](#api-reference)
9. [WebSocket Protocol](#websocket-protocol)
10. [Stack](#stack)
11. [Development](#development)
12. [Gotchas](#gotchas)

---

## Overview

HYDROPY lets you run bulk SMS campaigns using real Android phones as gateway nodes. Each phone connects to the platform via WebSocket, receives SMS jobs from the scheduler, sends them via the phone's native SIM, and reports delivery results back in real time.

**Key capabilities:**
- Register unlimited Android gateway devices via QR code pairing
- Create SMS campaigns with contact import (CSV) and `{name}` variable substitution
- Real-time live dashboard with WebSocket-driven updates (device heartbeats, send events, campaign progress)
- Full message log with filtering and bulk-clear
- Per-campaign reports with CSV export
- Role-based access (Admin / Operator)

---

## Architecture

```
Browser (HYDROPY Dashboard)
        │ HTTPS / WebSocket
        ▼
   API Server (/api)          Express 5 + ws
        │
   ─────────────
   │            │
PostgreSQL   WebSocket Hub (/api/ws)
(Drizzle)        │              │
             Dashboard      Device clients
             clients        (Android apps)
                                │
                          SIM → SMS
                          Mobile Network
```

**Data flow for a campaign:**
1. Operator creates campaign, imports contacts (CSV), and clicks Start
2. API creates QUEUED message rows for every contact
3. Scheduler (10-second polling) picks up QUEUED messages and sends `sms.new` events to connected devices
4. Each Android device sends the SMS via its SIM and reports back `sms.result` (SENT or FAILED)
5. Server updates message status, increments campaign counters, and broadcasts to dashboard clients
6. When `sent + failed >= totalMessages` the campaign is automatically marked COMPLETED

---

## Setup & Running

### Prerequisites

- Node.js 20+
- pnpm 10+
- PostgreSQL (Replit's built-in database is pre-configured)

### 1 — Install dependencies

```bash
pnpm install
```

### 2 — Push database schema

```bash
pnpm --filter @workspace/db run push
```

### 3 — Seed default users

```bash
pnpm --filter @workspace/scripts run seed
```

### 4 — Start both services (Replit)

In Replit the workflows are managed automatically. To run manually:

```bash
# API server (port from $PORT env, mounted at /api)
pnpm --filter @workspace/api-server run dev

# Dashboard (port from $PORT env, mounted at /)
pnpm --filter @workspace/hydropy-dashboard run dev
```

### Environment variables

| Variable       | Required | Description                                     |
|----------------|----------|-------------------------------------------------|
| `DATABASE_URL` | ✅        | PostgreSQL connection string (auto-set by Replit)|
| `PORT`         | ✅        | HTTP/WebSocket port (auto-set by Replit)         |
| `BASE_PATH`    | ✅        | Vite base path (auto-set by Replit)              |
| `SESSION_SECRET` | optional | Used for future cookie-based sessions          |

> On Replit, `DATABASE_URL` and `PORT` are injected automatically. No manual setup is needed.

---

## Default Credentials

| Role     | Email                 | Password      |
|----------|-----------------------|---------------|
| Admin    | admin@hydropy.io      | admin123      |
| Operator | operator@hydropy.io   | operator123   |

> Change these after first login in production!

---

## How to Use the Dashboard

### Overview (/)
Live system stats: fleet size, online nodes, active campaigns, messages sent/failed/queued. The 7-day throughput bar chart auto-refreshes every 30 seconds. Active campaigns are shown with live progress bars.

### Fleet (/devices)
Manage Android gateway nodes:
- **PROVISION NODE** — creates a device record and shows a QR code
- Click a device name to see hardware specs, telemetry (battery, signal), and SIM inventory
- **Disconnect** forces a device offline; **Delete** permanently removes it

### Campaigns (/campaigns)
- **NEW_PIPELINE** — create a campaign: set a name, message template (`{name}` for variable substitution), and paste CSV contacts
- Start / Pause / Resume / Stop campaigns from the table or detail page
- Click a campaign to see its full report, contact roster, and dispatch logs
- **Export CSV** downloads a report of all messages with status, timestamps, and failure reasons

### Logs (/messages)
Full message log across all campaigns:
- Filter by status (QUEUED, ASSIGNED, SENT, FAILED, etc.)
- Search by phone number
- **Clear Failed** — removes all failed message records
- **Clear All** — clears entire message log (use with caution)

### Gateway App (/gateway-app)
Instructions and tools for connecting Android devices:
- **Quick Provision** — enter a device name, generate a QR code right from this page
- Shows the WebSocket endpoint URL
- Download link for the Android APK
- Setup guide and troubleshooting FAQ

---

## Connecting an Android Gateway

1. Go to **Gateway App** or **Fleet → PROVISION NODE**
2. Enter a device name (e.g. `gateway-alpha-01`) → click **Generate QR Code**
3. On the Android device, install the HYDROPY Gateway APK (`/api/downloads/hydropy-gateway.apk`)
4. Open the app → tap **Scan QR Code** → point camera at the QR
5. The app reads `{ serverUrl, deviceId, token }` from the QR code and connects via WebSocket
6. The device appears **ONLINE** in the Fleet view within seconds
7. Start a campaign — the scheduler dispatches SMS jobs to connected devices automatically

**Android app WebSocket connection format:**
```
wss://<your-domain>/api/ws?type=device&token=<device-token>
```

---

## How SMS Dispatch Works

```
Campaign RUNNING
      │
      ▼
Scheduler (every 10s)
      │  Queries QUEUED messages
      │  Selects best online devices (battery + signal score)
      │  Sends sms.new events via WebSocket
      ▼
Android Device
      │  Calls Android SMS API
      │  Sends sms.result { messageId, status, reason }
      ▼
Server
      │  Updates message status (SENT / FAILED)
      │  Increments campaign.sent / campaign.failed
      │  Broadcasts to dashboard clients
      ▼
Dashboard
      WebSocket event → TanStack Query invalidation → UI refresh
```

### Message statuses

| Status    | Description                                      |
|-----------|--------------------------------------------------|
| CREATED   | Message record created, not yet queued           |
| QUEUED    | Waiting for scheduler dispatch                   |
| ASSIGNED  | Sent to device, awaiting result                  |
| SENDING   | Device is transmitting (optional device report)  |
| SENT      | Device confirmed SMS was sent                    |
| DELIVERED | Network confirmed delivery (if supported by SIM) |
| FAILED    | Send failed; `failureReason` contains the error  |

---

## API Reference

All endpoints are under `/api` and require `Authorization: Bearer <token>` except login.

### Auth
| Method | Path            | Description              |
|--------|-----------------|--------------------------|
| POST   | /auth/login     | Login → returns token    |
| POST   | /auth/logout    | Invalidate session token |
| GET    | /auth/me        | Current user info        |

### Devices
| Method | Path                          | Description                      |
|--------|-------------------------------|----------------------------------|
| GET    | /devices                      | List all devices (filter: status)|
| POST   | /devices                      | Create + provision device        |
| GET    | /devices/:id                  | Get device details               |
| DELETE | /devices/:id                  | Delete device                    |
| POST   | /devices/:id/disconnect       | Force device offline             |
| GET    | /devices/:id/qr               | Get/regenerate QR code           |
| GET    | /devices/:id/simcards         | List SIM cards for device        |

### Campaigns
| Method | Path                              | Description                  |
|--------|-----------------------------------|------------------------------|
| GET    | /campaigns                        | List campaigns (filter: status)|
| POST   | /campaigns                        | Create campaign              |
| GET    | /campaigns/:id                    | Get campaign                 |
| DELETE | /campaigns/:id                    | Delete campaign              |
| POST   | /campaigns/:id/start              | Start campaign               |
| POST   | /campaigns/:id/pause              | Pause campaign               |
| POST   | /campaigns/:id/resume             | Resume paused campaign       |
| POST   | /campaigns/:id/stop               | Stop + cancel campaign       |
| GET    | /campaigns/:id/contacts           | List contacts                |
| POST   | /campaigns/:id/contacts           | Import contacts (dedup)      |
| GET    | /campaigns/:id/report             | Campaign report + messages   |

### Messages
| Method | Path              | Description                              |
|--------|-------------------|------------------------------------------|
| GET    | /messages         | List messages (filter: campaignId, deviceId, status) |
| GET    | /messages/:id     | Get message                              |
| DELETE | /messages         | Bulk delete (body: `{ids?, campaignId?, status?}`) |

### Stats
| Method | Path                       | Description                       |
|--------|----------------------------|-----------------------------------|
| GET    | /stats/dashboard           | Dashboard aggregate stats         |
| GET    | /stats/messages-over-time  | Last 7 days sent/failed counts    |

### Health
| Method | Path                              | Description          |
|--------|-----------------------------------|----------------------|
| GET    | /healthz                          | Health check         |
| GET    | /downloads/hydropy-gateway.apk   | Download Gateway APK |

---

## WebSocket Protocol

Connect at: `wss://<host>/api/ws`

### Dashboard clients
```
?type=dashboard
```
No auth required. Receives broadcast events:

| Event                  | Payload                                      |
|------------------------|----------------------------------------------|
| `device.connected`     | `{ deviceId }`                               |
| `device.offline`       | `{ deviceId }`                               |
| `device.heartbeat`     | `{ deviceId, battery, signal }`              |
| `campaign.started`     | `{ campaignId }`                             |
| `campaign.completed`   | `{ campaignId }`                             |
| `campaign.cancelled`   | `{ campaignId }`                             |
| `sms.new`              | `{ messageId, deviceId }`                    |
| `sms.sent`             | `{ messageId, deviceId }`                    |
| `sms.failed`           | `{ messageId, deviceId }`                    |

### Device clients (Android app)
```
?type=device&token=<device-token>
```

**Device → Server:**

```json
// Heartbeat (send every 30s)
{ "type": "heartbeat", "battery": 85, "signal": 72, "model": "Pixel 7", "androidVersion": "14", "appVersion": "1.0.0" }

// SMS result
{ "type": "sms.result", "messageId": 42, "status": "SENT" }
{ "type": "sms.result", "messageId": 43, "status": "FAILED", "reason": "No SIM credit" }
```

**Server → Device:**

```json
// Dispatch SMS job
{ "type": "sms.new", "messageId": 42, "phone": "+15550001111", "text": "Hi John, your code is 1234." }
```

---

## Stack

| Layer     | Technology                                |
|-----------|-------------------------------------------|
| Monorepo  | pnpm workspaces, TypeScript 5.9           |
| API       | Express 5, Node.js 20, ws (WebSocket)     |
| Database  | PostgreSQL + Drizzle ORM                  |
| Frontend  | React 18, Vite, TanStack Query, Wouter    |
| UI        | Tailwind CSS v4, Radix UI / shadcn        |
| Auth      | SHA-256 token sessions (in-memory)        |
| API codegen | Orval (from OpenAPI spec)              |
| Build     | esbuild (API server CJS bundle)           |

---

## Development

### Regenerate API client after OpenAPI changes

```bash
pnpm --filter @workspace/api-spec run codegen
```

### Full typecheck

```bash
pnpm run typecheck
```

### Push schema changes (dev)

```bash
pnpm --filter @workspace/db run push
```

> Schema changes are applied to production automatically by the Replit Publish flow.

### Project layout

```
├── artifacts/
│   ├── api-server/       Express + WebSocket server
│   └── hydropy-dashboard/ React dashboard
├── lib/
│   ├── api-spec/         OpenAPI spec + Orval config
│   ├── api-client-react/ Generated React Query hooks
│   ├── api-zod/          Generated Zod validation schemas
│   └── db/               Drizzle ORM schema + config
└── scripts/
    └── seed.ts           Default user seeding
```

---

## Gotchas

- After OpenAPI spec changes, run `pnpm --filter @workspace/api-spec run codegen` before touching frontend code
- After any `lib/*` schema change, run `pnpm run typecheck:libs` before checking artifacts
- `pnpm --filter @workspace/db run push` is dev-only; production schema is managed by Replit Publish
- API server uses `req.log` for request-scoped logging, not `console.log`
- Sessions are in-memory — restarting the API server logs out all users
- The scheduler dispatches in 10-second intervals; newly started campaigns may take up to 10s to get their first SMS dispatched
- Device heartbeat interval should be ≤ 60s; the server marks devices OFFLINE on WebSocket close (not on missed heartbeats)
