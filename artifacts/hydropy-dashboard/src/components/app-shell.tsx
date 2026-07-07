import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/auth-context';
import { useLogout } from '@workspace/api-client-react';
import { LayoutDashboard, Smartphone, Megaphone, MessageSquare, LogOut, TerminalSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user, setUser } = useAuth();
  const logout = useLogout();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem('hydropy_token');
        setUser(null);
        setLocation('/login');
      },
      onError: () => {
        // Force logout even if API call fails
        localStorage.removeItem('hydropy_token');
        setUser(null);
        setLocation('/login');
      },
    });
  };

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/devices', label: 'Fleet', icon: Smartphone },
    { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
    { href: '/messages', label: 'Logs', icon: MessageSquare },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-border bg-card">
        <div className="h-14 flex items-center px-6 border-b border-border">
          <TerminalSquare className="w-5 h-5 text-primary mr-2" />
          <span className="font-mono font-bold tracking-tight text-foreground">
            HYDROPY<span className="text-primary">_</span>
          </span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === '/' ? location === '/' : location.startsWith(item.href);
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
                <item.icon className={`w-4 h-4 mr-3 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col overflow-hidden min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground font-mono truncate">{user?.role?.toUpperCase()}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive flex-shrink-0"
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
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
