'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, Loader2, Zap, Building2, User } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: 'easeOut' } } };
const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

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
          <Input id={id} type={type} placeholder={placeholder} autoComplete={autoComplete} className={`${isRtl ? 'pr-10' : 'pl-10'} ${rightElement ? (isRtl ? 'pl-10' : 'pr-10') : ''} h-11 ${className || ''}`} {...props} />
          {rightElement}
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
}

export default function LoginForm() {
  const { locale, setView } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isRtl = locale === 'ar';

  const formSchema = z.object({
    companyCode: z.string().min(1, isRtl ? 'رمز الشركة مطلوب' : locale === 'fi' ? 'Yrityskoodi vaaditaan' : 'Company code is required'),
    username: z.string().min(1, isRtl ? 'اسم المستخدم مطلوب' : locale === 'fi' ? 'Käyttäjätunnus vaaditaan' : 'Username is required'),
    password: z.string().min(1, isRtl ? 'كلمة المرور مطلوبة' : locale === 'fi' ? 'Salasana vaaditaan' : 'Password is required'),
    rememberMe: z.boolean().optional(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { companyCode: '', username: '', password: '', rememberMe: false },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyCode: values.companyCode, username: values.username, password: values.password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || t('common.error', locale)); return; }
      useAppStore.getState().login(data.user, data.token);
      toast.success(isRtl ? `مرحبًا بعودتك، ${data.user.name}!` : locale === 'fi' ? `Tervetuloa takaisin, ${data.user.name}!` : `Welcome back, ${data.user.name}!`);
    } catch {
      toast.error(isRtl ? 'خطأ في الاتصال بالخادم' : locale === 'fi' ? 'Palvelinyhteysvirhe' : 'Unable to connect to server');
    } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-gradient-to-br from-background via-background to-primary/[0.03] px-4 py-8 sm:py-12" dir={isRtl ? 'rtl' : 'ltr'}>
      <motion.div initial="hidden" animate="visible" variants={stagger} className="w-full max-w-md">
        <motion.div variants={fadeUp} className="mb-8 text-center">
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
              <CardTitle className="text-2xl font-bold tracking-tight">{t('auth.welcome', locale)}</CardTitle>
              <CardDescription className="text-sm">
                {isRtl ? 'أدخل رمز الشركة وبيانات الدخول' : locale === 'fi' ? 'Syötä yrityskoodi ja kirjautumistiedot' : 'Enter your company code and credentials'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="companyCode" render={({ field }) => (
                    <FormInput id="login-company" label={isRtl ? 'رمز الشركة' : locale === 'fi' ? 'Yrityskoodi' : 'Company Code'} isRtl={isRtl}
                      leftIcon={<Building2 className="h-4 w-4" />} autoComplete="organization" placeholder="e.g. DEMO001" className="uppercase" {...field} />
                  )} />

                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormInput id="login-username" label={isRtl ? 'اسم المستخدم' : locale === 'fi' ? 'Käyttäjätunnus' : 'Username'} isRtl={isRtl}
                      leftIcon={<User className="h-4 w-4" />} autoComplete="username" placeholder={isRtl ? 'اسم المستخدم' : 'username'} {...field} />
                  )} />

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>{t('auth.password', locale)}</FormLabel>
                        <button type="button" className="text-xs font-medium text-primary hover:text-primary/80"
                          onClick={() => toast.info(isRtl ? 'ميزة قريباً' : locale === 'fi' ? 'Tulossa pian' : 'Coming soon')}>
                          {t('auth.forgotPassword', locale)}
                        </button>
                      </div>
                      <FormControl>
                        <div className="relative">
                          <Lock className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 ${isRtl ? 'right-3' : 'left-3'}`} />
                          <Input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" autoComplete="current-password"
                            className={`${isRtl ? 'pr-10 pl-10' : 'pl-10 pr-10'} h-11`} {...field} />
                          <button type="button"
                            className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground ${isRtl ? 'left-3' : 'right-3'}`}
                            onClick={() => setShowPassword(!showPassword)} tabIndex={-1} aria-label="Toggle password visibility">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" onCheckedChange={(c) => form.setValue('rememberMe', c === true)}
                      className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                    <label htmlFor="remember" className="cursor-pointer text-sm font-medium text-muted-foreground select-none">
                      {isRtl ? 'تذكرني' : locale === 'fi' ? 'Muista minut' : 'Remember me'}
                    </label>
                  </div>

                  <Button type="submit" className="h-11 w-full bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90" disabled={loading}>
                    {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /><span>{isRtl ? 'جاري تسجيل الدخول...' : 'Signing in...'}</span></>) : t('auth.signIn', locale)}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex-col gap-3 justify-center pb-6 pt-2">
              <p className="text-sm text-muted-foreground">
                {t('auth.noAccount', locale)}{' '}
                <button type="button" className="font-semibold text-primary hover:text-primary/80 hover:underline" onClick={() => setView('register')}>
                  {t('auth.signUp', locale)}
                </button>
              </p>
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="mt-6 text-center">
          <button type="button" onClick={() => setView('landing')}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <svg className={`h-3.5 w-3.5 ${isRtl ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {isRtl ? 'العودة للرئيسية' : locale === 'fi' ? 'Takaisin etusivulle' : 'Back to home'}
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
