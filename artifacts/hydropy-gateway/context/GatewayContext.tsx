import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SMS from 'expo-sms';
import * as Haptics from 'expo-haptics';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProvisionConfig {
  serverUrl: string;
  deviceId: number;
  token: string;
}

export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export interface LogEntry {
  id: string;
  time: Date;
  type: 'info' | 'success' | 'error' | 'sms';
  message: string;
}

export interface SmsTask {
  messageId: number;
  phone: string;
  text: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  arrivedAt: Date;
}

interface GatewayContextValue {
  config: ProvisionConfig | null;
  status: ConnectionStatus;
  battery: number;
  signal: number;
  sentCount: number;
  failedCount: number;
  logs: LogEntry[];
  smsTasks: SmsTask[];
  uptime: number; // seconds
  provision: (cfg: ProvisionConfig) => Promise<void>;
  unprovision: () => Promise<void>;
  processSmsTask: (messageId: number) => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const GatewayContext = createContext<GatewayContextValue | null>(null);

export function useGateway(): GatewayContextValue {
  const ctx = useContext(GatewayContext);
  if (!ctx) throw new Error('useGateway must be used inside GatewayProvider');
  return ctx;
}

// ─── Storage key ─────────────────────────────────────────────────────────────

const STORAGE_KEY = '@hydropy_gateway_config';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 6);
}

