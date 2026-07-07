import { requireNativeModule } from 'expo-modules-core';
import { PermissionsAndroid, Platform } from 'react-native';

interface NativeSmsModuleType {
  sendSms(phone: string, text: string): Promise<'SENT'>;
}

const NativeSms: NativeSmsModuleType = requireNativeModule('NativeSms');

/**
 * Check whether the SEND_SMS runtime permission is currently granted.
 * Always returns true on non-Android platforms.
 */
export async function hasSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.SEND_SMS);
  return result;
}

/**
 * Request the SEND_SMS runtime permission from the user if not already granted.
 * Returns true if granted, false if denied or permanently denied.
 * Always returns true on non-Android platforms.
 */
export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.SEND_SMS,
    {
      title: 'SMS Permission Required',
      message:
        'HYDROPY Gateway needs permission to send SMS messages on behalf of your campaigns. ' +
        'Without this permission, the gateway cannot operate.',
      buttonPositive: 'Grant Permission',
      buttonNegative: 'Deny',
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

/**
 * Send an SMS silently via Android SmsManager — no UI dialog.
 * Throws if SEND_SMS permission is not granted.
 * Resolves with 'SENT' on success; rejects with an error on failure.
 * Automatically splits messages longer than 160 characters.
 *
 * Always call requestSmsPermission() at app startup / provisioning before invoking this.
 */
export async function sendSms(phone: string, text: string): Promise<'SENT'> {
  if (Platform.OS !== 'android') {
    throw new Error('Native SMS is only available on Android');
  }
  // Guard: if permission was silently revoked between checks, fail fast with a clear message
  const granted = await hasSmsPermission();
  if (!granted) {
    throw new Error('SEND_SMS permission not granted — open Settings to allow it');
  }
  return NativeSms.sendSms(phone, text);
}
