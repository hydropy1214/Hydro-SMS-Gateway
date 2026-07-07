import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import {
  useGetCampaign,
  useGetCampaignReport,
  useListContacts,
  useStartCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useStopCampaign,
  useDeleteCampaign,
  getListCampaignsQueryKey,
  getGetCampaignQueryKey,
  getGetCampaignReportQueryKey,
} from '@workspace/api-client-react';
import type { Message, Contact } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft, Activity, Users, Send, AlertTriangle, FileText,
  CheckCircle2, Play, Pause, Square, Trash2, RefreshCw, Download,
} from 'lucide-react';
import { CampaignStatusBadge, MessageStatusBadge } from '@/components/status-badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const id = parseInt(campaignId || '0', 10);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: campaign, isLoading: loadingCamp, refetch: refetchCampaign } = useGetCampaign(id, {
    query: { enabled: !!id, refetchInterval: 5000 },
  });
  const { data: report, isLoading: loadingReport, refetch: refetchReport } = useGetCampaignReport(id, {
    query: { enabled: !!id, refetchInterval: 5000 },
  });
  const { data: contacts, isLoading: loadingContacts } = useListContacts(id, {
    query: { enabled: !!id },
  });

  const startCampaign = useStartCampaign();
  const pauseCampaign = usePauseCampaign();
  const resumeCampaign = useResumeCampaign();
  const stopCampaign = useStopCampaign();
  const deleteCampaign = useDeleteCampaign();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getGetCampaignReportQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });
  };

  const handleAction = (action: 'start' | 'pause' | 'resume' | 'stop' | 'delete') => {
    setActionError(null);
    const opts = {
      onSuccess: () => { invalidate(); refetchCampaign(); refetchReport(); },
      onError: (e: any) => setActionError(e?.message || `Failed to ${action} campaign`),
    };

    if (action === 'start') startCampaign.mutate({ campaignId: id }, opts);
    if (action === 'pause') pauseCampaign.mutate({ campaignId: id }, opts);
    if (action === 'resume') resumeCampaign.mutate({ campaignId: id }, opts);
    if (action === 'stop') {
      if (!confirm('Stop and cancel this campaign? All queued messages will be cancelled.')) return;
      stopCampaign.mutate({ campaignId: id }, opts);
    }
    if (action === 'delete') {
      if (!confirm('Delete this campaign permanently?')) return;
      deleteCampaign.mutate(
        { campaignId: id },
        { onSuccess: () => setLocation('/campaigns'), onError: () => setActionError('Failed to delete campaign') },
      );
    }
  };

  const isActioning = startCampaign.isPending || pauseCampaign.isPending || resumeCampaign.isPending || stopCampaign.isPending;

  // Export report as CSV
  const handleExportCsv = () => {
    if (!report?.messages) return;
    const header = 'ID,Recipient,Status,Device ID,Campaign ID,Sent At,Created At,Failure Reason';
    const rows = report.messages.map(m =>
      [m.id, m.recipient, m.status, m.deviceId ?? '', m.campaignId ?? '', m.sentAt ?? '', m.createdAt, m.failureReason ?? ''].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `campaign-${id}-report.csv`;
    a.click();
  };

  if (loadingCamp) {
    return (
      <div className="space-y-4">
        <Link href="/campaigns" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-xs font-mono">
          <ArrowLeft className="w-3.5 h-3.5" /> CAMPAIGNS
        </Link>
        <div className="font-mono text-muted-foreground text-sm animate-pulse">LOADING_PIPELINE...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Link href="/campaigns" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-xs font-mono">
          <ArrowLeft className="w-3.5 h-3.5" /> CAMPAIGNS
        </Link>
        <div className="font-mono text-red-500 text-sm">ERROR: PIPELINE_NOT_FOUND</div>
      </div>
    );
  }

  const processed = campaign.sent + campaign.failed;
  const progress = campaign.totalMessages > 0 ? (processed / campaign.totalMessages) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Link href="/campaigns" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary text-xs font-mono transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> CAMPAIGNS
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-3">
              {campaign.name}
              <CampaignStatusBadge status={campaign.status} />
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-1">
              ID: {campaign.id} · Created {format(new Date(campaign.createdAt), 'yyyy-MM-dd HH:mm')}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => { refetchCampaign(); refetchReport(); }} className="font-mono text-xs h-8">
            <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
          </Button>
          {campaign.status === 'DRAFT' && (
            <Button size="sm" onClick={() => handleAction('start')} disabled={isActioning} className="font-mono text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0">
              <Play className="w-3 h-3" /> Start
            </Button>
          )}
          {campaign.status === 'RUNNING' && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleAction('pause')} disabled={isActioning} className="font-mono text-xs h-8 gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
                <Pause className="w-3 h-3" /> Pause
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAction('stop')} disabled={isActioning} className="font-mono text-xs h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10">
                <Square className="w-3 h-3" /> Stop
              </Button>
            </>
          )}
          {campaign.status === 'PAUSED' && (
            <Button size="sm" onClick={() => handleAction('resume')} disabled={isActioning} className="font-mono text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-0">
              <Play className="w-3 h-3" /> Resume
            </Button>
          )}
          {report?.messages && report.messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="font-mono text-xs h-8 gap-1.5">
              <Download className="w-3 h-3" /> Export CSV
            </Button>
          )}
          <Button
            variant="outline" size="sm"
            onClick={() => handleAction('delete')}
            disabled={deleteCampaign.isPending}
            className="font-mono text-xs h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-3 h-3" /> Delete
          </Button>
        </div>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono px-4 py-2 rounded-sm flex items-center justify-between">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-4 hover:opacity-70">✕</button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="text-xs font-mono text-muted-foreground uppercase mb-1 flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Target Pool
            </div>
            <div className="text-2xl font-mono font-bold text-foreground">{campaign.totalMessages}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="text-xs font-mono text-muted-foreground uppercase mb-1 flex items-center gap-1.5">
              <Send className="w-3 h-3" /> Delivered
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-400">{campaign.sent}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="text-xs font-mono text-muted-foreground uppercase mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3 h-3" /> Failed
            </div>
            <div className="text-2xl font-mono font-bold text-red-400">{campaign.failed}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="text-xs font-mono text-muted-foreground uppercase mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3" /> Success Rate
            </div>
            <div className="text-2xl font-mono font-bold text-primary">
              {report ? `${report.successRate.toFixed(1)}%` : campaign.totalMessages > 0 ? `${((campaign.sent / campaign.totalMessages) * 100).toFixed(1)}%` : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center">
            <Activity className="w-4 h-4 mr-2" /> Execution Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex justify-between font-mono text-sm mb-2">
            <span className="text-foreground">{Math.round(progress)}% Complete</span>
            <span className="text-muted-foreground">{processed} of {campaign.totalMessages} processed</span>
          </div>
          <Progress value={progress} className="h-2 bg-muted" indicatorColor="bg-primary" />
          {campaign.status === 'RUNNING' && (
            <div className="flex items-center gap-2 mt-3 text-xs font-mono text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
              LIVE — dispatching messages
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template + contacts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center">
              <FileText className="w-4 h-4 mr-2" /> Payload Template
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <pre className="font-mono text-xs text-primary bg-background p-4 rounded border border-border overflow-x-auto whitespace-pre-wrap break-words">
              {campaign.messageTemplate}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-card border-border flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex justify-between items-center">
              <span className="flex items-center"><Users className="w-4 h-4 mr-2" /> Contact Roster</span>
              <Badge variant="secondary" className="font-mono text-[10px]">{contacts?.length ?? 0} loaded</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-[300px]">
            {loadingContacts ? (
              <div className="p-4 font-mono text-xs text-muted-foreground animate-pulse">READING...</div>
            ) : (
              <Table>
                <TableHeader className="bg-muted/30 sticky top-0">
                  <TableRow>
                    <TableHead className="font-mono text-xs">Address</TableHead>
                    <TableHead className="font-mono text-xs">Variable Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts?.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-foreground">{c.phoneNumber}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.name || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {contacts?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 font-mono text-xs text-muted-foreground">NO_DATA</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dispatch logs */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center justify-between">
            <span>Recent Dispatch Logs</span>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded font-mono">
              {report?.messages?.length ?? 0} records
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-auto max-h-[480px]">
          {loadingReport ? (
            <div className="p-4 font-mono text-xs text-muted-foreground animate-pulse">FETCHING_LOGS...</div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-mono text-xs">Target</TableHead>
                  <TableHead className="font-mono text-xs">Status</TableHead>
                  <TableHead className="font-mono text-xs">Node ID</TableHead>
                  <TableHead className="font-mono text-xs">Timestamp</TableHead>
                  <TableHead className="font-mono text-xs max-w-[200px]">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report?.messages.map(msg => (
                  <TableRow key={msg.id} className="hover:bg-muted/20">
                    <TableCell className="font-mono text-xs text-foreground">{msg.recipient}</TableCell>
                    <TableCell><MessageStatusBadge status={msg.status} /></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {msg.deviceId ? `#${msg.deviceId}` : <span className="text-muted-foreground/50">unassigned</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {msg.sentAt
                        ? format(new Date(msg.sentAt), 'MM/dd HH:mm:ss')
                        : format(new Date(msg.createdAt), 'MM/dd HH:mm:ss')}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-destructive truncate max-w-[200px]" title={msg.failureReason || ''}>
                      {msg.failureReason || <span className="text-muted-foreground/50">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {(report?.messages.length === 0 || !report) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 font-mono text-xs text-muted-foreground">
                      NO_LOGS_GENERATED
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
