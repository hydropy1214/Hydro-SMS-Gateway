import React from 'react';
import { useParams, Link } from 'wouter';
import { useGetCampaign, useGetCampaignReport, useListContacts } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { ArrowLeft, Activity, Megaphone, Users, Send, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { CampaignStatusBadge, MessageStatusBadge } from '@/components/status-badges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function CampaignDetail() {
  const { campaignId } = useParams();
  const id = parseInt(campaignId || '0', 10);

  const { data: campaign, isLoading: loadingCamp } = useGetCampaign(id, { query: { enabled: !!id, refetchInterval: 5000 } });
  const { data: report, isLoading: loadingReport } = useGetCampaignReport(id, { query: { enabled: !!id, refetchInterval: 5000 } });
  const { data: contacts, isLoading: loadingContacts } = useListContacts(id, { query: { enabled: !!id } });

  if (loadingCamp) return <div className="font-mono text-muted-foreground text-sm">LOADING_PIPELINE...</div>;
  if (!campaign) return <div className="font-mono text-red-500 text-sm">ERROR: PIPELINE_NOT_FOUND</div>;

  const progress = campaign.totalMessages > 0 ? ((campaign.sent + campaign.failed) / campaign.totalMessages) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/campaigns" className="text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-3">
            {campaign.name}
            <CampaignStatusBadge status={campaign.status} />
          </h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            ID: {campaign.id} • Created {format(new Date(campaign.createdAt), 'yyyy-MM-dd HH:mm')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="text-xs font-mono text-muted-foreground uppercase mb-1 flex items-center"><Users className="w-3 h-3 mr-2" /> Target Pool</div>
            <div className="text-2xl font-mono font-bold text-foreground">{campaign.totalMessages}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="text-xs font-mono text-muted-foreground uppercase mb-1 flex items-center"><Send className="w-3 h-3 mr-2" /> Delivered</div>
            <div className="text-2xl font-mono font-bold text-emerald-400">{campaign.sent}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="text-xs font-mono text-muted-foreground uppercase mb-1 flex items-center"><AlertTriangle className="w-3 h-3 mr-2" /> Failed</div>
            <div className="text-2xl font-mono font-bold text-red-400">{campaign.failed}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex flex-col justify-center">
            <div className="text-xs font-mono text-muted-foreground uppercase mb-1 flex items-center"><CheckCircle2 className="w-3 h-3 mr-2" /> Success Rate</div>
            <div className="text-2xl font-mono font-bold text-primary">
              {report ? `${report.successRate.toFixed(1)}%` : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center">
            <Activity className="w-4 h-4 mr-2" /> Execution Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex justify-between font-mono text-sm mb-2">
            <span className="text-foreground">{Math.round(progress)}% Complete</span>
            <span className="text-muted-foreground">{campaign.sent + campaign.failed} of {campaign.totalMessages} processed</span>
          </div>
          <Progress value={progress} className="h-2 bg-muted" indicatorColor="bg-primary" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center">
              <FileText className="w-4 h-4 mr-2" /> Payload Template
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <pre className="font-mono text-xs text-primary bg-background p-4 rounded border border-border overflow-x-auto whitespace-pre-wrap">
              {campaign.messageTemplate}
            </pre>
          </CardContent>
        </Card>

        <Card className="bg-card border-border flex flex-col">
          <CardHeader className="pb-3 border-b border-border">
            <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex justify-between items-center">
              <span className="flex items-center"><Users className="w-4 h-4 mr-2" /> Contact Roster</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded">{contacts?.length || 0} loaded</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto max-h-[300px]">
            {loadingContacts ? (
              <div className="p-4 font-mono text-xs text-muted-foreground">READING...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-mono text-xs">Address</TableHead>
                    <TableHead className="font-mono text-xs">Variable Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts?.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs text-foreground">{c.phoneNumber}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{c.name || '-'}</TableCell>
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

      <Card className="bg-card border-border">
        <CardHeader className="pb-3 border-b border-border">
          <CardTitle className="text-sm font-mono text-muted-foreground uppercase">Recent Dispatch Logs</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-auto max-h-[400px]">
          {loadingReport ? (
            <div className="p-4 font-mono text-xs text-muted-foreground">FETCHING_LOGS...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-mono text-xs">Target</TableHead>
                  <TableHead className="font-mono text-xs">Status</TableHead>
                  <TableHead className="font-mono text-xs">Node ID</TableHead>
                  <TableHead className="font-mono text-xs">Timestamp</TableHead>
                  <TableHead className="font-mono text-xs max-w-[200px]">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report?.messages.slice(0, 50).map(msg => (
                  <TableRow key={msg.id}>
                    <TableCell className="font-mono text-xs text-foreground">{msg.recipient}</TableCell>
                    <TableCell><MessageStatusBadge status={msg.status} /></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{msg.deviceId || 'unassigned'}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {msg.sentAt ? format(new Date(msg.sentAt), 'MM/dd HH:mm:ss') : format(new Date(msg.createdAt), 'MM/dd HH:mm:ss')}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-destructive truncate max-w-[200px]" title={msg.failureReason || ''}>
                      {msg.failureReason || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {report?.messages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4 font-mono text-xs text-muted-foreground">NO_LOGS_GENERATED</TableCell>
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