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

interface QrPayload {
  serverUrl: string;
  token: string;
  deviceId: number;
}

function parsePayload(raw: string): QrPayload {
  const p = JSON.parse(raw) as Partial<QrPayload>;
  if (!p.serverUrl || !p.token || !p.deviceId) {
    throw new Error('Missing required fields (serverUrl, token, deviceId)');
  }
  return { serverUrl: p.serverUrl, token: p.token, deviceId: p.deviceId };
}

export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { provision } = useGateway();

  const [tab, setTab] = useState<Tab>('qr');
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Manual entry — paste mode (JSON payload) or field-by-field
  const [pasteMode, setPasteMode] = useState(true);
  const [pasteText, setPasteText] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [token, setToken] = useState('');
  const [deviceId, setDeviceId] = useState('');

  const [permission, requestPermission] = useCameraPermissions();

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const connect = async (payload: QrPayload) => {
    setLoading(true);
    try {
      await provision({
        serverUrl: payload.serverUrl,
        token: payload.token,
        deviceId: payload.deviceId,
      });
      router.replace('/gateway');
    } catch {
      Alert.alert('Connection Error', 'Could not save configuration. Check fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─── QR scan ───────────────────────────────────────────────────────────────

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const payload = parsePayload(data);
      await connect(payload);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid QR code';
      Alert.alert('Invalid QR', msg, [{ text: 'Try Again', onPress: () => setScanned(false) }]);
    }
  };

  // ─── Manual connect ────────────────────────────────────────────────────────

  const handlePasteConnect = async () => {
    try {
      const payload = parsePayload(pasteText.trim());
      await connect(payload);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON — copy the exact QR payload from the dashboard';
      Alert.alert('Parse Error', msg);
    }
  };

  const handleFieldConnect = async () => {
    const url = serverUrl.trim();
    const tok = token.trim();
    const did = parseInt(deviceId.trim(), 10);
    if (!url || !tok || isNaN(did) || did <= 0) {
      Alert.alert('Missing Fields', 'Fill in all three fields. Device ID must be a number (e.g. 1).');
      return;
    }
    await connect({ serverUrl: url, token: tok, deviceId: did });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const s = makeStyles(colors);
  const webTop = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[s.root, { paddingTop: webTop }]}>
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.title}>HYDROPY_</Text>
        <Text style={s.subtitle}>CONNECT GATEWAY NODE</Text>
      </View>

      {/* ── How to connect guide banner ── */}
      <TouchableOpacity style={s.guideBanner} onPress={() => setShowGuide(!showGuide)} activeOpacity={0.8}>
        <Feather name="info" size={14} color={colors.primary} />
        <Text style={s.guideBannerText}>How to connect  {showGuide ? '▲ hide' : '▼ show steps'}</Text>
      </TouchableOpacity>

      {showGuide && (
        <View style={s.guideBox}>
          {[
            ['1', 'Open the HYDROPY dashboard in your browser'],
            ['2', 'Go to Devices → PROVISION NODE (or use Gateway App page)'],
            ['3', 'Enter a name and click Generate QR Code'],
            ['4', 'Scan the QR with this app  —or—  click the QR to see the payload and paste it below'],
          ].map(([n, t]) => (
            <View key={n} style={s.guideRow}>
              <View style={s.guideNum}><Text style={s.guideNumText}>{n}</Text></View>
              <Text style={s.guideStep}>{t}</Text>
            </View>
          ))}
          <View style={s.guideTip}>
            <Feather name="alert-circle" size={12} color={colors.warning} />
            <Text style={s.guideTipText}>Ubuntu server: set SERVER_URL=http://your-ip:8080 in .env</Text>
          </View>
        </View>
      )}

      {/* ── Tab switcher ── */}
      <View style={s.tabs}>
        <TouchableOpacity style={[s.tabBtn, tab === 'qr' && { borderBottomColor: colors.primary }]} onPress={() => setTab('qr')} activeOpacity={0.7}>
          <Feather name="camera" size={13} color={tab === 'qr' ? colors.primary : colors.mutedForeground} />
          <Text style={[s.tabLabel, { color: tab === 'qr' ? colors.primary : colors.mutedForeground }]}>SCAN QR</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tabBtn, tab === 'manual' && { borderBottomColor: colors.primary }]} onPress={() => setTab('manual')} activeOpacity={0.7}>
          <Feather name="edit-2" size={13} color={tab === 'manual' ? colors.primary : colors.mutedForeground} />
          <Text style={[s.tabLabel, { color: tab === 'manual' ? colors.primary : colors.mutedForeground }]}>MANUAL ENTRY</Text>
        </TouchableOpacity>
      </View>

      {/* ── QR Tab ── */}
      {tab === 'qr' ? (
        <View style={s.cameraSection}>
          {!permission ? (
            <View style={s.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : !permission.granted ? (
            <View style={s.center}>
              <Feather name="camera-off" size={36} color={colors.mutedForeground} />
              <Text style={s.permText}>Camera permission required to scan QR codes</Text>
              {permission.canAskAgain ? (
                <TouchableOpacity style={s.primaryBtn} onPress={requestPermission}>
                  <Text style={s.primaryBtnText}>ALLOW CAMERA</Text>
                </TouchableOpacity>
              ) : (
                <Text style={[s.permText, { color: colors.destructive, marginTop: 8 }]}>
                  Enable camera in device Settings → Apps → HYDROPY → Permissions
                </Text>
              )}
              <TouchableOpacity onPress={() => setTab('manual')} style={{ marginTop: 16 }}>
                <Text style={[s.permText, { color: colors.primary }]}>Use manual entry instead →</Text>
              </TouchableOpacity>
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
                  {loading && <ActivityIndicator color={colors.primary} size="large" />}
                </View>
                <View style={s.scanHintBox}>
                  <Text style={s.scanHint}>Point camera at the QR code from the HYDROPY dashboard</Text>
                  {scanned && !loading && (
                    <TouchableOpacity onPress={() => setScanned(false)} style={s.retryBtn}>
                      <Text style={s.retryBtnText}>TAP TO RETRY</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}
        </View>
      ) : (
        /* ── Manual Tab ── */
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={s.manualContent} keyboardShouldPersistTaps="handled">

            {/* Mode toggle */}
            <View style={s.modeRow}>
              <TouchableOpacity style={[s.modeBtn, pasteMode && s.modeBtnActive]} onPress={() => setPasteMode(true)} activeOpacity={0.8}>
                <Feather name="clipboard" size={12} color={pasteMode ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[s.modeBtnText, { color: pasteMode ? colors.primaryForeground : colors.mutedForeground }]}>Paste JSON</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modeBtn, !pasteMode && s.modeBtnActive]} onPress={() => setPasteMode(false)} activeOpacity={0.8}>
                <Feather name="sliders" size={12} color={!pasteMode ? colors.primaryForeground : colors.mutedForeground} />
                <Text style={[s.modeBtnText, { color: !pasteMode ? colors.primaryForeground : colors.mutedForeground }]}>Enter Fields</Text>
              </TouchableOpacity>
            </View>

            {pasteMode ? (
              /* ── Paste mode ── */
              <>
                <Text style={s.fieldLabel}>PASTE QR PAYLOAD</Text>
                <Text style={s.fieldHint}>
                  In the dashboard → Devices → click a device → View QR → copy the QR payload shown below the code.{'\n'}
                  It looks like: {'{'}serverUrl, deviceId, token{'}'}
                </Text>
                <TextInput
                  style={[s.input, s.pasteInput]}
                  value={pasteText}
                  onChangeText={setPasteText}
                  placeholder={'{"serverUrl":"https://...","deviceId":1,"token":"abc..."}'}
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity
                  style={[s.primaryBtn, { marginTop: 16 }, loading && s.btnDisabled]}
                  onPress={handlePasteConnect}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading
                    ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                    : <Text style={s.primaryBtnText}>CONNECT</Text>
                  }
                </TouchableOpacity>
              </>
            ) : (
              /* ── Field mode ── */
              <>
                <Text style={s.fieldLabel}>SERVER URL</Text>
                <Text style={s.fieldHint}>The HYDROPY server address. On Replit: your .replit.dev URL. On Ubuntu: http://server-ip:8080</Text>
                <TextInput
                  style={s.input}
                  value={serverUrl}
                  onChangeText={setServerUrl}
                  placeholder="https://yourapp.replit.dev  or  http://192.168.1.10:8080"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

                <Text style={s.fieldLabel}>DEVICE TOKEN</Text>
                <Text style={s.fieldHint}>Found in dashboard: Devices → your device → View QR → copy token field</Text>
                <TextInput
                  style={s.input}
                  value={token}
                  onChangeText={setToken}
                  placeholder="48-character hex string"
                  placeholderTextColor={colors.mutedForeground}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={s.fieldLabel}>DEVICE ID</Text>
                <Text style={s.fieldHint}>The device number shown in dashboard (e.g. 1, 2, 3…)</Text>
                <TextInput
                  style={s.input}
                  value={deviceId}
                  onChangeText={setDeviceId}
                  placeholder="1"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numeric"
                />

                <TouchableOpacity
                  style={[s.primaryBtn, { marginTop: 24 }, loading && s.btnDisabled]}
                  onPress={handleFieldConnect}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading
                    ? <ActivityIndicator color={colors.primaryForeground} size="small" />
                    : <Text style={s.primaryBtnText}>CONNECT</Text>
                  }
                </TouchableOpacity>
              </>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ── Footer ── */}
      <View style={[s.footer, { paddingBottom: Platform.OS === 'web' ? 20 : insets.bottom + 12 }]}>
        <Text style={s.footerText}>HYDROPY GATEWAY NODE v1.0</Text>
      </View>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { alignItems: 'center', paddingVertical: 16, gap: 4 },
    title: { fontSize: 22, letterSpacing: 4, color: colors.primary, fontFamily: 'Inter_700Bold' },
    subtitle: { fontSize: 9, letterSpacing: 5, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },

    guideBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 20,
      marginBottom: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.primary + '40',
      backgroundColor: colors.primary + '10',
    },
    guideBannerText: { color: colors.primary, fontSize: 12, fontFamily: 'Inter_600SemiBold', flex: 1 },

    guideBox: {
      marginHorizontal: 20,
      marginBottom: 10,
      padding: 14,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      gap: 10,
    },
    guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    guideNum: {
      width: 20, height: 20, borderRadius: 10,
      backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center',
    },
    guideNumText: { color: colors.primary, fontSize: 10, fontFamily: 'Inter_700Bold' },
    guideStep: { flex: 1, color: colors.foreground, fontSize: 12, fontFamily: 'Inter_400Regular', lineHeight: 17 },
    guideTip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.border },
    guideTipText: { flex: 1, color: colors.warning, fontSize: 11, fontFamily: 'Inter_400Regular' },

    tabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 0,
    },
    tabBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabLabel: { fontSize: 11, letterSpacing: 2, fontFamily: 'Inter_600SemiBold' },

    cameraSection: {
      flex: 1,
      margin: 16,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    camera: { flex: 1 },
    scanOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    },
    scanFrame: {
      width: 220, height: 220,
      alignItems: 'center', justifyContent: 'center',
    },
    corner: { position: 'absolute', width: 28, height: 28, borderWidth: 3 },
    cornerTL: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
    cornerTR: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
    cornerBL: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
    cornerBR: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
    scanHintBox: { alignItems: 'center', gap: 12 },
    scanHint: {
      color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center',
      fontFamily: 'Inter_400Regular', paddingHorizontal: 32,
    },
    retryBtn: {
      borderWidth: 1, borderColor: colors.primary, borderRadius: 6,
      paddingHorizontal: 20, paddingVertical: 8,
    },
    retryBtnText: { color: colors.primary, fontSize: 11, letterSpacing: 2, fontFamily: 'Inter_600SemiBold' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
    permText: {
      color: colors.mutedForeground, fontSize: 13, textAlign: 'center',
      fontFamily: 'Inter_400Regular', lineHeight: 19,
    },

    manualContent: { padding: 20, gap: 6, paddingBottom: 20 },

    modeRow: {
      flexDirection: 'row', borderRadius: 6, borderWidth: 1, borderColor: colors.border,
      overflow: 'hidden', marginBottom: 16,
    },
    modeBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 6, paddingVertical: 9, backgroundColor: 'transparent',
    },
    modeBtnActive: { backgroundColor: colors.primary },
    modeBtnText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },

    fieldLabel: {
      fontSize: 10, letterSpacing: 3, color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold', marginTop: 12, marginBottom: 2,
    },
    fieldHint: {
      fontSize: 11, color: colors.mutedForeground + 'cc', fontFamily: 'Inter_400Regular',
      lineHeight: 16, marginBottom: 6,
    },
    input: {
      backgroundColor: colors.input, borderWidth: 1, borderColor: colors.border,
      borderRadius: 6, paddingHorizontal: 14, paddingVertical: 11,
      color: colors.foreground, fontFamily: 'Inter_400Regular', fontSize: 13,
    },
    pasteInput: { minHeight: 90, textAlignVertical: 'top', paddingTop: 11 },

    primaryBtn: {
      backgroundColor: colors.primary, borderRadius: 6,
      alignItems: 'center', justifyContent: 'center', paddingVertical: 14,
    },
    primaryBtnText: {
      color: colors.primaryForeground, fontSize: 13, letterSpacing: 3, fontFamily: 'Inter_700Bold',
    },
    btnDisabled: { opacity: 0.55 },

    footer: { alignItems: 'center', paddingTop: 8 },
    footerText: { fontSize: 9, letterSpacing: 3, color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
  });
}
