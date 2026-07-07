import React from 'react';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/auth-context';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TerminalSquare, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const { setUser } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        setUser(res.user);
        setLocation('/');
      }
    });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <TerminalSquare className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-mono font-bold tracking-tight text-foreground">HYDROPY<span className="text-primary">_</span></h1>
          <p className="mt-2 text-sm text-muted-foreground font-mono uppercase tracking-widest">Gateway Infrastructure Console</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 shadow-2xl">
          {loginMutation.isError && (
            <Alert variant="destructive" className="mb-6 border-destructive/50 bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-mono text-xs">
                Authentication failed. Invalid credentials.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs text-muted-foreground uppercase">Operator ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="admin@hydropy.local" 
                        {...field} 
                        autoComplete="email"
                        className="font-mono bg-background border-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs text-muted-foreground uppercase">Passkey</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        {...field} 
                        autoComplete="current-password"
                        className="font-mono bg-background border-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full font-mono uppercase tracking-wider" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Authenticating...' : 'Initialize Session'}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}