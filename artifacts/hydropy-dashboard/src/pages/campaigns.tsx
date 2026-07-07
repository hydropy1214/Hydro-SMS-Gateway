import React from 'react';
import { useListCampaigns, useDeleteCampaign, useStartCampaign, usePauseCampaign, useResumeCampaign, getListCampaignsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { format } from 'date-fns';
import { Plus, Play, Pause, Trash2, Megaphone, Activity, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CampaignStatusBadge } from '@/components/status-badges';
import { Progress } from '@/components/ui/progress';

export default function Campaigns() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: campaigns, isLoading } = useListCampaigns(undefined, { query: { refetchInterval: 5000 } });
  
  const startCampaign = useStartCampaign();
  const pauseCampaign = usePauseCampaign();
  const resumeCampaign = useResumeCampaign();
  const deleteCampaign = useDeleteCampaign();

  const handleAction = (id: number, action: 'start' | 'pause' | 'resume' | 'delete') => {
    const opts = {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCampaignsQueryKey() })
    };
    
    if (action === 'start') startCampaign.mutate({ campaignId: id }, opts);
    if (action === 'pause') pauseCampaign.mutate({ campaignId: id }, opts);
    if (action === 'resume') resumeCampaign.mutate({ campaignId: id }, opts);
    if (action === 'delete' && confirm('Delete this campaign?')) deleteCampaign.mutate({ campaignId: id }, opts);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">DISPATCH_PIPELINES</h1>
        <Button onClick={() => setLocation('/campaigns/new')} className="font-mono text-xs tracking-wider">
          <Plus className="w-4 h-4 mr-2" />
          NEW_PIPELINE
        </Button>
      </div>

      <div className="border border-border rounded-md bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="font-mono text-xs uppercase">Pipeline / Name</TableHead>
              <TableHead className="font-mono text-xs uppercase">Status</TableHead>
              <TableHead className="font-mono text-xs uppercase w-64">Progress</TableHead>
              <TableHead className="font-mono text-xs uppercase text-right">Stats</TableHead>
              <TableHead className="font-mono text-xs uppercase">Created</TableHead>
              <TableHead className="font-mono text-xs uppercase text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns?.map((camp) => {
              const progress = camp.totalMessages > 0 ? ((camp.sent + camp.failed) / camp.totalMessages) * 100 : 0;
              
              return (
                <TableRow key={camp.id}>
                  <TableCell>
                    <Link href={`/campaigns/${camp.id}`} className="font-mono text-sm font-medium text-primary hover:underline">
                      {camp.name}
                    </Link>
                    <div className="text-[10px] font-mono text-muted-foreground mt-1">ID: {camp.id}</div>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={camp.status} />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                        <span>{Math.round(progress)}%</span>
                        <span>{camp.sent + camp.failed} / {camp.totalMessages}</span>
                      </div>
                      <Progress value={progress} className="h-1.5 bg-muted" indicatorColor="bg-primary" />
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col space-y-1 text-[11px] font-mono text-muted-foreground">
                      <span className="text-emerald-400">{camp.sent} SENT</span>
                      <span className="text-red-400">{camp.failed} FAILED</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {format(new Date(camp.createdAt), 'MM/dd HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {camp.status === 'DRAFT' && (
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Start" onClick={() => handleAction(camp.id, 'start')}>
                          <Play className="w-3.5 h-3.5 text-emerald-500" />
                        </Button>
                      )}
                      {camp.status === 'RUNNING' && (
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Pause" onClick={() => handleAction(camp.id, 'pause')}>
                          <Pause className="w-3.5 h-3.5 text-amber-500" />
                        </Button>
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
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive" title="Delete" onClick={() => handleAction(camp.id, 'delete')}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {campaigns?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono text-sm">
                  NO_PIPELINES_FOUND
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}