import React from 'react';
import { Smartphone, Download, Wifi, QrCode, CheckCircle2, AlertTriangle, ExternalLink, Cpu, Shield, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

const DOWNLOAD_URL = '/api/downloads/hydropy-gateway.apk'; // swap for real URL when APK is ready

const STEPS = [
  {
    step: '01',
    title: 'Download & Install',
    desc: 'Download the HYDROPY Gateway APK and install it on your Android device. You may need to allow "Install from unknown sources" in Android Settings → Security.',
    icon: Download,
    color: 'text-primary',
  },
  {
    step: '02',
    title: 'Open the App',
    desc: 'Launch the HYDROPY Gateway app. On first launch it will ask for SMS and notification permissions — grant both so it can send messages and report delivery status.',
    icon: Smartphone,
    color: 'text-primary',
  },
  {
    step: '03',
    title: 'Provision a Node',
    desc: 'In the dashboard, go to Fleet → click "PROVISION NODE", enter a name for the device, and click "Generate QR Code".',
    icon: QrCode,
    color: 'text-primary',
    link: { label: 'Go to Fleet →', href: '/devices' },
  },
  {
    step: '04',
    title: 'Scan QR Code',
    desc: 'In the app, tap "Scan QR Code" and point the camera at the code shown on the dashboard. The device will authenticate and appear ONLINE within seconds.',
    icon: Wifi,
    color: 'text-emerald-400',
  },
  {
    step: '05',
    title: 'Ready to Send',
    desc: 'Once the device shows ONLINE in the Fleet view, it will automatically receive and send SMS messages when a campaign is running.',
    icon: CheckCircle2,
    color: 'text-emerald-400',
  },
];

const REQUIREMENTS = [
  { label: 'Android Version', value: '8.0 (Oreo) or higher' },
  { label: 'Permissions', value: 'SMS, Notifications, Camera (QR scan)' },
  { label: 'SIM Card', value: 'At least one active SIM with SMS capability' },
  { label: 'Network', value: 'Wi-Fi or mobile data (for WebSocket connection)' },
  { label: 'Battery', value: 'Recommend disabling battery optimisation for background reliability' },
];

export default function GatewayApp() {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* Hero */}
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">
            GATEWAY_APP
          </h1>
          <p className="text-sm font-mono text-muted-foreground mt-1">
            Turn any Android phone into an SMS gateway node for the HYDROPY platform.
          </p>
        </div>
        <div className="flex items-center text-xs font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-sm border border-amber-500/20 gap-2 flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5" />
          Android only
        </div>
      </div>

      {/* Download card */}
      <Card className="bg-card border-primary/30 border-2">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Icon */}
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-10 h-10 text-primary" />
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <div className="text-lg font-mono font-bold text-foreground">HYDROPY Gateway</div>
              <div className="text-xs font-mono text-muted-foreground mt-1">Android APK · v1.0.0 · ~12 MB</div>
              <div className="flex flex-wrap gap-3 mt-3 justify-center md:justify-start">
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

            {/* Button */}
            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              <a href={DOWNLOAD_URL} download>
                <Button className="font-mono text-sm tracking-wider px-6 h-10 gap-2">
                  <Download className="w-4 h-4" />
                  DOWNLOAD APK
                </Button>
              </a>
              <span className="text-[10px] font-mono text-muted-foreground">Direct APK — sideload required</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enable sideloading notice */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-sm p-4 flex gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="text-sm font-mono font-medium text-amber-400">Allow installation from unknown sources</div>
          <div className="text-xs font-mono text-muted-foreground leading-relaxed">
            Android blocks APK installs by default. Before installing, go to{' '}
            <span className="text-foreground">Settings → Apps → Special app access → Install unknown apps</span>{' '}
            and enable it for your file manager or browser. You can disable it again after install.
          </div>
        </div>
      </div>

      {/* Setup steps */}
      <div>
        <h2 className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-widest mb-4">
          Setup Guide
        </h2>
        <div className="space-y-3">
          {STEPS.map((s) => (
            <div key={s.step} className="flex gap-4 p-4 bg-card border border-border rounded-sm hover:border-primary/30 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center">
                <span className="text-xs font-mono font-bold text-primary">{s.step}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                  <span className="text-sm font-mono font-semibold text-foreground">{s.title}</span>
                </div>
                <p className="text-xs font-mono text-muted-foreground leading-relaxed">{s.desc}</p>
                {s.link && (
                  <Link href={s.link.href} className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:underline mt-2">
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
        <CardContent className="divide-y divide-border">
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
          {[
            {
              q: 'Device shows PENDING_CONNECTION after scanning QR',
              a: 'Make sure the phone has internet access and can reach the portal. Check that the QR code was scanned within its validity window. If still pending, delete the device, provision a new one, and scan the fresh QR code.',
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
          ].map((item) => (
            <div key={item.q} className="space-y-1">
              <div className="text-xs font-mono font-semibold text-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">›</span>
                {item.q}
              </div>
              <p className="text-xs font-mono text-muted-foreground leading-relaxed pl-4">{item.a}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer note */}
      <div className="text-xs font-mono text-muted-foreground/60 text-center pb-4">
        Need to pair a new device right now?{' '}
        <Link href="/devices" className="text-primary hover:underline">Open Fleet Manager →</Link>
      </div>
    </div>
  );
}
