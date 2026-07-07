import React from 'react';
import {
  useGetDashboardStats,
  useGetMessagesOverTime,
  useListDevices,
  useListCampaigns,
} from '@workspace/api-client-react';
import type { Device, Campaign } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Smartphone, Zap, AlertTriangle, Send, Clock, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { DeviceStatusBadge, CampaignStatusBadge } from '@/components/status-badges';
import { format, formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';

function StatCard({
  title,
  value,
  icon: Icon,
  valueClass = '',
  subtitle,
}: {
  title: string;
  value: number | undefined;
  icon: React.ComponentType<{ className?: string }>;
  valueClass?: string;
  subtitle?: string;
}) {
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
        <CardTitle className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className={`text-3xl font-mono font-bold tabular-nums ${valueClass}`}>
          {value !== undefined ? value.toLocaleString() : <span className="text-muted-foreground/40">—</span>}
        </div>
        {subtitle && <p className="text-[10px] font-mono text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(var(--card))',
  borderColor: 'hsl(var(--border))',
  fontFamily: 'var(--font-mono)',
  fontSize: '11px',
  borderRadius: '4px',
};

export default function Dashboard() {
  const { data: stats } = useGetDashboardStats({ query: { refetchInterval: 4000 } });
  const { data: chartData } = useGetMessagesOverTime({ query: { refetchInterval: 30000 } });
  const { data: devices } = useListDevices(undefined, { query: { refetchInterval: 4000 } });
  const { data: campaigns } = useListCampaigns(undefined, { query: { refetchInterval: 5000 } });

  const activeCampaigns = campaigns?.filter(c => c.status === 'RUNNING' || c.status === 'PAUSED') ?? [];

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">SYSTEM_OVERVIEW</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {format(new Date(), 'yyyy-MM-dd HH:mm')} · auto-refreshing
          </p>
        </div>
        <div className="flex items-center text-xs font-mono text-primary bg-primary/10 px-3 py-1.5 rounded-sm border border-primary/20 gap-1.5">
          <Activity className="w-3 h-3 animate-pulse" />
          LIVE
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Total Fleet"    value={stats?.totalDevices}        icon={Smartphone} />
        <StatCard title="Online Nodes"   value={stats?.onlineDevices}       icon={Zap}         valueClass="text-emerald-400" />
        <StatCard title="Active Pipelines" value={stats?.activeCampaigns}  icon={Activity} />
        <StatCard title="Messages Sent"  value={stats?.totalMessagesSent}   icon={Send}        valueClass="text-emerald-400" />
        <StatCard title="Queued"         value={stats?.totalMessagesQueued} icon={Clock} />
        <StatCard title="Failed"         value={stats?.totalMessagesFailed} icon={AlertTriangle} valueClass="text-red-400" />
      </div>

      {/* Charts + node list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Throughput chart */}
        <Card className="col-span-1 lg:col-span-2 bg-card border-border">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Throughput — Last 7 Days
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px] pt-4">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(val) => format(new Date(val + 'T00:00:00'), 'MMM d')}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={10}
                    fontFamily="var(--font-mono)"
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    labelFormatter={(val) => format(new Date(val + 'T00:00:00'), 'MMMM d, yyyy')}
                    cursor={{ fill: 'hsl(var(--accent))' }}
                  />
                  <Bar dataKey="sent"   name="Sent"   fill="hsl(var(--primary))"     radius={[2, 2, 0, 0]} />
                  <Bar dataKey="failed" name="Failed" fill="hsl(var(--destructive))"  radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground font-mono text-sm">
                {chartData ? 'NO_DATA_YET' : 'LOADING_TELEMETRY...'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Node status panel */}
        <Card className="col-span-1 bg-card border-border flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Node Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            {!devices || devices.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm font-mono">
                <Smartphone className="w-8 h-8 mx-auto mb-2 opacity-20" />
                No devices provisioned.{' '}
                <Link href="/devices" className="text-primary hover:underline">Add one →</Link>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {devices.map(device => (
                  <Link key={device.id} href={`/devices/${device.id}`}>
                    <div className="p-3 flex items-center justify-between hover:bg-accent/40 transition-colors cursor-pointer">
                      <div className="flex flex-col min-w-0 flex-1 mr-2">
                        <span className="font-mono text-xs font-semibold text-foreground truncate">{device.deviceName}</span>
                        <div className="flex items-center text-[10px] text-muted-foreground mt-0.5 gap-2">
                          {device.battery != null && <span>🔋 {device.battery}%</span>}
                          {device.signal != null && <span>📶 {device.signal}%</span>}
                          {device.lastHeartbeat && (
                            <span>{formatDistanceToNow(new Date(device.lastHeartbeat), { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                      <DeviceStatusBadge status={device.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active campaigns */}
      {activeCampaigns.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border pb-3">
            <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
              Active Pipelines
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border">
            {activeCampaigns.map(c => {
              const processed = c.sent + c.failed;
              const pct = c.totalMessages > 0 ? Math.round((processed / c.totalMessages) * 100) : 0;
              return (
                <Link key={c.id} href={`/campaigns/${c.id}`}>
                  <div className="px-4 py-3 flex items-center gap-4 hover:bg-accent/40 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold text-foreground truncate">{c.name}</span>
                        <CampaignStatusBadge status={c.status} />
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-mono font-bold text-foreground">{pct}%</div>
                      <div className="text-[10px] font-mono text-muted-foreground">{processed}/{c.totalMessages}</div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-0.5">
                      <div className="text-[10px] font-mono text-emerald-400">{c.sent} sent</div>
                      <div className="text-[10px] font-mono text-red-400">{c.failed} failed</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
