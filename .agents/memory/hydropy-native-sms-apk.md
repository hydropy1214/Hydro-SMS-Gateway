---
name: Hydropy Native SMS APK
description: Native Expo modules built for production APK — SmsManager and foreground service — and how they wire together.
---

# HYDROPY Native SMS + APK Build

## What was built
Two local Expo Modules at `artifacts/hydropy-gateway/modules/`:

### `@hydropy/native-sms`
- Kotlin module wrapping `android.telephony.SmsManager.sendTextMessage / sendMultipartTextMessage`
- No UI dialog — fully automated sending from JS via `sendSms(phone, text): Promise<'SENT'>`
- Uses per-part `PendingIntent` + dynamic `BroadcastReceiver` for each part; promise only resolves after ALL parts confirm `RESULT_OK`
- `AtomicInteger` + `AtomicBoolean` for thread-safe multi-part tracking
- API 31+ uses `context.getSystemService(SmsManager::class.java)`; older uses deprecated `SmsManager.getDefault()`
- Receivers registered with `RECEIVER_NOT_EXPORTED` on API 33+

### `@hydropy/foreground-service`
- `GatewayForegroundService` with `START_STICKY`, CPU wake lock (12 h cap), WiFi high-perf lock
- `releaseWakeLocks()` called before `acquireWakeLocks()` on each `onStartCommand` to prevent stacking
- Stop via `context.stopService(intent)` (NOT `startService(ACTION_STOP)`) — avoids `IllegalStateException` on Android 8+ background
- `isRunning` companion `@Volatile` var readable from JS without IPC
- Config plugin (`app.plugin.js`) adds service declaration + permissions to `AndroidManifest.xml`

## EAS Build
- `artifacts/hydropy-gateway/eas.json` — `apk` profile uses `:app:assembleRelease`
- Run: `cd artifacts/hydropy-gateway && eas build --profile apk --platform android`
- Requires Expo account + `eas login` first

## GatewayContext changes
- Replaced `expo-sms` with `@hydropy/native-sms`
- Starts foreground service on WS `onopen`, stops it on `onclose` (auth failure) or `unprovision()`
- Service start/stop is Android-only (`Platform.OS === 'android'` guard)

**Why:** `expo-sms` opens a native SMS composer dialog — unusable for automated background sending. SmsManager sends silently.

**How to apply:**
- Any change to the Kotlin modules requires an EAS rebuild (native code, not JS HMR)
- Default SMS app role may still be needed on Android 10+ — see Task #3
- Boot persistence not yet implemented — see Task #2
