'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, Loader2, Shield, User } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } },
};
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

function FormInput({ label, id, leftIcon, rightElement, type = 'text', autoComplete, placeholder, className, ...props }: {
  label?: string; id: string; leftIcon?: React.ReactNode; rightElement?: React.ReactNode;
  type?: string; autoComplete?: string; placeholder?: string; className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FormItem>
      {label && <FormLabel className="text-slate-300">{label}</FormLabel>}
      <FormControl>
        <div className="relative">
          {leftIcon && <div className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400">{leftIcon}</div>}
          <Input id={id} type={type} placeholder={placeholder} autoComplete={autoComplete} className={`pl-10 pr-10 h-11 border-slate-600 bg-slate-700/50 text-white placeholder:text-slate-500 focus-visible:ring-amber-500/40 ${className || ''}`} {...props} />
          {rightElement}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

export default function AdminLoginForm() {
  const { setView } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: values.username, password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Invalid credentials'); return; }
      useAppStore.getState().login(data.user, data.token);
      toast.success(`Welcome, ${data.user.name}! Admin access granted.`);
    } catch {
      toast.error('Unable to connect to server');
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
      <motion.div initial="hidden" animate="visible" variants={stagger} className="w-full max-w-md">
        <motion.div variants={fadeUp} className="mb-8 text-center">
          <div className="inline-flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/25">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div className="text-left">
              <span className="text-2xl font-bold tracking-tight text-white">IBS Pro</span>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-widest">Admin Portal</p>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border-slate-700 bg-slate-800/50 shadow-2xl backdrop-blur-sm">
            <CardHeader className="space-y-1 text-center pb-2">
              <CardTitle className="text-2xl font-bold tracking-tight text-white">Admin Sign In</CardTitle>
              <CardDescription className="text-sm text-slate-400">Restricted access. Authorized personnel only.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormInput id="admin-username" label="Username" leftIcon={<User className="h-4 w-4" />} autoComplete="username" placeholder="admin" {...field} />
                  )} />

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormInput id="admin-password" label="Password" type={showPassword ? 'text' : 'password'} leftIcon={<Lock className="h-4 w-4" />} autoComplete="current-password" placeholder="••••••••"
                      rightElement={
                        <button type="button" className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-200" onClick={() => setShowPassword(!showPassword)} tabIndex={-1} aria-label="Toggle password visibility">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      } {...field} />
                  )} />

                  <Button type="submit" className="h-11 w-full bg-gradient-to-r from-amber-500 to-orange-600 text-base font-semibold text-white shadow-lg shadow-amber-500/25 hover:from-amber-600 hover:to-orange-700" disabled={loading}>
                    {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /><span>Signing in...</span></>) : 'Sign In to Admin'}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="justify-center pb-6 pt-2">
              <button type="button" onClick={() => setView('landing')} className="text-sm text-slate-400 hover:text-slate-200 transition-colors">&larr; Back to main site</button>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.p variants={fadeUp} className="mt-6 text-center text-xs text-slate-500">This portal is monitored. Unauthorized access attempts are logged.</motion.p>
      </motion.div>
    </div>
  );
}
