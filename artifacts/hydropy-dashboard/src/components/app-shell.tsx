import React, { useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { useLogout } from '@workspace/api-client-react';
import {
  LayoutDashboard, Smartphone, Megaphone, MessageSquare,
  LogOut, TerminalSquare, Download, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHydropyWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';

const WS_TOAST_MAP: Record<string, { title: string; desc: (e: any) => string }> = {
  'device.connected':  { title: 'Node Connected',   desc: (e) => `Device #${e.deviceId} is now ONLINE.` },
  'device.offline':    { title: 'Node Disconnected', desc: (e) => `Device #${e.deviceId} went OFFLINE.` },
  'campaign.started':  { title: 'Campaign Running',  desc: (e) => `Pipeline #${e.campaignId} started.` },
  'campaign.completed':{ title: 'Campaign Done',     desc: (e) => `Pipeline #${e.campaignId} completed.` },
  'campaign.cancelled':{ title: 'Campaign Stopped',  desc: (e) => `Pipeline #${e.campaignId} was cancelled.` },
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const logout = useLogout();
  const { toast } = useToast();

  const handleWsEvent = useCallback((event: { type: string; [k: string]: unknown }) => {
    const entry = WS_TOAST_MAP[event.type];
    if (entry) {
      toast({ title: entry.title, description: entry.desc(event), duration: 4000 });
    }
  }, [toast]);

  useHydropyWebSocket(handleWsEvent);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem('hydropy_token');
        setUser(null);
        setLocation('/login');
      },
      onError: () => {
        localStorage.removeItem('hydropy_token');
        setUser(null);
        setLocation('/login');
      },
    });
  };

  const navItems = [
    { href: '/',            label: 'Overview',    icon: LayoutDashboard },
    { href: '/devices',     label: 'Fleet',       icon: Smartphone },
    { href: '/campaigns',   label: 'Campaigns',   icon: Megaphone },
    { href: '/messages',    label: 'Logs',        icon: MessageSquare },
    { href: '/gateway-app', label: 'Gateway App', icon: Download },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex flex-col border-r border-border bg-card flex-shrink-0">
        <div className="h-14 flex items-center px-5 border-b border-border gap-2.5">
          <TerminalSquare className="w-5 h-5 text-primary flex-shrink-0" />
          <span className="font-mono font-bold tracking-tight text-foreground">
            HYDROPY<span className="text-primary">_</span>
          </span>
          {/* Live indicator */}
          <div className="ml-auto flex items-center gap-1 text-[10px] font-mono text-primary">
            <Activity className="w-2.5 h-2.5 animate-pulse" />
            LIVE
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/'
              ? location === '/'
              : location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground border border-transparent'
                }`}
              >
                <item.icon className={`w-4 h-4 mr-3 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{user?.name}</span>
              <span className="text-[10px] text-muted-foreground font-mono truncate">{user?.role?.toUpperCase()}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive flex-shrink-0 h-8 w-8"
              title="Logout"
              disabled={logout.isPending}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
