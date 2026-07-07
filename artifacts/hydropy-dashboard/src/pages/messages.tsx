import React, { useState } from 'react';
import { useListMessages, ListMessagesStatus } from '@workspace/api-client-react';
import { format } from 'date-fns';
import { Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageStatusBadge } from '@/components/status-badges';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MessagesLog() {
  const [statusFilter, setStatusFilter] = useState<ListMessagesStatus | 'ALL'>('ALL');
  const [searchPhone, setSearchPhone] = useState('');

  // We are polling to make it feel live, but in a real massive app, we'd use pagination
  const { data: result, isLoading } = useListMessages({ 
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    limit: 100
  }, { query: { refetchInterval: 3000 } });

  // Client side search filter for phone number
  const filteredMessages = result?.messages.filter(m => 
    !searchPhone || m.recipient.includes(searchPhone)
  );

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">SYSTEM_LOGS</h1>
        <div className="text-xs font-mono text-muted-foreground uppercase">
          Total Records: {result?.total || 0}
        </div>
      </div>

      <div className="flex gap-4 flex-shrink-0 bg-card p-4 rounded-md border border-border">
        <div className="flex-1 flex gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search target address..." 
              className="pl-9 font-mono bg-background text-sm h-9"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-48 font-mono h-9 bg-background">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="font-mono">
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
      </div>

      <div className="border border-border rounded-md bg-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <Table className="relative">
            <TableHeader className="bg-muted/50 sticky top-0 z-10">
              <TableRow>
                <TableHead className="font-mono text-xs uppercase w-32">Timestamp</TableHead>
                <TableHead className="font-mono text-xs uppercase w-40">Target</TableHead>
                <TableHead className="font-mono text-xs uppercase w-32">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase w-24">Node ID</TableHead>
                <TableHead className="font-mono text-xs uppercase w-24">Pipeline ID</TableHead>
                <TableHead className="font-mono text-xs uppercase">Payload Excerpt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono text-sm">
                    QUERYING_DB...
                  </TableCell>
                </TableRow>
              ) : filteredMessages?.map((msg) => (
                <TableRow key={msg.id} className="hover:bg-accent/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {format(new Date(msg.createdAt), 'MM/dd HH:mm:ss')}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-foreground font-medium">
                    {msg.recipient}
                  </TableCell>
                  <TableCell>
                    <MessageStatusBadge status={msg.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {msg.deviceId || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-primary">
                    {msg.campaignId ? `#${msg.campaignId}` : '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-md">
                    {msg.failureReason ? (
                      <span className="text-destructive">ERROR: {msg.failureReason}</span>
                    ) : (
                      <span className="truncate block">{msg.message}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredMessages?.length === 0 && !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground font-mono text-sm">
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