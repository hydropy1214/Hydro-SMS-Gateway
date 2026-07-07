import React, { useMemo } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useGateway, type ConnectionStatus, type LogEntry, type SmsTask } from '@/context/GatewayContext';
import { useColors } from '@/hooks/useColors';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUptime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 8);
}

function signalBars(sig: number): string {
  if (sig >= 80) return '▂▄▆█';
  if (sig >= 60) return '▂▄▆░';
  if (sig >= 40) return '▂▄░░';
  if (sig >= 20) return '▂░░░';
  return '░░░░';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatusBadge({ status, colors }: { status: ConnectionStatus; colors: any }) {
  const map: Record<ConnectionStatus, { label: string; color: string; dot: string }> = {
    connected: { label: 'ONLINE', color: colors.success, dot: colors.success },
    connecting: { label: 'CONNECTING', color: colors.warning, dot: colors.warning },
    disconnected: { label: 'OFFLINE', color: colors.mutedForeground, dot: colors.mutedForeground },
    error: { label: 'ERROR', color: colors.destructive, dot: colors.destructive },
  };
  const { label, color, dot } = map[status];
  return (
    <View style={sb.row}>
      <View style={[sb.dot, { backgroundColor: dot }]} />
      <Text style={[sb.label, { color, fontFamily: 'Inter_700Bold' }]}>{label}</Text>
    </View>
  );
}

const sb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  label: { fontSize: 13, letterSpacing: 3 },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MetricCard({ icon, label, value, sub, colors }: { icon: string; label: string; value: string; sub?: string; colors: any }) {
  return (
    <View style={[mc.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Feather name={icon as Parameters<typeof Feather>[0]['name']} size={16} color={colors.primary} />
      <Text style={[mc.value, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{value}</Text>
      {sub ? (
        <Text style={[mc.sub, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>{sub}</Text>
      ) : null}
      <Text style={[mc.label, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{label}</Text>
    </View>
  );
}

const mc = StyleSheet.create({
  card: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  value: { fontSize: 20, letterSpacing: 1 },
  sub: { fontSize: 11, letterSpacing: 1 },
  label: { fontSize: 9, letterSpacing: 2 },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SmsTaskCard({ task, onProcess, colors }: { task: SmsTask; onProcess: () => void; colors: any }) {
  const statusColor =
    task.status === 'sent' ? colors.success
    : task.status === 'failed' ? colors.destructive
    : task.status === 'sending' ? colors.warning
    : colors.primary;

  return (
    <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={st.left}>
        <Text style={[st.phone, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
          {task.phone}
        </Text>
        <Text style={[st.text, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
          {task.text}
        </Text>
        <Text style={[st.time, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          {formatTime(task.arrivedAt)}
        </Text>
      </View>
      {task.status === 'pending' ? (
        <TouchableOpacity
          style={[st.sendBtn, { borderColor: colors.primary }]}
          onPress={onProcess}
          activeOpacity={0.7}
        >
          <Feather name="send" size={14} color={colors.primary} />
        </TouchableOpacity>
      ) : (
        <View style={[st.statusTag, { borderColor: statusColor }]}>
          <Text style={[st.statusText, { color: statusColor, fontFamily: 'Inter_600SemiBold' }]}>
            {task.status.toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  left: { flex: 1, gap: 3 },
  phone: { fontSize: 13 },
  text: { fontSize: 12, lineHeight: 17 },
  time: { fontSize: 10, letterSpacing: 1 },
  sendBtn: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { fontSize: 9, letterSpacing: 2 },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LogRow({ entry, colors }: { entry: LogEntry; colors: any }) {
  const colorMap: Record<LogEntry['type'], string> = {
    info: colors.mutedForeground,
    success: colors.success,
    error: colors.destructive,
    sms: colors.primary,
  };
  return (
    <View style={lr.row}>
      <Text style={[lr.time, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
        {formatTime(entry.time)}
      </Text>
      <Text style={[lr.msg, { color: colorMap[entry.type], fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>
        {entry.message}
      </Text>
    </View>
  );
}

const lr = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 3 },
  time: { fontSize: 11, opacity: 0.6, width: 60 },
  msg: { flex: 1, fontSize: 11, lineHeight: 16 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

type Section = 'queue' | 'log';

export default function GatewayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { config, status, battery, signal, sentCount, failedCount, logs, smsTasks, uptime, unprovision, processSmsTask } = useGateway();
  const [section, setSection] = React.useState<Section>('queue');

  const pendingCount = useMemo(() => smsTasks.filter((t) => t.status === 'pending').length, [smsTasks]);

  const handleDisconnect = () => {
    Alert.alert(
      'Unpair Device',
      'This will disconnect from the HYDROPY server and clear all credentials. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unpair',
          style: 'destructive',
          onPress: async () => {
            await unprovision();
            router.replace('/setup');
          },
        },
      ],
    );
  };

  const s = makeStyles(colors);
  const webTop = Platform.OS === 'web' ? 67 : insets.top;
  const webBottom = Platform.OS === 'web' ? 34 : insets.bottom + 8;

  if (!config) {
    return (
      <View style={[s.root, { paddingTop: webTop }]}>
        <View style={s.center}>
          <Text style={s.noConfig}>No device configured</Text>
          <TouchableOpacity style={s.setupBtn} onPress={() => router.replace('/setup')}>
            <Text style={s.setupBtnText}>GO TO SETUP</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: webTop }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>HYDROPY_</Text>
          <Text style={s.headerSub}>DEVICE #{config.deviceId}</Text>
        </View>
        <View style={s.headerRight}>
          <StatusBadge status={status} colors={colors} />
          <TouchableOpacity onPress={handleDisconnect} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="log-out" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Metrics */}
      <View style={s.metrics}>
        <MetricCard icon="battery" label="BATTERY" value={battery > 0 ? `${battery}%` : '--'} colors={colors} />
        <MetricCard icon="wifi" label="SIGNAL" value={signal > 0 ? signalBars(signal) : '----'} colors={colors} />
        <MetricCard icon="clock" label="UPTIME" value={status === 'connected' ? formatUptime(uptime) : '--'} colors={colors} />
      </View>

      {/* Stats */}
      <View style={s.stats}>
        <View style={[s.statBox, { backgroundColor: colors.successDim, borderColor: colors.success }]}>
          <Feather name="check-circle" size={14} color={colors.success} />
          <Text style={[s.statNum, { color: colors.success, fontFamily: 'Inter_700Bold' }]}>{sentCount}</Text>
          <Text style={[s.statLabel, { color: colors.success, fontFamily: 'Inter_400Regular' }]}>SENT</Text>
        </View>
        <View style={[s.statBox, { backgroundColor: `${colors.destructive}18`, borderColor: colors.destructive }]}>
          <Feather name="x-circle" size={14} color={colors.destructive} />
          <Text style={[s.statNum, { color: colors.destructive, fontFamily: 'Inter_700Bold' }]}>{failedCount}</Text>
          <Text style={[s.statLabel, { color: colors.destructive, fontFamily: 'Inter_400Regular' }]}>FAILED</Text>
        </View>
        <View style={[s.statBox, { backgroundColor: `${colors.warning}18`, borderColor: colors.warning }]}>
          <Feather name="clock" size={14} color={colors.warning} />
          <Text style={[s.statNum, { color: colors.warning, fontFamily: 'Inter_700Bold' }]}>{pendingCount}</Text>
          <Text style={[s.statLabel, { color: colors.warning, fontFamily: 'Inter_400Regular' }]}>PENDING</Text>
        </View>
      </View>

      {/* Section switcher */}
      <View style={s.sectionTabs}>
        <TouchableOpacity
          style={[s.sectionTab, section === 'queue' && { borderBottomColor: colors.primary }]}
          onPress={() => setSection('queue')}
        >
          <Text style={[s.sectionTabText, { color: section === 'queue' ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
            SMS QUEUE {pendingCount > 0 ? `(${pendingCount})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.sectionTab, section === 'log' && { borderBottomColor: colors.primary }]}
          onPress={() => setSection('log')}
        >
          <Text style={[s.sectionTabText, { color: section === 'log' ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
            LIVE LOG
          </Text>
        </TouchableOpacity>
      </View>

      {/* Section content */}
      {section === 'queue' ? (
        <FlatList
          data={smsTasks}
          keyExtractor={(item) => item.messageId.toString()}
          renderItem={({ item }) => (
            <SmsTaskCard
              task={item}
              colors={colors}
              onProcess={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                processSmsTask(item.messageId);
              }}
            />
          )}
          contentContainerStyle={[s.listContent, { paddingBottom: webBottom }]}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Feather name="inbox" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                No messages in queue
              </Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <LogRow entry={item} colors={colors} />}
          contentContainerStyle={[s.listContent, { paddingBottom: webBottom }]}
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Feather name="terminal" size={32} color={colors.mutedForeground} />
              <Text style={[s.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                No log entries yet
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeStyles(colors: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
      paddingTop: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 20,
      letterSpacing: 3,
      color: colors.primary,
      fontFamily: 'Inter_700Bold',
    },
    headerSub: {
      fontSize: 9,
      letterSpacing: 3,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    metrics: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
    stats: {
      flexDirection: 'row',
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 10,
    },
    statBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderRadius: 6,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    statNum: { fontSize: 18 },
    statLabel: { fontSize: 9, letterSpacing: 2 },
    sectionTabs: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginTop: 16,
    },
    sectionTab: {
      flex: 1,
      alignItems: 'center',
      paddingBottom: 10,
      paddingTop: 4,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    sectionTabText: {
      fontSize: 10,
      letterSpacing: 2,
    },
    listContent: { padding: 16 },
    emptyState: {
      alignItems: 'center',
      paddingTop: 48,
      gap: 12,
    },
    emptyText: {
      fontSize: 13,
      letterSpacing: 1,
    },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
    },
    noConfig: {
      color: colors.mutedForeground,
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
    },
    setupBtn: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 6,
      paddingHorizontal: 24,
      paddingVertical: 10,
    },
    setupBtnText: {
      color: colors.primary,
      fontSize: 12,
      letterSpacing: 2,
      fontFamily: 'Inter_600SemiBold',
    },
  });
}
