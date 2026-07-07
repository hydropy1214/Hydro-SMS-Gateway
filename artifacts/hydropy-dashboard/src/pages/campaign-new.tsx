import React, { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateCampaign, useImportContacts } from '@workspace/api-client-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Terminal, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const campaignSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  messageTemplate: z.string().min(1, 'Message template is required'),
  contactsCsv: z.string().min(1, 'Contacts are required')
});

type CampaignForm = z.infer<typeof campaignSchema>;

export default function NewCampaign() {
  const [, setLocation] = useLocation();
  const createCampaign = useCreateCampaign();
  const importContacts = useImportContacts();
  const [error, setError] = useState('');

  const form = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: { name: '', messageTemplate: '', contactsCsv: '' }
  });

  const onSubmit = async (data: CampaignForm) => {
    setError('');
    
    // Parse CSV
    const lines = data.contactsCsv.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const contacts = lines.map(line => {
      const parts = line.split(',');
      if (parts.length === 1) return { phoneNumber: parts[0].trim() };
      return { phoneNumber: parts[0].trim(), name: parts[1].trim() };
    });

    if (contacts.length === 0) {
      setError('No valid contacts found in input.');
      return;
    }

    try {
      const campaign = await createCampaign.mutateAsync({ 
        data: { name: data.name, messageTemplate: data.messageTemplate } 
      });

      await importContacts.mutateAsync({
        campaignId: campaign.id,
        data: { contacts }
      });

      setLocation(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create campaign or import contacts');
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center space-x-4">
        <Link href="/campaigns" className="text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground">INITIALIZE_PIPELINE</h1>
      </div>

      {error && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/50 text-destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="font-mono text-xs uppercase">{error}</AlertDescription>
        </Alert>
      )}

      <Card className="bg-card border-border">
        <CardHeader className="border-b border-border bg-muted/10">
          <CardTitle className="text-sm font-mono text-muted-foreground uppercase flex items-center">
            <Terminal className="w-4 h-4 mr-2" />
            Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Pipeline Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. promo-q3-batch1" className="font-mono bg-background border-input" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="messageTemplate"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-end mb-2">
                      <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Payload Template</FormLabel>
                      <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-sm border border-primary/20">
                        TIP: use {'{name}'} for variables
                      </span>
                    </div>
                    <FormControl>
                      <Textarea 
                        placeholder="Hi {name}, your code is 1234." 
                        className="font-mono min-h-[100px] bg-background border-input resize-y" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactsCsv"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase text-muted-foreground">Target Addresses (CSV)</FormLabel>
                    <p className="text-[10px] font-mono text-muted-foreground mb-2">Format: phone,name (one per line). Phone only is acceptable.</p>
                    <FormControl>
                      <Textarea 
                        placeholder="+15550001111, John Doe&#10;+15550002222, Jane Smith" 
                        className="font-mono min-h-[150px] bg-background border-input whitespace-pre" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4 border-t border-border">
                <Button 
                  type="submit" 
                  className="font-mono uppercase tracking-wider"
                  disabled={createCampaign.isPending || importContacts.isPending}
                >
                  {(createCampaign.isPending || importContacts.isPending) ? 'Processing...' : 'Compile & Save'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}