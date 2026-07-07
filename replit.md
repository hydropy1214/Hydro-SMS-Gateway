# HYDROPY SMS Gateway Platform

A distributed SMS gateway management platform where Android phones act as SMS gateway devices controlled by a web dashboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, `/api` + `/ws`)
- `pnpm --filter @workspace/hydropy-dashboard run dev` — run the web dashboard (port 19444, `/`)
- `pnpm --filter @workspace/hydropy-gateway run dev` — run the Android gateway Expo app (`/mobile/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Default credentials

| Role     | Email                   | Password      |
|----------|-------------------------|---------------|
| Admin    | admin@hydropy.io        | admin123      |
| Operator | operator@hydropy.io     | operator123   |

## Building the Production APK

The gateway requires native modules and must be built with EAS Build (not Expo Go).

```bash
cd artifacts/hydropy-gateway

# One-time setup: install EAS CLI and log in
pnpm add -g eas-cli
eas login                   # requires an Expo account at expo.dev

# Link this project to your Expo account (first time)
eas init

# Build a release APK (installs directly on Android, no Play Store)
eas build --profile apk --platform android
```

After the build finishes EAS prints a download URL for the `.apk`. Install it on the Android device via `adb install <file>.apk` or transfer it directly.

### What the native modules provide
- **`@hydropy/native-sms`** — wraps Android `SmsManager` for silent automated SMS sending with no UI dialog; handles multipart messages (>160 chars) and reports per-part delivery via `PendingIntent`
- **`@hydropy/foreground-service`** — runs a persistent foreground service with CPU + WiFi wake locks so the WebSocket stays alive when the screen is off; `START_STICKY` means Android auto-restarts it if it's killed

### Permissions the APK requests
`SEND_SMS`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_DATA_SYNC`, `WAKE_LOCK`, `ACCESS_WIFI_STATE`, `CHANGE_WIFI_STATE`, `CAMERA`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + WebSocket (`ws`)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + TanStack Query + Wouter
- Validation: Zod, `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Mobile: Expo 54 + React Native 0.81, EAS Build for production APK

## Architecture

```
HYDROPY Dashboard (/)
        |
   API Server (/api)
        |
   ─────────────────
   |               |
PostgreSQL    WebSocket (/api/ws)
                   |
        Gateway App (/mobile/) ← Expo Go on Android
                   |
           Android SMS API → SIM → Mobile Network
```

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/api-client-react/src/generated/` — React Query hooks (generated)
- `lib/api-zod/src/generated/` — Zod validation schemas (generated)
- `lib/db/src/schema/` — Drizzle ORM table definitions
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/` — Auth, WebSocket, Scheduler
- `artifacts/hydropy-dashboard/src/` — React dashboard UI
- `artifacts/hydropy-gateway/` — Expo mobile gateway app (Android only for production)
- `artifacts/hydropy-gateway/context/GatewayContext.tsx` — WS connection, heartbeat, SMS dispatch
- `artifacts/hydropy-gateway/app/setup.tsx` — QR scan + manual pairing screen
- `artifacts/hydropy-gateway/app/gateway.tsx` — Live status dashboard screen
- `artifacts/hydropy-gateway/modules/native-sms/` — Native Expo module: Android SmsManager wrapper
- `artifacts/hydropy-gateway/modules/foreground-service/` — Native Expo module: foreground service + wake locks
- `artifacts/hydropy-gateway/eas.json` — EAS Build profiles (apk / preview / production)

## Architecture decisions

- **OpenAPI-first**: All API contracts defined in `openapi.yaml`, code-generated from it
- **In-memory sessions**: Simple token→userId map; sufficient for single-instance; extend with Redis for HA
- **WebSocket dual channel**: Device clients (`?type=device&token=X`) and dashboard observers (`?type=dashboard`) share one `/ws` path with separate client sets
- **Scheduler**: 10-second polling assigns QUEUED messages from RUNNING campaigns to connected devices based on battery+signal health score
- **SHA-256 password hashing**: Fast for dev; replace with bcrypt/argon2 before production

## Product

1. Admin logs in to dashboard
2. Adds Android device → QR code generated
3. Android app scans QR → WebSocket connection established
4. Device appears ONLINE with live heartbeat
5. Admin creates SMS campaign, imports CSV contacts
6. Starts campaign → messages queued → scheduler dispatches to devices
7. Devices send SMS via SIM cards, report results over WebSocket
8. Dashboard shows live progress, delivery stats, and per-message logs

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- After OpenAPI spec changes, run `pnpm --filter @workspace/api-spec run codegen` before touching frontend
- After any `lib/*` schema change, run `pnpm run typecheck:libs` before checking artifacts
- `pnpm --filter @workspace/db run push` is dev-only; production schema is managed by the Replit Publish flow
- API server uses `req.log` for request-scoped logging, not `console.log`
