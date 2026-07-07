import React, { useState } from 'react';
import {
  Smartphone, Download, Wifi, QrCode, CheckCircle2, AlertTriangle,
  ExternalLink, Cpu, Shield, Zap, Copy, Check, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link } from 'wouter';
import { QRCodeSVG } from 'qrcode.react';
import { useCreateDevice, useGetDeviceQr, getListDevicesQueryKey } from '@workspace/api-client-react';
import type { DeviceWithQr } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const DOWNLOAD_URL = '/api/downloads/hydropy-gateway.apk';

// WebSocket server URL as seen from the outside
function getWsServerUrl(): string {
  const host = window.location.host;
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${host}/api/ws`;
}

const STEPS = [
  {
    step: '01',
    title: 'Download & Install',
    desc: 'Download the HYDROPY Gateway APK and install it on your Android device. You may need to allow "Install from unknown sources" in Android Settings → Security.',
    icon: Download,
  },
  {
    step: '02',
    title: 'Grant Permissions',
    desc: 'Launch the HYDROPY Gateway app. On first launch, grant SMS and Notification permissions — both are required to send messages and report delivery status.',
    icon: Smartphone,
  },
  {
    step: '03',
    title: 'Provision a Node',
    desc: 'Use the "Quick Provision" panel below (or go to Fleet → PROVISION NODE) to generate a unique QR code for the device.',
    icon: QrCode,
    link: { label: 'Open Fleet →', href: '/devices' },
  },
  {
    step: '04',
    title: 'Scan QR Code',
    desc: 'In the Android app, tap "Scan QR Code" and point the camera at the QR code. The app reads the WebSocket URL and auth token in a single step.',
    icon: Wifi,
  },
  {
    step: '05',
    title: 'Device Goes ONLINE',
    desc: 'Within a few seconds the node appears as ONLINE in the Fleet view. Once online it automatically receives and sends SMS for running campaigns.',
    icon: CheckCircle2,
  },
];

const REQUIREMENTS = [
  { label: 'Android Version', value: '8.0 (Oreo) or higher' },
  { label: 'Permissions',     value: 'SMS, Notifications, Camera (QR scan)' },
  { label: 'SIM Card',        value: 'At least one active SIM with SMS capability' },
  { label: 'Network',         value: 'Wi-Fi or mobile data (WebSocket connection)' },
  { label: 'Battery',         value: 'Disable battery optimisation for background reliability' },
];

const TROUBLESHOOTING = [
  {
    q: 'Device shows PENDING_CONNECTION after scanning QR',
    a: 'Ensure the phone has internet access and can reach this portal URL. If still pending, delete the device, provision a new one, and scan the fresh QR code.',
  },
  {
    q: 'Device connects then immediately goes OFFLINE',
    a: 'Android battery optimisation is killing the background service. Go to Settings → Battery → Battery Optimisation, find HYDROPY Gateway, and set it to "Not optimised".',
  },
  {
    q: 'SMS not being sent even though device is ONLINE',
    a: 'Verify the SIM card is active and has SMS credit. Make sure the HYDROPY app has SMS permission. Check the Messages log in the portal for specific failure reasons.',
  },
  {
    q: 'App crashes on launch',
    a: 'Ensure your Android version is 8.0 or higher. Uninstall, re-download the APK, and reinstall. Grant all requested permissions on first launch.',
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      className="ml-2 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function QuickProvision() {
  const queryClient = useQueryClient();
  const createDevice = useCreateDevice();
  const [deviceName, setDeviceName] = useState('');
  const [provisionedId, setProvisionedId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');

  const { data: qrData, isLoading: qrLoading, refetch: refetchQr } = useGetDeviceQr(provisionedId!, {
    query: { enabled: !!provisionedId },
  });

  const wsUrl = getWsServerUrl();

  const handleProvision = (e: React.FormEvent) => {
    e.preventDefault();
    const name = deviceName.trim();
    if (!name || name.length < 3) { setError('Name must be at least 3 characters.'); return; }
    setError('');
    createDevice.mutate({ data: { deviceName: name } }, {
      onSuccess: (res) => {
        setProvisionedId(res.id);
        queryClient.invalidateQueries({ queryKey: getListDevicesQueryKey() });
      },
      onError: () => setError('Failed to provision device. Try again.'),
    });
  };

  const handleClose = () => {
    setOpen(false);
    setProvisionedId(null);
    setDeviceName('');
    setError('');
  };

  return (
    <Card className="bg-card border-primary/30 border-2">
      <CardHeader className="border-b border-border pb-3">
        <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <QrCode className="w-4 h-4 text-primary" /> Quick Provision — Generate Connection QR
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          {/* Left: form */}
          <div className="flex-1 space-y-3">
            <p className="text-xs font-mono text-muted-foreground">
              Enter a name for the Android device, then open the QR code and scan it with the Gateway app.
            </p>
            <form onSubmit={handleProvision} className="flex gap-2">
              <Input
                value={deviceName}
                onChange={(e) => { setDeviceName(e.target.value); setError(''); }}
                placeholder="e.g. gateway-beta-01"
                className="font-mono bg-background text-sm flex-1"
              />
              <Button type="submit" className="font-mono text-xs tracking-wider flex-shrink-0" disabled={createDevice.isPending}>
                {createDevice.isPending ? 'Provisioning...' : 'Generate QR'}
              </Button>
            </form>
            {error && <p className="text-xs font-mono text-destructive">{error}</p>}
            {provisionedId && (
              <Button variant="outline" size="sm" className="font-mono text-xs gap-1.5 text-primary border-primary/30" onClick={() => setOpen(true)}>
                <QrCode className="w-3.5 h-3.5" /> Open QR Code
              </Button>
            )}
          </div>

          {/* Right: server info */}
          <div className="md:w-72 bg-muted/30 border border-border rounded-sm p-3 space-y-2">
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">WebSocket Endpoint</div>
            <div className="flex items-center">
              <code className="text-xs font-mono text-primary break-all">{wsUrl}</code>
              <CopyButton text={wsUrl} />
            </div>
            <p className="text-[10px] font-mono text-muted-foreground">
              This is the URL the Gateway app connects to. The QR code encodes this + the device auth token automatically.
            </p>
          </div>
        </div>
      </CardContent>

      {/* QR Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
        <DialogContent className="bg-card border-border sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-tight">Scan to Connect</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Scan this QR code with the HYDROPY Gateway app to pair the device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-2 space-y-4">
            <div className="bg-white p-4 rounded-md shadow-sm">
              {qrLoading ? (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-zinc-400 font-mono text-xs bg-zinc-100">
                  LOADING...
                </div>
              ) : qrData ? (
                <QRCodeSVG value={qrData.qrData} size={200} level="H" />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center text-red-400 font-mono text-xs bg-zinc-100">
                  QR ERROR
                </div>
              )}
            </div>

            {qrData && (
              <div className="w-full">
                <div className="text-[10px] font-mono text-muted-foreground uppercase mb-1">QR Payload</div>
                <div className="bg-muted/30 border border-border p-2 rounded-sm">
                  <code className="text-[10px] font-mono text-primary break-all">{qrData.qrData}</code>
                </div>
              </div>
            )}

            <div className="bg-amber-500/10 text-amber-400 border border-amber-500/20 p-3 flex items-start gap-3 rounded-sm w-full">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p className="font-mono text-xs leading-relaxed">
                This QR contains a one-time auth token. Do not share or screenshot it. It expires after first use.
              </p>
            </div>

            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 font-mono text-xs gap-1.5" onClick={() => refetchQr()}>
                <RefreshCw className="w-3 h-3" /> Refresh
              </Button>
              <Button className="flex-1 font-mono text-xs" onClick={handleClose}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default function GatewayApp() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Hero */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">GATEWAY_APP</h1>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Turn any Android phone into an SMS gateway node for the HYDROPY platform.
          </p>
        </div>
        <div className="flex items-center text-xs font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-sm border border-amber-500/20 gap-2 flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5" />
          Android only
        </div>
      </div>

      {/* Quick Provision Portal — the connection entry point */}
      <QuickProvision />

      {/* Download card */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-center gap-5">
            <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="text-lg font-mono font-bold text-foreground">HYDROPY Gateway</div>
              <div className="text-xs font-mono text-muted-foreground mt-0.5">Android APK · v1.0.0 · ~12 MB</div>
              <div className="flex flex-wrap gap-3 mt-2 justify-center md:justify-start">
                <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <Shield className="w-3 h-3 text-emerald-400" /> Signed APK
                </span>
                <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <Zap className="w-3 h-3 text-primary" /> WebSocket + SMS
                </span>
                <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <Cpu className="w-3 h-3 text-muted-foreground" /> Android 8+
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <a href={DOWNLOAD_URL} download>
                <Button className="font-mono text-sm tracking-wider px-6 h-10 gap-2">
                  <Download className="w-4 h-4" />
                  DOWNLOAD APK
                </Button>
              </a>
              <span className="text-[10px] font-mono text-muted-foreground">Sideload required</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sideload notice */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-sm p-4 flex gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="text-sm font-mono font-medium text-amber-400">Allow installation from unknown sources</div>
          <div className="text-xs font-mono text-muted-foreground leading-relaxed">
            Android blocks APK installs by default. Before installing, go to{' '}
            <span className="text-foreground">Settings → Apps → Special app access → Install unknown apps</span>{' '}
            and enable it for your file manager or browser. Disable again after install.
          </div>
        </div>
      </div>

      {/* Setup steps */}
      <div>
        <h2 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-widest mb-4">Setup Guide</h2>
        <div className="space-y-2.5">
          {STEPS.map((s) => (
            <div key={s.step} className="flex gap-4 p-4 bg-card border border-border rounded-sm hover:border-primary/30 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-xs font-mono font-bold text-primary">{s.step}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-mono font-semibold text-foreground">{s.title}</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground leading-relaxed">{s.desc}</p>
                {s.link && (
                  <Link href={s.link.href} className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline mt-1.5">
                    {s.link.label} <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Requirements */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Cpu className="w-4 h-4" /> System Requirements
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0 px-6 pb-4">
          {REQUIREMENTS.map((r) => (
            <div key={r.label} className="flex justify-between py-3 gap-4">
              <span className="text-xs font-mono text-muted-foreground">{r.label}</span>
              <span className="text-xs font-mono text-foreground text-right">{r.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xs font-mono text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Troubleshooting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {TROUBLESHOOTING.map((item) => (
            <div key={item.q} className="space-y-1">
              <div className="text-xs font-mono font-semibold text-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5 flex-shrink-0">›</span>
                {item.q}
              </div>
              <p className="text-xs font-mono text-muted-foreground leading-relaxed pl-4">{item.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="text-xs font-mono text-muted-foreground/60 text-center pb-4">
        Need to pair a device right now?{' '}
        <Link href="/devices" className="text-primary hover:underline">Open Fleet Manager →</Link>
      </div>
    </div>
  );
}
