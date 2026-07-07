import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetDashboardStatsQueryKey,
  getListDevicesQueryKey,
  getListCampaignsQueryKey,
  getGetMessagesOverTimeQueryKey,
} from '@workspace/api-client-react';

type WsEvent = {
  type: string;
  [key: string]: unknown;
};

type WsEventHandler = (event: WsEvent) => void;

const WS_RECONNECT_DELAY_MS = 3000;

/**
 * Connects to the HYDROPY WebSocket server and invalidates the relevant
 * TanStack Query caches whenever a real-time event arrives from the server.
 *
 * Returns a `sendMessage` helper so callers can also push messages to the server.
 */
export function useHydropyWebSocket(onEvent?: WsEventHandler) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEventRef = useRef<WsEventHandler | undefined>(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) return;

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/api/ws?type=dashboard`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      // Clear any pending reconnect timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    ws.onmessage = (e) => {
      let event: WsEvent;
      try {
        event = JSON.parse(e.data as string) as WsEvent;
      } catch {
        return;
      }

      // Bubble to caller (e.g. for toast notifications)
      onEventRef.current?.(event);

      // Invalidate the relevant queries so the UI refreshes automatically
      const statsKey = getGetDashboardStatsQueryKey();
      const devicesKey = getListDevicesQueryKey();
      const campaignsKey = getListCampaignsQueryKey();
      const overTimeKey = getGetMessagesOverTimeQueryKey();

      switch (event.type) {
        case 'device.connected':
        case 'device.heartbeat':
        case 'device.offline':
          queryClient.invalidateQueries({ queryKey: devicesKey });
          queryClient.invalidateQueries({ queryKey: statsKey });
          break;

        case 'campaign.started':
        case 'campaign.completed':
        case 'campaign.cancelled':
          queryClient.invalidateQueries({ queryKey: campaignsKey });
          queryClient.invalidateQueries({ queryKey: statsKey });
          break;

        case 'sms.new':
        case 'sms.sent':
        case 'sms.failed':
          queryClient.invalidateQueries({ queryKey: campaignsKey });
          queryClient.invalidateQueries({ queryKey: statsKey });
          queryClient.invalidateQueries({ queryKey: overTimeKey });
          // Also invalidate message lists (any key starting with /api/messages)
          queryClient.invalidateQueries({
            predicate: (q) => {
              const key = q.queryKey[0];
              return typeof key === 'string' && key.startsWith('/api/messages');
            },
          });
          break;
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      // Schedule reconnect
      reconnectTimerRef.current = setTimeout(connect, WS_RECONNECT_DELAY_MS);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [queryClient]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  const sendMessage = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { sendMessage };
}