function toWsUrl(serverUrl: string, token: string): string {
  const base = serverUrl.replace(/\/$/, '');
  // Handle old QR format where serverUrl already contains the full WS path
  // e.g. "wss://domain/api/ws" → strip to base, then re-append cleanly
  const stripped = base
    .replace(/\/api\/ws$/, '')               // remove trailing /api/ws
    .replace(/^wss:\/\//, 'https://')        // normalise to https scheme
    .replace(/^ws:\/\//, 'http://');
  const ws = stripped
    .replace(/^https:\/\//, 'wss://')
    .replace(/^http:\/\//, 'ws://');
  return `${ws}/api/ws?type=device&token=${encodeURIComponent(token)}`;
}

async function getBatteryLevel(): Promise<number> {
  if (Platform.OS === 'web') return 85;
  try {
    const Battery = require('expo-battery');
    const level = await Battery.getBatteryLevelAsync();
    return Math.round((level ?? 0.85) * 100);
  } catch {
    return 85;
  }
}

async function getDeviceInfo(): Promise<{
  model: string;
  androidVersion: string;
  appVersion: string;
}> {
  if (Platform.OS === 'web') {
    return { model: 'Web Browser', androidVersion: 'N/A', appVersion: '1.0.0' };
  }
  try {
    const Device = require('expo-device');
    return {
      model: Device.modelName ?? 'Unknown',
      androidVersion: Device.osVersion ?? 'Unknown',
      appVersion: '1.0.0',
    };
  } catch {
    return { model: 'Android Device', androidVersion: '13', appVersion: '1.0.0' };
  }
}

// Simulate signal based on connection quality (1-5 bars → 20-100)
function getSignalStrength(): number {
  // In a real app, use Netinfo or device APIs. Simulate here.
  return Math.floor(60 + Math.random() * 40);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const MAX_LOGS = 80;
const HEARTBEAT_INTERVAL = 30_000;
const RECONNECT_BASE = 3_000;
const RECONNECT_MAX = 30_000;

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ProvisionConfig | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [battery, setBattery] = useState<number>(0);
  const [signal, setSignal] = useState<number>(0);
  const [sentCount, setSentCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [smsTasks, setSmsTasks] = useState<SmsTask[]>([]);
  const [uptime, setUptime] = useState<number>(0);

  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef<number>(RECONNECT_BASE);
  const connectedAt = useRef<number | null>(null);
  const uptimeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configRef = useRef<ProvisionConfig | null>(null);
  // Ref mirror of smsTasks so processSmsTask always reads current data
  const smsTasksRef = useRef<SmsTask[]>([]);
  // Set of messageIds currently being processed — prevents duplicate sends
  const processingRef = useRef<Set<number>>(new Set());
  // Stable ref to processSmsTask so ws.onmessage auto-trigger doesn't capture stale closure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const processSmsTaskRef = useRef<(messageId: number) => Promise<void>>(async () => {});

  // Keep configRef in sync
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // ── Logging ─────────────────────────────────────────────────────────────────

  const addLog = useCallback(
    (type: LogEntry['type'], message: string) => {
      setLogs((prev) => {
        const entry: LogEntry = { id: makeId(), time: new Date(), type, message };
        const next = [entry, ...prev];
        return next.length > MAX_LOGS ? next.slice(0, MAX_LOGS) : next;
      });
    },
    [],
  );

  // ── WebSocket ────────────────────────────────────────────────────────────────

  const sendWs = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    const [bat, dev, sig] = await Promise.all([
      getBatteryLevel(),
      getDeviceInfo(),
      Promise.resolve(getSignalStrength()),
    ]);
    setBattery(bat);
    setSignal(sig);
    sendWs({
      type: 'heartbeat',
      battery: bat,
      signal: sig,
      model: dev.model,
      androidVersion: dev.androidVersion,
      appVersion: dev.appVersion,
    });
  }, [sendWs]);

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    sendHeartbeat(); // immediate first beat
    heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
  }, [sendHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startUptimeCounter = useCallback(() => {
    connectedAt.current = Date.now();
    if (uptimeRef.current) clearInterval(uptimeRef.current);
    uptimeRef.current = setInterval(() => {
      if (connectedAt.current) {
        setUptime(Math.floor((Date.now() - connectedAt.current) / 1000));
      }
    }, 1000);
  }, []);

  const stopUptimeCounter = useCallback(() => {
    if (uptimeRef.current) {
      clearInterval(uptimeRef.current);
      uptimeRef.current = null;
    }
    setUptime(0);
  }, []);

  const connect = useCallback(
    (cfg: ProvisionConfig) => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }

      setStatus('connecting');
      addLog('info', `Connecting to ${cfg.serverUrl}…`);

      const url = toWsUrl(cfg.serverUrl, cfg.token);
      let ws: WebSocket;
      try {
        ws = new WebSocket(url);
      } catch (e) {
        addLog('error', `Failed to create WebSocket: ${e}`);
        setStatus('error');
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectDelay.current = RECONNECT_BASE;
        addLog('success', 'Connected to HYDROPY server');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        startHeartbeat();
        startUptimeCounter();
      };

      ws.onmessage = (evt) => {
        let msg: { type: string; messageId?: number; phone?: string; text?: string };
        try {
          msg = JSON.parse(evt.data as string);
        } catch {
          return;
        }

        if (msg.type === 'sms.new' && msg.messageId && msg.phone && msg.text) {
          const task: SmsTask = {
            messageId: msg.messageId,
            phone: msg.phone,
            text: msg.text,
            status: 'pending',
            arrivedAt: new Date(),
          };
          addLog('sms', `New SMS → ${msg.phone}: ${msg.text.slice(0, 40)}${msg.text.length > 40 ? '…' : ''}`);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setSmsTasks((prev) => {
            const next = [task, ...prev.slice(0, 49)];
            smsTasksRef.current = next;
            return next;
          });
          // Auto-process immediately — no manual tap required in production
          setTimeout(() => processSmsTaskRef.current(msg.messageId!), 300);
        }
      };

      ws.onerror = () => {
        addLog('error', 'WebSocket error');
      };

      ws.onclose = (evt) => {
        stopHeartbeat();
        stopUptimeCounter();
        if (!configRef.current) {
          setStatus('disconnected');
          return;
        }
        // 4001/4003/4008 = auth failure / forbidden / bad token — do not retry
        const isAuthFailure = evt.code === 4001 || evt.code === 4003 || evt.code === 4008;
        if (isAuthFailure) {
          setStatus('error');
          addLog('error', `Auth rejected (code ${evt.code}) — check your device token and re-provision`);
          return;
        }
        setStatus('error');
        const delaySec = Math.round(reconnectDelay.current / 1000);
        addLog('error', `Disconnected (code ${evt.code}) — reconnecting in ${delaySec}s`);
        reconnectRef.current = setTimeout(() => {
          if (configRef.current) connect(configRef.current);
        }, reconnectDelay.current);
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, RECONNECT_MAX);
      };
    },
    [addLog, startHeartbeat, stopHeartbeat, startUptimeCounter, stopUptimeCounter],
  );

  // ── Provisioning ─────────────────────────────────────────────────────────────

  const provision = useCallback(
    async (cfg: ProvisionConfig) => {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
      setConfig(cfg);
      connect(cfg);
    },
    [connect],
  );

  const unprovision = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    stopHeartbeat();
    stopUptimeCounter();
    setConfig(null);
    setStatus('disconnected');
    setLogs([]);
    setSmsTasks([]);
    smsTasksRef.current = [];
    processingRef.current.clear();
    setSentCount(0);
    setFailedCount(0);
    addLog('info', 'Device unprovisioned');
  }, [stopHeartbeat, stopUptimeCounter, addLog]);

  // Load persisted config on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const cfg: ProvisionConfig = JSON.parse(raw);
          setConfig(cfg);
          connect(cfg);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      stopHeartbeat();
      stopUptimeCounter();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── SMS Task Processing ───────────────────────────────────────────────────────

  const processSmsTask = useCallback(
    async (messageId: number) => {
      // Prevent duplicate concurrent sends for the same message
      if (processingRef.current.has(messageId)) return;

      // Read the task from the ref (always current) and guard non-pending tasks
      const task = smsTasksRef.current.find((t) => t.messageId === messageId);
      if (!task || task.status !== 'pending') return;

      processingRef.current.add(messageId);

      // Mark as sending atomically
      setSmsTasks((prev) => {
        const next = prev.map((t) =>
          t.messageId === messageId ? { ...t, status: 'sending' as const } : t,
        );
        smsTasksRef.current = next;
        return next;
      });

      try {
        const available = await SMS.isAvailableAsync();
        if (!available) {
          throw new Error('SMS not available on this device');
        }
        const { result } = await SMS.sendSMSAsync([task.phone], task.text);
        if (result === 'sent' || result === 'unknown') {
          sendWs({ type: 'sms.result', messageId, status: 'SENT' });
          setSentCount((n) => n + 1);
          setSmsTasks((prev) => {
            const next = prev.map((t) =>
              t.messageId === messageId ? { ...t, status: 'sent' as const } : t,
            );
            smsTasksRef.current = next;
            return next;
          });
          addLog('success', `SMS sent to ${task.phone}`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          throw new Error('SMS cancelled by user');
        }
      } catch (err: unknown) {
        const reason = err instanceof Error ? err.message : 'Unknown error';
        sendWs({ type: 'sms.result', messageId, status: 'FAILED', reason });
        setFailedCount((n) => n + 1);
        setSmsTasks((prev) => {
          const next = prev.map((t) =>
            t.messageId === messageId ? { ...t, status: 'failed' as const } : t,
          );
          smsTasksRef.current = next;
          return next;
        });
        addLog('error', `SMS failed to ${task.phone}: ${reason}`);
      } finally {
        processingRef.current.delete(messageId);
      }
    },
    [sendWs, addLog],
  );

  // Keep processSmsTaskRef up-to-date so the ws.onmessage auto-trigger always calls
  // the latest version without capturing a stale closure
  processSmsTaskRef.current = processSmsTask;

  return (
    <GatewayContext.Provider
      value={{
        config,
        status,
        battery,
        signal,
        sentCount,
        failedCount,
        logs,
        smsTasks,
        uptime,
        provision,
        unprovision,
        processSmsTask,
      }}
    >
      {children}
    </GatewayContext.Provider>
  );
}
