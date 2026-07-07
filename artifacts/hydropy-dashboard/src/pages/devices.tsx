import React, { useState } from 'react';
import { useListDevices, useCreateDevice, useDeleteDevice, useDisconnectDevice, getListDevicesQueryKey, useGetDeviceQr } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'wouter';
import { format } from 'date-fns';
import { Smartphone, Plus, Trash2, PowerOff, ShieldAlert, Cpu, Battery, Signal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeviceStatusBadge } from '@/components/status-badges';

export default function Devices() {
  const queryClient = useQueryClient();
  const { data: devices, isLoading } = useListDevices(undefined, { query: { refetchInterval: 3000 } });
  const createDevice = useCreateDevice();
  const deleteDevice = useDeleteDevice();
  const disconnectDevice = useDisconnectDevice();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [pairedDeviceId, setPairedDeviceId] = useState<number | null>(null);

  const { data: qrData } = useGetDeviceQr(pairedDeviceId!, { 
    query: { enabled: !!pairedDeviceId }
  });

  const handleAddDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceName.trim()) return;
    
    createDevice.mutate({ data: { deviceName: newDeviceName } }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
        setPairedDeviceId(res.id);
        setNewDeviceName('');
      }
    });
  };

  const handleCloseModal = () => {
    setIsAddOpen(false);
    setPairedDeviceId(null);
  };

  const handleDelete = (id: number) => {
    if (confirm('Delete this device? This will revoke access permanently.')) {
      deleteDevice.mutate({ deviceId: id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() })
      });
    }
  };

  const handleDisconnect = (id: number) => {
    if (confirm('Force disconnect this device?')) {
      disconnectDevice.mutate({ deviceId: id }, {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() })
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">NODE_FLEET</h1>
        <Button onClick={() => setIsAddOpen(true)} className="font-mono text-xs tracking-wider">
          <Plus className="w-4 h-4 mr-2" />
          PROVISION_NODE
        </Button>
      </div>

      <div className="border border-border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-mono text-xs uppercase">Node ID</TableHead>
              <TableHead className="font-mono text-xs uppercase">Status</TableHead>
              <TableHead className="font-mono text-xs uppercase">Telemetry</TableHead>
              <TableHead className="font-mono text-xs uppercase">Specs</TableHead>
              <TableHead className="font-mono text-xs uppercase">Last Ping</TableHead>
              <TableHead className="font-mono text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {devices?.map((device) => (
              <TableRow key={device.id}>
                <TableCell>
                  <Link href={`/devices/${device.id}`} className="font-mono text-sm font-medium text-primary hover:underline">
                    {device.deviceName}
                  </Link>
                  <div className="text-[10px] font-mono text-muted-foreground mt-1">ID: {device.id}</div>
                </TableCell>
                <TableCell>
                  <DeviceStatusBadge status={device.status} />
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1 text-xs font-mono text-muted-foreground">
                    <span className="flex items-center"><Battery className="w-3 h-3 mr-1.5 text-zinc-500" /> {device.battery ?? 'N/A'}%</span>
                    <span className="flex items-center"><Signal className="w-3 h-3 mr-1.5 text-zinc-500" /> {device.signal ?? 'N/A'}%</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col space-y-1 text-xs font-mono text-muted-foreground">
                    <span className="flex items-center"><Cpu className="w-3 h-3 mr-1.5 text-zinc-500" /> {device.model || 'Unknown'}</span>
                    <span className="flex items-center"><Smartphone className="w-3 h-3 mr-1.5 text-zinc-500" /> Android {device.androidVersion || '-'}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {device.lastHeartbeat ? format(new Date(device.lastHeartbeat), 'MM/dd HH:mm:ss') : 'Never'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Force Disconnect" onClick={() => handleDisconnect(device.id)}>
                      <PowerOff className="w-3.5 h-3.5 text-amber-500" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" title="Delete Device" onClick={() => handleDelete(device.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {devices?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono text-sm">
                  NO_NODES_FOUND
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAddOpen} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono tracking-tight uppercase">Provision New Node</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {pairedDeviceId ? 'Scan this code with the HYDROPY Android App to authenticate.' : 'Enter a unique identifier for the new device.'}
            </DialogDescription>
          </DialogHeader>

          {!pairedDeviceId ? (
            <form onSubmit={handleAddDevice} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground uppercase">Node Identifier</label>
                <Input 
                  value={newDeviceName} 
                  onChange={(e) => setNewDeviceName(e.target.value)} 
                  placeholder="e.g. gateway-alpha-01" 
                  className="font-mono bg-background"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full font-mono uppercase" disabled={createDevice.isPending}>
                {createDevice.isPending ? 'Generating...' : 'Generate Auth Token'}
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
              <div className="bg-white p-4 rounded-md shadow-sm">
                {qrData ? (
                  <QRCodeSVG value={qrData.qrData} size={200} level="H" />
                ) : (
                  <div className="w-[200px] h-[200px] flex items-center justify-center text-muted-foreground font-mono text-xs bg-zinc-100">
                    GENERATING...
                  </div>
                )}
              </div>
              <div className="bg-amber-500/10 text-amber-500 border border-amber-500/20 p-3 flex items-start gap-3 rounded-sm text-sm">
                <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="font-mono text-xs leading-relaxed">This QR code contains sensitive authentication tokens. Do not share it. It will expire after first use.</p>
              </div>
              <Button onClick={handleCloseModal} variant="outline" className="w-full font-mono uppercase">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}