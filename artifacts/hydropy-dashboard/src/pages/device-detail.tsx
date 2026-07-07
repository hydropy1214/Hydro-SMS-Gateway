import React from 'react';
import { useParams, Link } from 'wouter';
import { useGetDevice, useListSimCards } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { ArrowLeft, Smartphone, Cpu, Activity, Signal, Battery, CreditCard } from 'lucide-react';
import { DeviceStatusBadge } from '@/components/status-badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DeviceDetail() {
  const { deviceId } = useParams();
  const id = parseInt(deviceId || '0', 10);

  const { data: device, isLoading: loadingDevice } = useGetDevice(id, { query: { enabled: !!id } });
  const { data: simCards, isLoading: loadingSims } = useListSimCards(id, { query: { enabled: !!id } });

  if (loadingDevice) return <div className="font-mono text-muted-foreground text-sm">LOADING_NODE_DATA...</div>;
  if (!device) return <div className="font-mono text-red-500 text-sm">ERROR: NODE_NOT_FOUND</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/devices" className="text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-3">
            {device.deviceName}
            <DeviceStatusBadge status={device.status} />
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">ID: {device.id} • Registered {format(new Date(device.createdAt), 'yyyy-MM-dd')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center">
              <Cpu className="w-4 h-4 mr-2" /> Hardware Specs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Model</div>
              <div className="font-mono text-sm text-foreground">{device.model || 'Unknown'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono uppercase mb-1">OS Version</div>
              <div className="font-mono text-sm text-foreground">Android {device.androidVersion || 'Unknown'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Agent Version</div>
              <div className="font-mono text-sm text-foreground">{device.appVersion || 'Unknown'}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center">
              <Activity className="w-4 h-4 mr-2" /> Telemetry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground font-mono uppercase mb-1 flex items-center">
                <Battery className="w-3 h-3 mr-1" /> Battery Level
              </div>
              <div className="font-mono text-sm text-foreground">{device.battery !== null ? `${device.battery}%` : 'No Data'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono uppercase mb-1 flex items-center">
                <Signal className="w-3 h-3 mr-1" /> Signal Strength
              </div>
              <div className="font-mono text-sm text-foreground">{device.signal !== null ? `${device.signal}%` : 'No Data'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Last Heartbeat</div>
              <div className="font-mono text-sm text-foreground">{device.lastHeartbeat ? format(new Date(device.lastHeartbeat), 'yyyy-MM-dd HH:mm:ss') : 'Never'}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center">
              <CreditCard className="w-4 h-4 mr-2" /> SIM Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSims ? (
              <div className="text-xs font-mono text-muted-foreground">SCANNING_SLOTS...</div>
            ) : simCards?.length === 0 ? (
              <div className="text-xs font-mono text-muted-foreground">NO_SIMS_DETECTED</div>
            ) : (
              <div className="space-y-4">
                {simCards?.map((sim) => (
                  <div key={sim.id} className="border border-border p-3 rounded-sm bg-muted/20">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono font-bold text-foreground">SLOT {sim.slot}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 border rounded-sm ${
                        sim.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}>
                        {sim.status}
                      </span>
                    </div>
                    <div className="text-sm font-mono text-primary mb-1">{sim.phoneNumber || 'Unknown Number'}</div>
                    <div className="text-xs font-mono text-muted-foreground uppercase">{sim.carrier || 'Unknown Carrier'}</div>
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