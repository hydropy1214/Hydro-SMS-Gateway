import React from 'react';
import {
  useListCampaigns,
  useDeleteCampaign,
  useStartCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useStopCampaign,
  getListCampaignsQueryKey,
} from '@workspace/api-client-react';
import type { Campaign } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';
import { Plus, Play, Pause, Square, Trash2, BarChart2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CampaignStatusBadge } from '@/components/status-badges';
import { Progress } from '@/components/ui/progress';

export default function Campaigns() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: campaigns, isLoading, isError, refetch } = useListCampaigns(undefined, {
    query: { refetchInterval: 5000 },
  });

  const startCampaign = useStartCampaign();
  const pauseCampaign = usePauseCampaign();
  const resumeCampaign = useResumeCampaign();
  const stopCampaign = useStopCampaign();
  const deleteCampaign = useDeleteCampaign();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() });

  const handleAction = (id: number, action: 'start' | 'pause' | 'resume' | 'stop' | 'delete') => {
    const opts = { onSuccess: invalidate };
    if (action === 'start') startCampaign.mutate({ campaignId: id }, opts);
    if (action === 'pause') pauseCampaign.mutate({ campaignId: id }, opts);
    if (action === 'resume') resumeCampaign.mutate({ campaignId: id }, opts);
    if (action === 'stop') {
      if (!confirm('Stop and cancel this campaign? All queued messages will be cancelled.')) return;
      stopCampaign.mutate({ campaignId: id }, opts);
    }
    if (action === 'delete') {
      if (!confirm('Delete this campaign permanently?')) return;
      deleteCampaign.mutate({ campaignId: id }, opts);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">DISPATCH_PIPELINES</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {campaigns ? `${campaigns.length} total` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="font-mono text-xs h-8">
            <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
          </Button>
          <Button onClick={() => setLocation('/campaigns/new')} className="font-mono text-xs tracking-wider">
            <Plus className="w-4 h-4 mr-2" />
            NEW_PIPELINE
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-mono text-xs uppercase">Pipeline</TableHead>
              <TableHead className="font-mono text-xs uppercase">Status</TableHead>
              <TableHead className="font-mono text-xs uppercase w-56">Progress</TableHead>
              <TableHead className="font-mono text-xs uppercase text-right">Stats</TableHead>
              <TableHead className="font-mono text-xs uppercase whitespace-nowrap">Created</TableHead>
              <TableHead className="font-mono text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-mono text-sm animate-pulse">
                  QUERYING_PIPELINES...
                </TableCell>
              </TableRow>
            )}
            {isError && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-destructive font-mono text-sm">
                  ERR: FAILED_TO_LOAD — check API server
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && campaigns?.map((camp) => {
              const processed = camp.sent + camp.failed;
              const progress = camp.totalMessages > 0 ? (processed / camp.totalMessages) * 100 : 0;
              return (
                <TableRow key={camp.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <Link href={`/campaigns/${camp.id}`} className="font-mono text-sm font-semibold text-primary hover:underline">
                      {camp.name}
                    </Link>
                    <div className="text-[10px] font-mono text-muted-foreground mt-0.5">ID: {camp.id}</div>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={camp.status} />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                        <span>{Math.round(progress)}%</span>
                        <span>{processed} / {camp.totalMessages}</span>
                      </div>
                      <Progress value={progress} className="h-1.5 bg-muted" indicatorColor="bg-primary" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col space-y-0.5 text-[11px] font-mono">
                      <span className="text-emerald-400">{camp.sent} sent</span>
                      <span className="text-red-400">{camp.failed} failed</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(camp.createdAt), 'MM/dd HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {camp.status === 'DRAFT' && (
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Start" onClick={() => handleAction(camp.id, 'start')}>
                          <Play className="w-3.5 h-3.5 text-emerald-500" />
                        </Button>
                      )}
                      {camp.status === 'RUNNING' && (
                        <>
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Pause" onClick={() => handleAction(camp.id, 'pause')}>
                            <Pause className="w-3.5 h-3.5 text-amber-500" />
                          </Button>
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Stop" onClick={() => handleAction(camp.id, 'stop')}>
                            <Square className="w-3.5 h-3.5 text-red-500" />
                          </Button>
                        </>
                      )}
                      {camp.status === 'PAUSED' && (
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Resume" onClick={() => handleAction(camp.id, 'resume')}>
                          <Play className="w-3.5 h-3.5 text-emerald-500" />
                        </Button>
                      )}
                      <Link href={`/campaigns/${camp.id}`}>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Report">
                          <BarChart2 className="w-3.5 h-3.5 text-primary" />
                        </Button>
                      </Link>
                      {(camp.status === 'DRAFT' || camp.status === 'COMPLETED' || camp.status === 'CANCELLED') && (
                        <Button
                          variant="outline" size="sm"
                          className="h-7 w-7 p-0 hover:bg-destructive/10 hover:border-destructive"
                          title="Delete"
                          onClick={() => handleAction(camp.id, 'delete')}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!isLoading && !isError && campaigns?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-mono text-sm">
                  <div className="mb-2">NO_PIPELINES_FOUND</div>
                  <div className="text-xs opacity-60">
                    Click{' '}
                    <button
                      onClick={() => setLocation('/campaigns/new')}
                      className="text-primary hover:underline"
                    >
                      NEW_PIPELINE
                    </button>{' '}
                    to create your first campaign
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
