---
name: Hydropy Setup Complete
description: Final setup state of the HYDROPY SMS Gateway project — what was done, what's running, and what to watch for.
---

# HYDROPY Setup — Final State

## What was done
- PostgreSQL schema pushed via `pnpm --filter @workspace/db run push` (uses Drizzle auto-push)
- Default users seeded via `pnpm --filter @workspace/scripts run seed` (see `scripts/seed.ts` for accounts; credentials are not stored here)
- Both workflows running: `artifacts/api-server: API Server` and `artifacts/hydropy-dashboard: web`
- mockup-sandbox workflow intentionally not started (canvas only)

## Backend additions
- `DELETE /api/messages` route added — bulk delete by `{ids?, campaignId?, status?}`; if none specified, clears all

## Frontend improvements
- `src/hooks/use-websocket.ts` — new hook; connects to `/api/ws?type=dashboard`, auto-reconnects, invalidates TanStack Query caches on WS events
- `src/components/app-shell.tsx` — mounts WS hook, shows live toast notifications for device/campaign events
- `src/pages/dashboard.tsx` — live stats, node status panel with heartbeat age, active campaign progress
- `src/pages/campaigns.tsx` — start/pause/resume/stop/delete from list
- `src/pages/campaign-detail.tsx` — action buttons, CSV export, full dispatch logs
- `src/pages/messages.tsx` — bulk clear (all/failed/by status) with DELETE endpoint
- `src/pages/gateway-app.tsx` — QuickProvision component with inline QR code dialog + WebSocket URL display

## TypeScript notes
- TS6305 errors (lib dist not built) are pre-existing — lib uses `"exports": { ".": "./src/index.ts" }` so Vite resolves fine at runtime
- TS7006 (implicit any) in .map() callbacks are pre-existing in original files; type imports added to new files
- tsc --noEmit shows errors but Vite runs fine (esbuild, not tsc)

**Why:** The lib has no `build` script and exports source directly — this is intentional for the monorepo dev workflow.

## How to apply
- After any lib change: Vite HMR picks it up automatically
- After schema change: `pnpm --filter @workspace/db run push`
- After OpenAPI spec change: `pnpm --filter @workspace/api-spec run codegen`
