/**
 * Expo Config Plugin — patches AndroidManifest.xml to:
 *  1. Declare the GatewayForegroundService with foregroundServiceType="dataSync"
 *  2. Add FOREGROUND_SERVICE and FOREGROUND_SERVICE_DATA_SYNC permissions
 *  3. Add WAKE_LOCK and CHANGE_WIFI_MULTICAST_STATE permissions
 */
const { withAndroidManifest } = require('@expo/config-plugins');

/** @type {import('@expo/config-plugins').ConfigPlugin} */
function withForegroundService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // ── Permissions ────────────────────────────────────────────────────────────
    if (!manifest['uses-permission']) manifest['uses-permission'] = [];
    const perms = manifest['uses-permission'];

    const permsToAdd = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
      'android.permission.WAKE_LOCK',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.CHANGE_WIFI_STATE',
    ];

    for (const name of permsToAdd) {
      if (!perms.some((p) => p.$['android:name'] === name)) {
        perms.push({ $: { 'android:name': name } });
      }
    }

    // ── Service declaration ────────────────────────────────────────────────────
    const mainApp = manifest.application[0];
    if (!mainApp.service) mainApp.service = [];

    const serviceName = 'expo.modules.foregroundservice.GatewayForegroundService';
    const alreadyDeclared = mainApp.service.some(
      (s) => s.$['android:name'] === serviceName
    );

    if (!alreadyDeclared) {
      mainApp.service.push({
        $: {
          'android:name': serviceName,
          'android:foregroundServiceType': 'dataSync',
          'android:exported': 'false',
          'android:stopWithTask': 'false',
        },
      });
    }

    return cfg;
  });
}

module.exports = withForegroundService;
