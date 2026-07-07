import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useGateway } from '@/context/GatewayContext';
import { useColors } from '@/hooks/useColors';

type Tab = 'qr' | 'manual';

export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { provision } = useGateway();

  const [tab, setTab] = useState<Tab>('qr');
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  // Manual entry state
  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [deviceId, setDeviceId] = useState('');

  // Camera permission
  const [permission, requestPermission] = useCameraPermissions();

  // ── QR scan ────────────────────────────────────────────────────────────────

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const parsed = JSON.parse(data) as {
        serverUrl?: string;
        token?: string;
        deviceId?: number;
      };
      if (!parsed.serverUrl || !parsed.token || !parsed.deviceId) {
        throw new Error('Invalid QR code — missing required fields');
      }
      setLoading(true);
      await provision({
        serverUrl: parsed.serverUrl,
        token: parsed.token,
        deviceId: parsed.deviceId,
      });
      router.replace('/gateway');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not parse QR code';
      Alert.alert('Invalid QR', msg, [
        { text: 'Retry', onPress: () => setScanned(false) },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Manual connect ─────────────────────────────────────────────────────────

  const handleManual = async () => {
    const url = serverUrl.trim();
    const tok = token.trim();
    const did = parseInt(deviceId.trim(), 10);

    if (!url || !tok || !did || isNaN(did)) {
      Alert.alert('Missing Fields', 'Please fill in all fields correctly.');
      return;
    }
    setLoading(true);
    try {
      await provision({ serverUrl: url, token: tok, deviceId: did });
      router.replace('/gateway');
    } catch {
      Alert.alert('Error', 'Failed to save configuration.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const s = makeStyles(colors);
  const webTop = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[s.root, { paddingTop: webTop }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>HYDROPY_</Text>
        <Text style={s.subtitle}>PAIR DEVICE</Text>
      </View>

      {/* Tab switcher */}
      <View style={s.tabs}>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'qr' && s.tabBtnActive]}
          onPress={() => setTab('qr')}
          activeOpacity={0.7}
        >
          <Feather
            name="camera"
            size={14}
            color={tab === 'qr' ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text style={[s.tabLabel, tab === 'qr' && s.tabLabelActive]}>
            SCAN QR
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tabBtn, tab === 'manual' && s.tabBtnActive]}
          onPress={() => setTab('manual')}
          activeOpacity={0.7}
        >
          <Feather
            name="edit-2"
            size={14}
            color={tab === 'manual' ? colors.primaryForeground : colors.mutedForeground}
          />
          <Text style={[s.tabLabel, tab === 'manual' && s.tabLabelActive]}>
            MANUAL
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {tab === 'qr' ? (
        <View style={s.cameraSection}>
          {!permission ? (
            <View style={s.permCenter}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : !permission.granted ? (
            <View style={s.permCenter}>
              <Feather name="camera-off" size={40} color={colors.mutedForeground} />
              <Text style={s.permText}>Camera access is required to scan QR codes</Text>
              {permission.canAskAgain ? (
                <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
                  <Text style={s.permBtnText}>ALLOW CAMERA</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[s.permText, { color: colors.destructive, marginTop: 8 }]}>
                  Please enable camera in Settings
                </Text>
              )}
            </View>
          ) : (
            <>
              <CameraView
                style={s.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcode}
              />
              <View style={s.scanOverlay}>
                <View style={s.scanFrame}>
                  <View style={[s.corner, s.cornerTL, { borderColor: colors.primary }]} />
                  <View style={[s.corner, s.cornerTR, { borderColor: colors.primary }]} />
                  <View style={[s.corner, s.cornerBL, { borderColor: colors.primary }]} />
                  <View style={[s.corner, s.cornerBR, { borderColor: colors.primary }]} />
                  {loading && (
                    <ActivityIndicator color={colors.primary} size="large" />
                  )}
                </View>
                <Text style={s.scanHint}>
                  Scan the QR code from the HYDROPY dashboard
                </Text>
              </View>
            </>
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.manualContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={s.fieldLabel}>SERVER URL</Text>
            <TextInput
              style={s.input}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="https://your-server.replit.dev"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={s.fieldLabel}>DEVICE TOKEN</Text>
            <TextInput
              style={s.input}
              value={token}
              onChangeText={setToken}
              placeholder="Token from device QR page"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={s.fieldLabel}>DEVICE ID</Text>
            <TextInput
              style={s.input}
              value={deviceId}
              onChangeText={setDeviceId}
              placeholder="1"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[s.connectBtn, loading && { opacity: 0.6 }]}
              onPress={handleManual}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.primaryForeground} size="small" />
              ) : (
                <Text style={s.connectBtnText}>CONNECT</Text>
              )}
            </TouchableOpacity>

            <Text style={s.hint}>
              Find the device token in the HYDROPY dashboard under Devices → QR Code
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <View
        style={[
          s.footer,
          { paddingBottom: Platform.OS === 'web' ? 34 : insets.bottom + 16 },
        ]}
      >
        <Text style={s.footerText}>GATEWAY INFRASTRUCTURE CONSOLE</Text>
      </View>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStyles(colors: any) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      alignItems: 'center',
      paddingVertical: 20,
      gap: 4,
    },
    title: {
      fontSize: 24,
      letterSpacing: 4,
      color: colors.primary,
      fontFamily: 'Inter_700Bold',
    },
    subtitle: {
      fontSize: 10,
      letterSpacing: 6,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
    tabs: {
      flexDirection: 'row',
      marginHorizontal: 24,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      marginBottom: 20,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      backgroundColor: 'transparent',
    },
    tabBtnActive: {
      backgroundColor: colors.primary,
    },
    tabLabel: {
      fontSize: 11,
      letterSpacing: 2,
      color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
    },
    tabLabelActive: {
      color: colors.primaryForeground,
    },
    cameraSection: {
      flex: 1,
      marginHorizontal: 24,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    camera: {
      flex: 1,
    },
    scanOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
    },
    scanFrame: {
      width: 220,
      height: 220,
      alignItems: 'center',
      justifyContent: 'center',
    },
    corner: {
      position: 'absolute',
      width: 24,
      height: 24,
      borderWidth: 2,
    },
    cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
    cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
    cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
    cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
    scanHint: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 12,
      textAlign: 'center',
      fontFamily: 'Inter_400Regular',
      paddingHorizontal: 24,
    },
    permCenter: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 32,
    },
    permText: {
      color: colors.mutedForeground,
      fontSize: 13,
      textAlign: 'center',
      fontFamily: 'Inter_400Regular',
    },
    permBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 6,
      paddingHorizontal: 24,
      paddingVertical: 10,
    },
    permBtnText: {
      color: colors.primary,
      fontSize: 12,
      letterSpacing: 2,
      fontFamily: 'Inter_600SemiBold',
    },
    manualContent: {
      padding: 24,
      gap: 8,
      paddingBottom: 40,
    },
    fieldLabel: {
      fontSize: 10,
      letterSpacing: 3,
      color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
      marginBottom: 4,
      marginTop: 16,
    },
    input: {
      backgroundColor: colors.input,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 6,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
    },
    connectBtn: {
      backgroundColor: colors.primary,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 14,
      marginTop: 24,
    },
    connectBtnText: {
      color: colors.primaryForeground,
      fontSize: 13,
      letterSpacing: 3,
      fontFamily: 'Inter_700Bold',
    },
    hint: {
      color: colors.mutedForeground,
      fontSize: 12,
      textAlign: 'center',
      fontFamily: 'Inter_400Regular',
      marginTop: 12,
      lineHeight: 18,
    },
    footer: {
      alignItems: 'center',
      paddingTop: 12,
    },
    footerText: {
      fontSize: 9,
      letterSpacing: 3,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
  });
}
