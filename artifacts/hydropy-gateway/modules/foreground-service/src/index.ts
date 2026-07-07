import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

interface ForegroundServiceModuleType {
  startService(title: string, text: string): void;
  stopService(): void;
  isRunning(): boolean;
}

const ForegroundServiceModule: ForegroundServiceModuleType | null =
  Platform.OS === 'android' ? requireNativeModule('ForegroundService') : null;

/**
 * Start the HYDROPY Gateway foreground service.
 * Acquires CPU and WiFi wake locks so the WebSocket stays alive
 * when the screen is off. No-op on non-Android platforms.
 */
export function startGatewayService(
  title = 'HYDROPY Gateway Active',
  text = 'Receiving and sending SMS in the background'
): void {
  ForegroundServiceModule?.startService(title, text);
}

/**
 * Stop the foreground service and release all wake locks.
 */
export function stopGatewayService(): void {
  ForegroundServiceModule?.stopService();
}

/**
 * Returns true if the foreground service is currently running.
 */
export function isGatewayServiceRunning(): boolean {
  return ForegroundServiceModule?.isRunning() ?? false;
}
