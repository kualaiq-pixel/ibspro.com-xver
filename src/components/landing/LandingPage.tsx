'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { t, type Locale } from '@/lib/i18n';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  Globe,
  Menu,
  X,
  FileText,
  Users,
  Calendar,
  BarChart3,
  ClipboardList,
  MessageCircle,
  Moon,
  Sun,
  Star,
  Zap,
  ArrowRight,
  Shield,
  Sparkles,
} from 'lucide-react';

/* ─── Canvas Particle Background ─────────────────────────────── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  hue: number;
  alpha: number;
  life: number;
  maxLife: number;
}

function useParticleCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const { resolvedTheme } = useTheme();

  const initParticles = useCallback((width: number, height: number) => {
    const count = Math.min(Math.floor((width * height) / 12000), 80);
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2.5 + 1,
        hue: 155 + Math.random() * 30,
        alpha: Math.random() * 0.5 + 0.2,
        life: 0,
        maxLife: 400 + Math.random() * 600,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      initParticles(rect.width, rect.height);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mouseleave', () => {
      mouseRef.current = { x: -1000, y: -1000 };
    });

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const isDark = resolvedTheme === 'dark';

      ctx.clearRect(0, 0, w, h);

      // Draw gradient orbs
      const time = Date.now() * 0.0003;
      const orbs = [
        { x: w * 0.25 + Math.sin(time) * 80, y: h * 0.35 + Math.cos(time * 0.7) * 60, r: 220, color: isDark ? 'rgba(16, 185, 129, 0.06)' : 'rgba(16, 185, 129, 0.08)' },
        { x: w * 0.75 + Math.cos(time * 0.8) * 100, y: h * 0.5 + Math.sin(time * 0.6) * 80, r: 260, color: isDark ? 'rgba(52, 211, 153, 0.04)' : 'rgba(52, 211, 153, 0.06)' },
        { x: w * 0.5 + Math.sin(time * 1.1) * 60, y: h * 0.7 + Math.cos(time * 0.9) * 70, r: 200, color: isDark ? 'rgba(5, 150, 105, 0.05)' : 'rgba(5, 150, 105, 0.07)' },
      ];

      for (const orb of orbs) {
        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
        gradient.addColorStop(0, orb.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
      }

      const particles = particlesRef.current;

      for (const p of particles) {
        p.life++;
        if (p.life > p.maxLife) {
          p.life = 0;
          p.x = Math.random() * w;
          p.y = Math.random() * h;
          p.alpha = Math.random() * 0.5 + 0.2;
        }

        // Mouse repulsion
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120 && dist > 0) {
          const force = (120 - dist) / 120 * 0.8;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }

        // Damping
        p.vx *= 0.99;
        p.vy *= 0.99;

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Fade in/out
        const lifeFrac = p.life / p.maxLife;
        let alpha = p.alpha;
        if (lifeFrac < 0.1) alpha *= lifeFrac / 0.1;
        if (lifeFrac > 0.9) alpha *= (1 - lifeFrac) / 0.1;

        // Draw particle
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        const baseColor = isDark ? `hsla(${p.hue}, 70%, 60%, ${alpha})` : `hsla(${p.hue}, 80%, 40%, ${alpha * 0.8})`;
        gradient.addColorStop(0, baseColor);
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      // Draw connections
      const maxDist = 120;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const ddx = a.x - b.x;
          const ddy = a.y - b.y;
          const d = Math.sqrt(ddx * ddx + ddy * ddy);
          if (d < maxDist) {
            const lineAlpha = (1 - d / maxDist) * 0.15;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = isDark ? `rgba(52, 211, 153, ${lineAlpha})` : `rgba(5, 150, 105, ${lineAlpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
    };
  }, [canvasRef, initParticles, resolvedTheme]);
}

/* ─── Animation Helpers ──────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

function AnimatedSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={stagger}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Feature Data ───────────────────────────────────────────── */
const features = [
  {
    icon: FileText,
    titleKey: 'landing.feature.invoices' as const,
    descKey: 'landing.feature.invoices.desc' as const,
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Users,
    titleKey: 'landing.feature.customers' as const,
    descKey: 'landing.feature.customers.desc' as const,
    gradient: 'from-teal-500 to-cyan-600',
  },
  {
    icon: Calendar,
    titleKey: 'landing.feature.bookings' as const,
    descKey: 'landing.feature.bookings.desc' as const,
    gradient: 'from-emerald-600 to-green-500',
  },
  {
    icon: BarChart3,
    titleKey: 'landing.feature.reports' as const,
    descKey: 'landing.feature.reports.desc' as const,
    gradient: 'from-green-500 to-emerald-600',
  },
  {
    icon: ClipboardList,
    titleKey: 'landing.feature.workorders' as const,
    descKey: 'landing.feature.workorders.desc' as const,
    gradient: 'from-teal-600 to-emerald-500',
  },
  {
    icon: MessageCircle,
    titleKey: 'landing.feature.chat' as const,
    descKey: 'landing.feature.chat.desc' as const,
    gradient: 'from-cyan-500 to-teal-600',
  },
];

