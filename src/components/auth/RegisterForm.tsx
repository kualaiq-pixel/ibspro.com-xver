'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, User, Building2, Loader2, Zap, Check, AtSign } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  score = Math.min(score, 4);
  return { score, color: ['', 'bg-red-500', 'bg-amber-500', 'bg-yellow-500', 'bg-emerald-500'][score], label: ['', 'Weak', 'Fair', 'Good', 'Strong'][score] };
}

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } } };
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

function FormInput({ label, id, leftIcon, rightElement, type = 'text', autoComplete, placeholder, className, isRtl, ...props }: {
  label?: string; id: string; leftIcon?: React.ReactNode; rightElement?: React.ReactNode;
  type?: string; autoComplete?: string; placeholder?: string; className?: string; isRtl?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FormItem>
      {label && <FormLabel>{label}</FormLabel>}
      <FormControl>
        <div className="relative">
          {leftIcon && <div className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 ${isRtl ? 'right-3' : 'left-3'}`}>{leftIcon}</div>}
          <Input id={id} type={type} placeholder={placeholder} autoComplete={autoComplete}
            className={`${isRtl ? 'pr-10' : 'pl-10'} ${rightElement ? (isRtl ? 'pl-10' : 'pr-10') : ''} h-11 ${className || ''}`} {...props} />
          {rightElement}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

export default function RegisterForm() {
  const { locale, setView } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const isRtl = locale === 'ar';

  const formSchema = useMemo(() => z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    username: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers, and underscores'),
    email: z.string().email('Please enter a valid email').optional().or(z.literal('')),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    companyName: z.string().min(2, 'Company name is required'),
    plan: z.enum(['monthly', 'yearly']),
    terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
  }).refine((d) => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] }), [locale]);

  type FormValues = z.infer<typeof formSchema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', username: '', email: '', password: '', confirmPassword: '', companyName: '', plan: 'monthly', terms: undefined as unknown as true },
  });

  const password = form.watch('password');
  const strength = useMemo(() => getPasswordStrength(password), [password]);

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: values.name, username: values.username, email: values.email || undefined, password: values.password, companyName: values.companyName, plan: values.plan }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || t('common.error', locale)); return; }
      if (data.companyCode) setGeneratedCode(data.companyCode);
      toast.success(`Account created! Your company code is: ${data.companyCode}`, { duration: 8000 });
      useAppStore.getState().login(data.user, data.token);
    } catch { toast.error('Unable to connect to server'); } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-background via-background to-primary/[0.03] px-4 py-8 sm:py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <motion.div initial="hidden" animate="visible" variants={stagger} className="w-full max-w-md">
        <motion.div variants={fadeUp} className="mb-6 text-center">
          <div className="inline-flex items-center gap-2.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">IBS <span className="text-primary">Pro</span></span>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="border-border/60 shadow-2xl shadow-black/[0.04] dark:shadow-black/[0.2]">
            <CardHeader className="space-y-1 text-center pb-2">
              <CardTitle className="text-xl font-bold tracking-tight">{t('auth.createAccount', locale)}</CardTitle>
              <CardDescription className="text-sm">{isRtl ? 'أنشئ حساب شركتك' : locale === 'fi' ? 'Luo yritystilisi' : 'Create your company account'}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormInput id="reg-name" label={t('auth.name', locale)} isRtl={isRtl} leftIcon={<User className="h-4 w-4" />} autoComplete="name" placeholder="Full Name" {...field} />
                  )} />

                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormInput id="reg-username" label={isRtl ? 'اسم المستخدم' : locale === 'fi' ? 'Käyttäjätunnus' : 'Username'} isRtl={isRtl} leftIcon={<AtSign className="h-4 w-4" />} autoComplete="username" placeholder="username" className="lowercase" {...field} />
                  )} />

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormInput id="reg-email" label={t('auth.email', locale)} isRtl={isRtl} leftIcon={<AtSign className="h-4 w-4" />} type="email" autoComplete="email" placeholder="email@example.com" {...field} />
                  )} />

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.password', locale)}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 ${isRtl ? 'right-3' : 'left-3'}`} />
                          <Input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password"
                            className={`${isRtl ? 'pr-10 pl-10' : 'pl-10 pr-10'} h-11`} {...field} />
                          <button type="button" className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground ${isRtl ? 'left-3' : 'right-3'}`}
                            onClick={() => setShowPassword(!showPassword)} tabIndex={-1} aria-label="Toggle password visibility">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      {password && (
                        <div className="flex items-center gap-2 pt-1">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full transition-all duration-300 ${strength.color}`} style={{ width: `${(strength.score / 4) * 100}%` }} />
                          </div>
                          <span className="text-xs font-medium text-muted-foreground">{strength.label}</span>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormInput id="reg-confirm" label={t('auth.confirmPassword', locale)} isRtl={isRtl}
                      leftIcon={<Lock className="h-4 w-4" />} type={showConfirm ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••"
                      rightElement={
                        <button type="button" className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground ${isRtl ? 'left-3' : 'right-3'}`}
                          onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1} aria-label="Toggle confirm password">
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      } {...field} />
                  )} />

                  <FormField control={form.control} name="companyName" render={({ field }) => (
                    <FormInput id="reg-company" label={t('auth.companyName', locale)} isRtl={isRtl} leftIcon={<Building2 className="h-4 w-4" />} autoComplete="organization" placeholder="My Company" {...field} />
                  )} />

                  <FormField control={form.control} name="plan" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>{isRtl ? 'اختر خطتك' : 'Choose your plan'}</FormLabel>
                      <FormControl>
                        <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-2 gap-3">
                          <label className={`relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${field.value === 'monthly' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/40'}`}>
                            <RadioGroupItem value="monthly" className="sr-only" />
                            {field.value === 'monthly' && <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary"><Check className="h-3 w-3 text-white" /></div>}
                            <span className="text-lg font-bold">€40</span>
                            <span className="text-xs text-muted-foreground">/month</span>
                          </label>
                          <label className={`relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all ${field.value === 'yearly' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border hover:border-primary/40'}`}>
                            <RadioGroupItem value="yearly" className="sr-only" />
                            {field.value === 'yearly' && <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary"><Check className="h-3 w-3 text-white" /></div>}
                            <span className="text-lg font-bold text-primary">€360</span>
                            <span className="text-xs text-muted-foreground">/year</span>
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Save 25%</span>
                          </label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="terms" render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-lg border border-border/60 p-3">
                      <FormControl className="mt-0.5">
                        <Checkbox id="reg-terms" checked={field.value === true} onCheckedChange={field.onChange} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="reg-terms" className="cursor-pointer text-sm font-normal text-muted-foreground">
                          {isRtl ? 'أوافق على الشروط والأحكام' : locale === 'fi' ? 'Hyväksyn käyttöehdot' : 'I agree to the Terms & Conditions'}
                        </Label>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )} />

                  <Button type="submit" className="h-11 w-full bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90" disabled={loading}>
                    {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /><span>{isRtl ? 'جاري الإنشاء...' : 'Creating...'}</span></>) : t('auth.signUp', locale)}
                  </Button>

                  {generatedCode && (
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{isRtl ? 'رمز شركتك' : 'Your Company Code'}</p>
                      <p className="text-2xl font-bold font-mono tracking-widest text-primary">{generatedCode}</p>
                      <p className="text-xs text-muted-foreground mt-1">{isRtl ? 'احفظ هذا الرمز! ستحتاجه لتسجيل الدخول' : 'Save this code! You will need it to sign in.'}</p>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
            <CardFooter className="justify-center pb-6 pt-2">
              <p className="text-sm text-muted-foreground">
                {t('auth.hasAccount', locale)}{' '}
                <button type="button" className="font-semibold text-primary hover:text-primary/80 hover:underline" onClick={() => setView('login')}>{t('auth.signIn', locale)}</button>
              </p>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-6 text-center">
          <button type="button" onClick={() => setView('landing')} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <svg className={`h-3.5 w-3.5 ${isRtl ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {isRtl ? 'العودة للرئيسية' : 'Back to home'}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
