import React from 'react';
import { DeviceStatus, CampaignStatus, MessageStatus } from '@workspace/api-client-react';

export function DeviceStatusBadge({ status }: { status: DeviceStatus }) {
  const variants: Record<DeviceStatus, string> = {
    NEW: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    PENDING_CONNECTION: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    CONNECTED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ONLINE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    BUSY: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    OFFLINE: 'bg-red-500/10 text-red-400 border-red-500/20',
    BLOCKED: 'bg-rose-900/30 text-rose-500 border-rose-900/50',
  };

  const dots: Record<DeviceStatus, string> = {
    NEW: 'bg-zinc-500',
    PENDING_CONNECTION: 'bg-yellow-400',
    CONNECTED: 'bg-blue-400',
    ONLINE: 'bg-emerald-400',
    BUSY: 'bg-amber-400',
    OFFLINE: 'bg-red-400',
    BLOCKED: 'bg-rose-500',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono border ${variants[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[status]}`}></span>
      {status}
    </span>
  );
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const variants: Record<CampaignStatus, string> = {
    DRAFT: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    SCHEDULED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    RUNNING: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PAUSED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    COMPLETED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
    CANCELLED: 'bg-zinc-800 text-zinc-500 border-zinc-700',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono border ${variants[status]}`}>
      {status}
    </span>
  );
}

export function MessageStatusBadge({ status }: { status: MessageStatus }) {
  const variants: Record<MessageStatus, string> = {
    CREATED: 'bg-zinc-800 text-zinc-400 border-zinc-700',
    QUEUED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ASSIGNED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    SENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    SENT: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    DELIVERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    FAILED: 'bg-red-500/10 text-red-400 border-red-500/20',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-mono border ${variants[status]}`}>
      {status}
    </span>
  );
}