/* ─── Pricing Feature Lists ──────────────────────────────────── */
const pricingFeatures = [
  'Unlimited invoices & customers',
  'Booking & work order management',
  'Reports & analytics dashboard',
  'Live chat support',
  'Multi-language support',
  'Data export (PDF, CSV)',
  'Secure cloud storage',
  'Email notifications',
];

/* ─── Testimonials Data ──────────────────────────────────────── */
const testimonials = [
  {
    name: 'Sarah Mitchell',
    role: 'CEO, BrightPath Solutions',
    quote: 'IBS Pro transformed how we manage our billing. Invoice creation went from 30 minutes to under 2. The automated tax calculations save us hours every month.',
    avatar: 'SM',
    rating: 5,
  },
  {
    name: 'Marcus Virtanen',
    role: 'Operations Manager, Nordic Tech',
    quote: 'The booking system and customer CRM work seamlessly together. Our team productivity increased by 40% since switching to IBS Pro. Highly recommended!',
    avatar: 'MV',
    rating: 5,
  },
  {
    name: 'Fatima Al-Hassan',
    role: 'Founder, Gulf Trade Services',
    quote: 'Excellent real-time reporting that gives us clear visibility into our finances. The multi-language support makes it perfect for our international team.',
    avatar: 'FA',
    rating: 5,
  },
];

