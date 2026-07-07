import React, { useState } from 'react';
import { useListMessages, ListMessagesStatus } from '@workspace/api-client-react';
import type { Message } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { Search, Filter, Trash2, RotateCcw, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageStatusBadge } from '@/components/status-badges';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';

const API_BASE = '/api';

export default function MessagesLog() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ListMessagesStatus | 'ALL'>('ALL');
  const [searchPhone, setSearchPhone] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);

  const { data: result, isLoading, refetch } = useListMessages({
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: 200,
  }, { query: { refetchInterval: 4000 } });

  // Client-side search filter
  const filteredMessages = result?.messages.filter(m =>
    !searchPhone || m.recipient.includes(searchPhone)
  );

  const invalidate = () => {
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/messages');
      },
    });
  };

  const handleClear = async (scope: 'all' | 'status' | 'failed') => {
    const label = scope === 'all' ? 'ALL messages' : scope === 'failed' ? 'all FAILED messages' : `all ${statusFilter} messages`;
    if (!confirm(`Clear ${label}? This is permanent.`)) return;

    setIsClearing(true);
    setClearError(null);
    try {
      const body: Record<string, unknown> = {};
      if (scope === 'failed') body.status = 'FAILED';
      else if (scope === 'status' && statusFilter !== 'ALL') body.status = statusFilter;

      const token = localStorage.getItem('hydropy_token');
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await refetch();
      invalidate();
    } catch (err: any) {
      setClearError(err?.message || 'Failed to clear messages');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">SYSTEM_LOGS</h1>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            {result?.total ?? 0} total records
            {filteredMessages && filteredMessages.length !== result?.messages.length && (
              <> · {filteredMessages.length} matching filter</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="font-mono text-xs h-8"
            disabled={isLoading}
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {clearError && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs font-mono px-4 py-2 rounded-sm flex items-center justify-between flex-shrink-0">
          <span>{clearError}</span>
          <button onClick={() => setClearError(null)} className="ml-4 hover:opacity-70">✕</button>
        </div>
      )}

      {/* Filters + actions toolbar */}
      <div className="flex flex-wrap gap-3 flex-shrink-0 bg-card p-4 rounded-md border border-border">
        {/* Filters */}
        <div className="flex gap-2 flex-1 min-w-0">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search phone number..."
              className="pl-9 font-mono bg-background text-xs h-9"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-44 font-mono h-9 bg-background text-xs">
              <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent className="font-mono text-xs">
              <SelectItem value="ALL">ALL_STATES</SelectItem>
              <SelectItem value="QUEUED">QUEUED</SelectItem>
              <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
              <SelectItem value="SENDING">SENDING</SelectItem>
              <SelectItem value="SENT">SENT</SelectItem>
              <SelectItem value="DELIVERED">DELIVERED</SelectItem>
              <SelectItem value="FAILED">FAILED</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs h-9 gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
            onClick={() => handleClear('failed')}
            disabled={isClearing}
          >
            <RotateCcw className="w-3 h-3" /> Clear Failed
          </Button>
          {statusFilter !== 'ALL' && (
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs h-9 gap-1.5 border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
              onClick={() => handleClear('status')}
              disabled={isClearing}
            >
              <Trash2 className="w-3 h-3" /> Clear {statusFilter}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="font-mono text-xs h-9 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => handleClear('all')}
            disabled={isClearing}
          >
            <Trash2 className="w-3 h-3" /> Clear All
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-md bg-card flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="font-mono text-xs uppercase w-32">Timestamp</TableHead>
                <TableHead className="font-mono text-xs uppercase w-40">Target</TableHead>
                <TableHead className="font-mono text-xs uppercase w-28">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase w-24">Node</TableHead>
                <TableHead className="font-mono text-xs uppercase w-28">Pipeline</TableHead>
                <TableHead className="font-mono text-xs uppercase">Payload / Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground font-mono text-sm animate-pulse">
                    QUERYING_DB...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredMessages?.map((msg) => (
                <TableRow key={msg.id} className="hover:bg-accent/40 transition-colors">
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {format(new Date(msg.createdAt), 'MM/dd HH:mm:ss')}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground font-medium">
                    {msg.recipient}
                  </TableCell>
                  <TableCell>
                    <MessageStatusBadge status={msg.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {msg.deviceId ? `#${msg.deviceId}` : <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-primary">
                    {msg.campaignId ? `#${msg.campaignId}` : <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground max-w-md">
                    {msg.failureReason ? (
                      <span className="text-destructive truncate block">ERR: {msg.failureReason}</span>
                    ) : (
                      <span className="truncate block">{msg.message}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredMessages?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground font-mono text-sm">
                    NO_RECORDS_MATCH_CRITERIA
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
