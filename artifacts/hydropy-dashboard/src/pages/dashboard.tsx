import React from 'react';
import { useGetDashboardStats, useGetMessagesOverTime, useListDevices } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Smartphone, Signal, Battery, Zap, AlertTriangle, Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DeviceStatusBadge } from '@/components/status-badges';
import { format } from 'date-fns';

export default function Dashboard() {
  const { data: stats } = useGetDashboardStats({ query: { refetchInterval: 3000 } });
  const { data: chartData } = useGetMessagesOverTime();
  const { data: devices } = useListDevices(undefined, { query: { refetchInterval: 3000 } });

  const StatCard = ({ title, value, icon: Icon, valueClass = "" }: any) => (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-mono text-muted-foreground uppercase">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-mono font-bold ${valueClass}`}>
          {value !== undefined ? value.toLocaleString() : '-'}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">SYSTEM_OVERVIEW</h1>
        <div className="flex items-center text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded-sm border border-primary/20">
          <Activity className="w-3 h-3 mr-2 animate-pulse" />
          LIVE
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard title="Total Fleet" value={stats?.totalDevices} icon={Smartphone} />
        <StatCard title="Online Nodes" value={stats?.onlineDevices} icon={Zap} valueClass="text-emerald-400" />
        <StatCard title="Active Campaigns" value={stats?.activeCampaigns} icon={Activity} />
        <StatCard title="Sent Today" value={stats?.totalMessagesSent} icon={Send} />
        <StatCard title="Queued" value={stats?.totalMessagesQueued} icon={Activity} />
        <StatCard title="Failed" value={stats?.totalMessagesFailed} icon={AlertTriangle} valueClass="text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase">Throughput (7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {chartData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => format(new Date(val), 'MMM dd')} 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    fontFamily="var(--font-mono)" 
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    fontFamily="var(--font-mono)" 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar dataKey="sent" name="Sent" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="failed" name="Failed" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono text-sm">
                LOADING_TELEMETRY...
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 bg-card border-border flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase">Node Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto h-[250px]">
            {devices?.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm font-mono">No devices provisioned.</div>
            ) : (
              <div className="divide-y divide-border">
                {devices?.map(device => (
                  <div key={device.id} className="p-3 flex items-center justify-between hover:bg-accent/50 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-mono text-sm text-foreground">{device.deviceName}</span>
                      <div className="flex items-center text-xs text-muted-foreground mt-1 space-x-3">
                        <span className="flex items-center"><Battery className="w-3 h-3 mr-1" /> {device.battery ?? '-'}%</span>
                        <span className="flex items-center"><Signal className="w-3 h-3 mr-1" /> {device.signal ?? '-'}%</span>
                      </div>
                    </div>
                    <DeviceStatusBadge status={device.status} />
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