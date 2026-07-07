import React, { useEffect, useState } from 'react';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { useGetMe } from '@workspace/api-client-react';

// Layouts
import { AppShell } from '@/components/app-shell';

// Pages
import Dashboard from '@/pages/dashboard';
import Devices from '@/pages/devices';
import DeviceDetail from '@/pages/device-detail';
import Campaigns from '@/pages/campaigns';
import NewCampaign from '@/pages/campaign-new';
import CampaignDetail from '@/pages/campaign-detail';
import MessagesLog from '@/pages/messages';
import Login from '@/pages/login';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/login');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center font-mono text-primary text-sm">INITIALIZING_SESSION...</div>;
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <AppShell>
      <Component />
    </AppShell>
  );
}

function Router() {
  const { data: me, isLoading, error } = useGetMe({ query: { retry: false } });
  
  // Custom hook usage warning fixed by doing this inside AuthProvider wrapper
  return (
    <AuthProvider initialUser={me} isLoading={isLoading}>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/">
          {() => <ProtectedRoute component={Dashboard} />}
        </Route>
        <Route path="/devices">
          {() => <ProtectedRoute component={Devices} />}
        </Route>
        <Route path="/devices/:deviceId">
          {() => <ProtectedRoute component={DeviceDetail} />}
        </Route>
        <Route path="/campaigns">
          {() => <ProtectedRoute component={Campaigns} />}
        </Route>
        <Route path="/campaigns/new">
          {() => <ProtectedRoute component={NewCampaign} />}
        </Route>
        <Route path="/campaigns/:campaignId">
          {() => <ProtectedRoute component={CampaignDetail} />}
        </Route>
        <Route path="/messages">
          {() => <ProtectedRoute component={MessagesLog} />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </AuthProvider>
  );
}

function App() {
  // Ensure we mount dark mode class
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;