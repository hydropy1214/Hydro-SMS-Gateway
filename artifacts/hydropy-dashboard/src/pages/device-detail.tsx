import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import {
  useGetDevice,
  useListSimCards,
  useDeleteDevice,
  useDisconnectDevice,
  getListDevicesQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft, Smartphone, Cpu, Activity, Signal, Battery,
  CreditCard, PowerOff, Trash2, AlertCircle, RefreshCw,
} from 'lucide-react';
import { DeviceStatusBadge } from '@/components/status-badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground font-mono uppercase mb-1 flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
      <div className="font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}

export default function DeviceDetail() {
  const { deviceId } = useParams();
  const id = parseInt(deviceId || '0', 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: device, isLoading, isError, refetch } = useGetDevice(id, {
    query: { enabled: id > 0, refetchInterval: 5000 },
  });
  const { data: simCards, isLoading: loadingSims } = useListSimCards(id, {
    query: { enabled: id > 0 },
  });

  const deleteDevice = useDeleteDevice();
  const disconnectDevice = useDisconnectDevice();
  const [actionError, setActionError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!device || !confirm(`Delete "${device.deviceName}"? This permanently revokes device access.`)) return;
    setActionError(null);
    deleteDevice.mutate({ deviceId: id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
        setLocation('/devices');
      },
      onError: () => setActionError('Failed to delete device. Try again.'),
    });
  };

  const handleDisconnect = () => {
    if (!device || !confirm(`Force disconnect "${device.deviceName}"?`)) return;
    setActionError(null);
    disconnectDevice.mutate({ deviceId: id }, {
      onSuccess: () => {
        refetch();
        queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
      },
      onError: () => setActionError('Failed to disconnect device. Try again.'),
    });
  };

  if (!id || id <= 0) {
    return (
      <div className="space-y-4">
        <Link href="/devices" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-mono">
          <ArrowLeft className="w-4 h-4" /> Back to Fleet
        </Link>
        <div className="text-destructive font-mono text-sm">ERR: INVALID_NODE_ID</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Link href="/devices" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-mono">
          <ArrowLeft className="w-4 h-4" /> Back to Fleet
        </Link>
        <div className="font-mono text-muted-foreground text-sm animate-pulse">LOADING_NODE_DATA...</div>
      </div>
    );
  }

  if (isError || !device) {
    return (
      <div className="space-y-4">
        <Link href="/devices" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-sm font-mono">
          <ArrowLeft className="w-4 h-4" /> Back to Fleet
        </Link>
        <div className="text-destructive font-mono text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> ERR: NODE_NOT_FOUND (ID: {id})
        </div>
      </div>
    );
  }

  const isOnline = device.status === 'ONLINE' || device.status === 'BUSY';
  const canDisconnect = isOnline || device.status === 'CONNECTED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <Link href="/devices" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-xs font-mono transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> FLEET
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-3">
              {device.deviceName}
              <DeviceStatusBadge status={device.status} />
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              ID: {device.id} · Registered {format(new Date(device.createdAt), 'yyyy-MM-dd')}
              {device.lastHeartbeat && (
                <> · Last ping {formatDistanceToNow(new Date(device.lastHeartbeat), { addSuffix: true })}</>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="font-mono text-xs h-8">
            <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={!canDisconnect || disconnectDevice.isPending}
            className="font-mono text-xs h-8 border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
          >
            <PowerOff className="w-3 h-3 mr-1.5" />
            {disconnectDevice.isPending ? 'Disconnecting...' : 'Disconnect'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleteDevice.isPending}
            className="font-mono text-xs h-8 border-destructive/30 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3 h-3 mr-1.5" />
            {deleteDevice.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      {actionError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono px-4 py-2 rounded-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-4 hover:opacity-70">✕</button>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hardware */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-2">
              <Cpu className="w-4 h-4" /> Hardware Specs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Metric label="Model" value={device.model || 'Unknown'} />
            <Metric label="OS Version" value={`Android ${device.androidVersion || 'Unknown'}`} />
            <Metric label="Agent Version" value={device.appVersion || 'Unknown'} />
          </CardContent>
        </Card>

        {/* Telemetry */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-2">
              <Activity className="w-4 h-4" /> Telemetry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground font-mono uppercase mb-2 flex items-center gap-1">
                <Battery className="w-3 h-3" /> Battery
              </div>
              {device.battery != null ? (
                <div className="space-y-1">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${device.battery > 60 ? 'bg-emerald-500' : device.battery > 25 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${device.battery}%` }}
                    />
                  </div>
                  <div className="font-mono text-sm text-foreground">{device.battery}%</div>
                </div>
              ) : (
                <div className="font-mono text-sm text-muted-foreground">No Data</div>
              )}
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono uppercase mb-2 flex items-center gap-1">
                <Signal className="w-3 h-3" /> Signal
              </div>
              {device.signal != null ? (
                <div className="space-y-1">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${device.signal > 60 ? 'bg-emerald-500' : device.signal > 25 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${device.signal}%` }}
                    />
                  </div>
                  <div className="font-mono text-sm text-foreground">{device.signal}%</div>
                </div>
              ) : (
                <div className="font-mono text-sm text-muted-foreground">No Data</div>
              )}
            </div>
            <Metric
              label="Last Heartbeat"
              value={device.lastHeartbeat
                ? format(new Date(device.lastHeartbeat), 'yyyy-MM-dd HH:mm:ss')
                : 'Never'}
            />
          </CardContent>
        </Card>

        {/* SIM Cards */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> SIM Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSims ? (
              <div className="text-xs font-mono text-muted-foreground animate-pulse">SCANNING_SLOTS...</div>
            ) : !simCards || simCards.length === 0 ? (
              <div className="text-center py-4">
                <CreditCard className="w-6 h-6 mx-auto mb-2 opacity-20" />
                <div className="text-xs font-mono text-muted-foreground">NO_SIMS_DETECTED</div>
                <div className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                  SIMs are reported by the Android app on connect
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {simCards.map((sim) => (
                  <div key={sim.id} className="border border-border p-3 rounded-sm bg-muted/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-mono font-bold text-foreground">SLOT {sim.slot}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${
                        sim.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}>
                        {sim.status}
                      </span>
                    </div>
                    <div className="text-sm font-mono text-primary">{sim.phoneNumber || 'Unknown Number'}</div>
                    <div className="text-xs font-mono text-muted-foreground uppercase mt-0.5">
                      {sim.carrier || 'Unknown Carrier'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