/* ─── Language Options ───────────────────────────────────────── */
const locales: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { setView, locale, setLocale } = useAppStore();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroCanvasRef = useRef<HTMLCanvasElement>(null);

  const isRtl = locale === 'ar';

  useParticleCanvas(heroCanvasRef);

  const scrollTo = useCallback((id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className={`flex min-h-screen flex-col bg-background text-foreground ${isRtl ? 'rtl' : 'ltr'}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* ─── NAVIGATION BAR ──────────────────────────────────── */}
      <header className="fixed top-0 right-0 left-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              IBS <span className="text-primary">Pro</span>
            </span>
          </motion.div>

          {/* Desktop Nav Links */}
          <div className="hidden items-center gap-1 md:flex">
            {['features', 'pricing', 'testimonials'].map((section) => (
              <button
                key={section}
                onClick={() => scrollTo(section)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(`landing.nav.${section === 'features' ? 'features' : section === 'pricing' ? 'pricing' : 'testimonials'}` as any, locale)}
              </button>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {locales.map((l) => (
                  <DropdownMenuItem
                    key={l.code}
                    onClick={() => setLocale(l.code)}
                    className={locale === l.code ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">{l.flag}</span>
                    {l.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* Desktop: Sign In + Get Started */}
            <div className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" size="sm" onClick={() => setView('login')}>
                {t('landing.login', locale)}
              </Button>
              <Button
                size="sm"
                onClick={() => setView('register')}
                className="bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
              >
                {t('landing.cta', locale)}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </nav>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-border/50 bg-background md:hidden"
            >
              <div className="space-y-1 px-4 py-3">
                {['features', 'pricing', 'testimonials'].map((section) => (
                  <button
                    key={section}
                    onClick={() => scrollTo(section)}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {t(`landing.nav.${section === 'features' ? 'features' : section === 'pricing' ? 'pricing' : 'testimonials'}` as any, locale)}
                  </button>
                ))}
                <div className="flex gap-2 pt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => { setView('login'); setMobileMenuOpen(false); }}>
                    {t('landing.login', locale)}
                  </Button>
                  <Button size="sm" className="flex-1" onClick={() => { setView('register'); setMobileMenuOpen(false); }}>
                    {t('landing.cta', locale)}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─── HERO SECTION ────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden pt-16">
        {/* Canvas Background */}
        <canvas
          ref={heroCanvasRef}
          className="absolute inset-0 h-full w-full"
          style={{ pointerEvents: 'auto' }}
        />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            {/* Pill Badge */}
            <motion.div variants={fadeUp} className="mb-6 flex justify-center">
              <Badge variant="secondary" className="gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {locale === 'ar' ? 'النظام الجيل التالي لإدارة الأعمال' : locale === 'fi' ? 'Uuden sukupolven yrityshallintajärjestelmä' : 'Next-generation business management'}
              </Badge>
            </motion.div>

            {/* Tagline */}
            <motion.h1
              variants={fadeUp}
              className="mx-auto max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
            >
              {t('landing.tagline', locale).split(' ').map((word, i, arr) => (
                <span key={i}>
                  {i === arr.length - 2 ? (
                    <>
                      {word}{' '}
                      <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-clip-text text-transparent">
                        {arr[arr.length - 1]}
                      </span>
                    </>
                  ) : i === arr.length - 1 ? null : (
                    <>{word} </>
                  )}
                </span>
              ))}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg md:text-xl"
            >
              {t('landing.subtitle', locale)}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => setView('register')}
                className="h-12 w-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 sm:w-auto"
              >
                {t('landing.cta', locale)}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setView('login')}
                className="h-12 w-full border-border/60 px-8 text-base font-medium transition-all hover:scale-[1.02] sm:w-auto"
              >
                {t('landing.login', locale)}
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div variants={fadeIn} className="mt-16 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-primary" />
                <span>{locale === 'ar' ? 'موثوق من قبل' : locale === 'fi' ? 'Luotettu' : 'Trusted by'} 2,000+ {locale === 'ar' ? 'شركات' : locale === 'fi' ? 'yritystä' : 'businesses'}</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-2 text-sm text-muted-foreground">4.9/5 {locale === 'ar' ? 'تقييم' : locale === 'fi' ? 'arvosana' : 'rating'}</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Gradient Fade */}
        <div className="absolute right-0 bottom-0 left-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ─── FEATURES SECTION ────────────────────────────────── */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t('landing.features', locale)}
            </motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t('landing.features.subtitle', locale)}
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.titleKey} variants={fadeUp}>
                  <Card className="group h-full border-border/50 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
                    <CardHeader className="pb-2">
                      <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} shadow-md`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <CardTitle className="text-lg">{t(feature.titleKey, locale)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">
                        {t(feature.descKey, locale)}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── PRICING SECTION ─────────────────────────────────── */}
      <section id="pricing" className="relative py-24 sm:py-32">
        {/* Subtle Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t('landing.pricing', locale)}
            </motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t('landing.pricing.subtitle', locale)}
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="mt-16 grid gap-8 lg:grid-cols-2">
            {/* Monthly Plan */}
            <motion.div variants={fadeUp}>
              <Card className="h-full border-border/50 p-0 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl">{t('landing.pricing.monthly', locale)}</CardTitle>
                  <CardDescription>{locale === 'ar' ? 'مرن، بدون التزام' : locale === 'fi' ? 'Joustava, sitoutumatta' : 'Flexible, no commitment'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold tracking-tight">{t('landing.pricing.monthly.price', locale)}</span>
                    <span className="text-lg text-muted-foreground">{t('landing.pricing.monthly.period', locale)}</span>
                  </div>
                  <ul className="space-y-3">
                    {pricingFeatures.map((feat) => (
                      <li key={feat} className="flex items-start gap-3 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full border-primary/30 text-base font-semibold hover:bg-primary/5"
                    onClick={() => setView('register')}
                  >
                    {t('landing.pricing.cta', locale)}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>

            {/* Yearly Plan */}
            <motion.div variants={fadeUp}>
              <Card className="relative h-full overflow-hidden border-primary/40 p-0 shadow-xl shadow-primary/10 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/15">
                {/* Popular Badge */}
                <div className="absolute top-0 right-0 left-0 flex justify-center">
                  <Badge className="mt-0 rounded-b-lg rounded-t-none bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground">
                    {t('landing.pricing.popular', locale)}
                  </Badge>
                </div>
                <CardHeader className="pb-2 pt-8">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-xl">{t('landing.pricing.yearly', locale)}</CardTitle>
                    <Badge className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      {t('landing.pricing.yearly.save', locale)}
                    </Badge>
                  </div>
                  <CardDescription>{locale === 'ar' ? 'وفّر أكثر مع الخطة السنوية' : locale === 'fi' ? 'Säästä enemmän vuositilauksella' : 'Save more with the yearly plan'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold tracking-tight text-primary">{t('landing.pricing.yearly.price', locale)}</span>
                    <span className="text-lg text-muted-foreground">{t('landing.pricing.yearly.period', locale)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {locale === 'ar'
                      ? 'ما يعادل 30€ شهريًا فقط'
                      : locale === 'fi'
                        ? 'Vain 30€/kk'
                        : 'Only €30/month equivalent'}
                  </p>
                  <ul className="space-y-3">
                    {pricingFeatures.map((feat) => (
                      <li key={feat} className="flex items-start gap-3 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    size="lg"
                    className="w-full bg-primary text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
                    onClick={() => setView('register')}
                  >
                    {t('landing.pricing.cta', locale)}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── TESTIMONIALS SECTION ─────────────────────────────── */}
      <section id="testimonials" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {t('landing.testimonials', locale)}
            </motion.h2>
            <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
              {t('landing.testimonials.subtitle', locale)}
            </motion.p>
          </AnimatedSection>

          <AnimatedSection className="mt-16 grid gap-8 md:grid-cols-3">
            {testimonials.map((item, idx) => (
              <motion.div key={idx} variants={fadeUp}>
                <Card className="h-full border-border/50 transition-all duration-300 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
                  <CardHeader className="pb-2">
                    <div className="flex gap-0.5">
                      {[...Array(item.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      &ldquo;{item.quote}&rdquo;
                    </p>
                  </CardContent>
                  <CardFooter className="gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-semibold text-white">
                        {item.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.role}</p>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── CTA SECTION ─────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <motion.div
              variants={fadeUp}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/90 via-primary to-emerald-700 p-10 text-center text-primary-foreground shadow-2xl shadow-primary/20 sm:p-16"
            >
              {/* Decorative Elements */}
              <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-white/10" />
              <div className="absolute -bottom-16 -left-16 h-32 w-32 rounded-full bg-white/5" />

              <h2 className="relative text-3xl font-bold tracking-tight sm:text-4xl">
                {locale === 'ar'
                  ? 'جاهز لتحويل أعمالك؟'
                  : locale === 'fi'
                    ? 'Valmis tehostamaan liiketoimintaasi?'
                    : 'Ready to transform your business?'}
              </h2>
              <p className="relative mx-auto mt-4 max-w-xl text-base opacity-90 sm:text-lg">
                {locale === 'ar'
                  ? 'ابدأ فترتك التجريبية المجانية اليوم واكتشف كيف يمكن لـ IBS Pro تبسيط عملياتك.'
                  : locale === 'fi'
                    ? 'Aloita ilmainen kokeilusi tänään ja huomaa, miten IBS Pro yksinkertaistaa toimintojasi.'
                    : 'Start your free trial today and discover how IBS Pro can streamline your operations.'}
              </p>
              <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={() => setView('register')}
                  className="h-12 bg-white px-8 text-base font-semibold text-primary shadow-lg transition-all hover:scale-[1.02] hover:bg-white/90 sm:w-auto"
                >
                  {t('landing.cta', locale)}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setView('login')}
                  className="h-12 w-full border-white/30 bg-transparent px-8 text-base font-medium text-white transition-all hover:bg-white/10 hover:text-white sm:w-auto"
                >
                  {t('landing.login', locale)}
                </Button>
              </div>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────── */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-bold tracking-tight">
                IBS <span className="text-primary">Pro</span>
              </span>
            </div>

            {/* Footer Links */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <button className="transition-colors hover:text-foreground">{t('landing.footer.privacy', locale)}</button>
              <button className="transition-colors hover:text-foreground">{t('landing.footer.terms', locale)}</button>
              <button className="transition-colors hover:text-foreground">{t('landing.footer.contact', locale)}</button>
              <button className="transition-colors hover:text-foreground/60" onClick={() => setView('admin-login')}>Admin</button>
            </div>

            {/* Copyright */}
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} IBS Pro. {t('landing.footer.rights', locale)}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
