import React, { useState } from 'react';
import {
  useListDevices,
  useCreateDevice,
  useDeleteDevice,
  useDisconnectDevice,
  getListDevicesQueryKey,
  useGetDeviceQr,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import {
  Smartphone, Plus, Trash2, PowerOff, ShieldAlert, Cpu,
  Battery, Signal, ArrowLeft, RefreshCw, Wifi, WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeviceStatusBadge } from '@/components/status-badges';
import { Badge } from '@/components/ui/badge';

function BatteryBar({ value }: { value: number | null | undefined }) {
  const pct = value ?? 0;
  const color = pct > 60 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <Battery className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8">{value ?? '—'}%</span>
    </div>
  );
}

function SignalBar({ value }: { value: number | null | undefined }) {
  const pct = value ?? 0;
  const color = pct > 60 ? 'bg-emerald-500' : pct > 25 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <Signal className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8">{value ?? '—'}%</span>
    </div>
  );
}

export default function Devices() {
  const queryClient = useQueryClient();
  const { data: devices, isLoading, isError, refetch } = useListDevices(undefined, {
    query: { refetchInterval: 3000 },
  });
  const createDevice = useCreateDevice();
  const deleteDevice = useDeleteDevice();
  const disconnectDevice = useDisconnectDevice();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [nameError, setNameError] = useState('');
  const [pairedDeviceId, setPairedDeviceId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: qrData, isLoading: qrLoading } = useGetDeviceQr(pairedDeviceId!, {
    query: { enabled: !!pairedDeviceId },
  });

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newDeviceName.trim();
    if (!name) { setNameError('Node identifier is required'); return; }
    if (name.length < 3) { setNameError('Must be at least 3 characters'); return; }
    setNameError('');

    createDevice.mutate({ data: { deviceName: name } }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
        setPairedDeviceId(res.id);
        setNewDeviceName('');
      },
      onError: () => {
        setNameError('Failed to create device. Try again.');
      },
    });
  };

  const handleCloseModal = () => {
    setIsAddOpen(false);
    setPairedDeviceId(null);
    setNewDeviceName('');
    setNameError('');
  };

  const handleBack = () => {
    setPairedDeviceId(null);
    setNewDeviceName('');
    setNameError('');
  };

  const handleDelete = (id: number, name: string) => {
    if (!confirm(`Delete "${name}"? This permanently revokes device access.`)) return;
    setActionError(null);
    deleteDevice.mutate({ deviceId: id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() }),
      onError: () => setActionError(`Failed to delete device ${id}`),
    });
  };

  const handleDisconnect = (id: number, name: string) => {
    if (!confirm(`Force disconnect "${name}"?`)) return;
    setActionError(null);
    disconnectDevice.mutate({ deviceId: id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() }),
      onError: () => setActionError(`Failed to disconnect device ${id}`),
    });
  };

  const onlineCount = devices?.filter(d => d.status === 'ONLINE' || d.status === 'BUSY').length ?? 0;
  const totalCount = devices?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">NODE_FLEET</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {isLoading ? 'Scanning...' : `${onlineCount} online · ${totalCount} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="font-mono text-xs h-8">
            <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
          </Button>
          <Button onClick={() => setIsAddOpen(true)} className="font-mono text-xs tracking-wider">
            <Plus className="w-4 h-4 mr-2" /> PROVISION NODE
          </Button>
        </div>
      </div>

      {/* Action error banner */}
      {actionError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono px-4 py-2 rounded-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-4 hover:opacity-70">✕</button>
        </div>
      )}

      {/* Fleet table */}
      <div className="border border-border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-mono text-xs uppercase">Node</TableHead>
              <TableHead className="font-mono text-xs uppercase">Status</TableHead>
              <TableHead className="font-mono text-xs uppercase">Battery</TableHead>
              <TableHead className="font-mono text-xs uppercase">Signal</TableHead>
              <TableHead className="font-mono text-xs uppercase">Hardware</TableHead>
              <TableHead className="font-mono text-xs uppercase">Last Ping</TableHead>
              <TableHead className="font-mono text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground font-mono text-sm">
                  SCANNING_FLEET...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-destructive font-mono text-sm">
                  ERR: FAILED TO LOAD FLEET — check API server
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && devices?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-mono text-sm">
                  <Smartphone className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <div>NO_NODES_PROVISIONED</div>
                  <div className="text-xs mt-1 opacity-60">Click "PROVISION NODE" to add your first gateway device</div>
                </TableCell>
              </TableRow>
            )}
            {devices?.map((device) => (
              <TableRow key={device.id} className="hover:bg-muted/20 transition-colors">
                <TableCell>
                  <Link
                    href={`/devices/${device.id}`}
                    className="font-mono text-sm font-semibold text-primary hover:underline"
                  >
                    {device.deviceName}
                  </Link>
                  <div className="text-[10px] font-mono text-muted-foreground mt-0.5">#{device.id}</div>
                </TableCell>
                <TableCell>
                  <DeviceStatusBadge status={device.status} />
                </TableCell>
                <TableCell>
                  <BatteryBar value={device.battery} />
                </TableCell>
                <TableCell>
                  <SignalBar value={device.signal} />
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5 text-xs font-mono text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3 h-3" />
                      {device.model || 'Unknown'}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Smartphone className="w-3 h-3" />
                      Android {device.androidVersion || '—'}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {device.lastHeartbeat
                    ? format(new Date(device.lastHeartbeat), 'MM/dd HH:mm:ss')
                    : <span className="text-muted-foreground/50">Never</span>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 font-mono text-[10px] gap-1"
                      title="View details"
                      asChild
                    >
                      <Link href={`/devices/${device.id}`}>Detail</Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Force Disconnect"
                      onClick={() => handleDisconnect(device.id, device.deviceName)}
                      disabled={device.status === 'OFFLINE' || device.status === 'NEW' || device.status === 'PENDING_CONNECTION'}
                    >
                      <PowerOff className="w-3.5 h-3.5 text-amber-500" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 w-7 p-0 hover:bg-destructive/10 hover:border-destructive"
                      title="Delete Device"
                      onClick={() => handleDelete(device.id, device.deviceName)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Provision modal */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) handleCloseModal(); }}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono tracking-tight uppercase">
              {pairedDeviceId ? 'Scan to Connect' : 'Provision New Node'}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {pairedDeviceId
                ? 'Scan this QR code with the HYDROPY Android App to pair the device.'
                : 'Enter a unique identifier for the new gateway device.'}
            </DialogDescription>
          </DialogHeader>

          {!pairedDeviceId ? (
            <form onSubmit={handleAddDevice} className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Node Identifier</label>
                <Input
                  value={newDeviceName}
                  onChange={(e) => { setNewDeviceName(e.target.value); setNameError(''); }}
                  placeholder="e.g. gateway-alpha-01"
                  className="font-mono bg-background"
                  autoFocus
                />
                {nameError && (
                  <p className="text-xs text-destructive font-mono">{nameError}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 font-mono text-xs" onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 font-mono text-xs uppercase" disabled={createDevice.isPending}>
                  {createDevice.isPending ? 'Generating...' : 'Generate QR Code'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col items-center py-4 space-y-5">
              {/* QR code */}
              <div className="bg-white p-4 rounded-md shadow-sm">
                {qrLoading ? (
                  <div className="w-[200px] h-[200px] flex items-center justify-center text-zinc-400 font-mono text-xs bg-zinc-100">
                    LOADING...
                  </div>
                ) : qrData ? (
                  <QRCodeSVG value={qrData.qrData} size={200} level="H" />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center text-red-400 font-mono text-xs bg-zinc-100">
                    QR ERROR
                  </div>
                )}
              </div>

              {/* Manual-entry credentials */}
              {qrData && (() => {
                let parsed: { serverUrl?: string; token?: string; deviceId?: number } = {};
                try { parsed = JSON.parse(qrData.qrData); } catch { /* ignore */ }
                return (
                  <div className="w-full space-y-2">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                      Manual Entry Credentials
                    </div>
                    {[
                      { label: 'Server URL', value: parsed.serverUrl ?? '' },
                      { label: 'Device ID', value: String(parsed.deviceId ?? '') },
                      { label: 'Token', value: parsed.token ?? '' },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-muted/30 border border-border rounded-sm px-3 py-2">
                        <div className="text-[9px] font-mono text-muted-foreground uppercase mb-0.5">{label}</div>
                        <div className="flex items-center gap-2">
                          <code className="text-[11px] font-mono text-primary break-all flex-1">{value}</code>
                          <button
                            onClick={() => navigator.clipboard.writeText(value)}
                            className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
                            title="Copy"
                          >
                            <RefreshCw className="w-3 h-3" style={{ display: 'none' }} />
                            <Wifi className="w-3 h-3" style={{ display: 'none' }} />
                            <WifiOff className="w-3 h-3" style={{ display: 'none' }} />
                            📋
                          </button>
                        </div>
                      </div>
                    ))}
                    <p className="text-[10px] font-mono text-muted-foreground leading-relaxed">
                      In the Gateway app → MANUAL ENTRY → Paste JSON, copy this whole payload:
                    </p>
                    <code className="block text-[10px] font-mono text-primary break-all bg-muted/30 border border-border rounded-sm px-3 py-2">
                      {qrData.qrData}
                    </code>
                  </div>
                );
              })()}

              {/* Security notice */}
              <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-3 flex items-start gap-3 rounded-sm w-full">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="font-mono text-xs leading-relaxed">
                  Keep this token private — it gives full device access. Generate a new QR if compromised.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1 font-mono text-xs" onClick={handleBack}>
                  <ArrowLeft className="w-3 h-3 mr-1.5" /> Back
                </Button>
                <Button className="flex-1 font-mono text-xs" onClick={handleCloseModal}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
