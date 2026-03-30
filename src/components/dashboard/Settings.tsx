'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Building2,
  SettingsIcon,
  Globe,
  Bell,
  Sun,
  Moon,
  Monitor,
  Lock,
  Mail,
  Phone,
  MapPin,
  Camera,
  Loader2,
  Save,
  CheckCircle2,
} from 'lucide-react';

/* ---------- animation ---------- */

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

/* ====================================================================
   Settings Component
   ==================================================================== */

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  language: string;
  currency: string;
}

interface CompanyData {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  vatNumber: string | null;
  website: string | null;
  logo: string | null;
}

export default function Settings() {
  const { locale, user, setLocale, setTheme } = useAppStore();
  const userId = user?.id;

  /* ---- data state ---- */
  const [userData, setUserData] = useState<UserData | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [loading, setLoading] = useState(true);

  /* ---- form states ---- */
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    avatar: '',
    language: 'en',
    currency: 'EUR',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [companyForm, setCompanyForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    postalCode: '',
    vatNumber: '',
    website: '',
    logo: '',
  });

  /* ---- preferences ---- */
  const [theme, setThemeLocal] = useState<'light' | 'dark' | 'system'>('system');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    invoiceReminders: true,
    bookingAlerts: true,
    workOrderUpdates: true,
    certificateExpiry: true,
    weeklyReport: false,
  });

  /* ---- saving states ---- */
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  /* ---- fetch settings ---- */
  const fetchSettings = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/settings?userId=${userId}`);
      const data = await res.json();
      if (res.ok) {
        setUserData(data.user);
        setCompanyData(data.company);
        if (data.user) {
          setProfileForm({
            name: data.user.name || '',
            email: data.user.email || '',
            phone: data.user.phone || '',
            avatar: data.user.avatar || '',
            language: data.user.language || 'en',
            currency: data.user.currency || 'EUR',
          });
        }
        if (data.company) {
          setCompanyForm({
            name: data.company.name || '',
            email: data.company.email || '',
            phone: data.company.phone || '',
            address: data.company.address || '',
            city: data.company.city || '',
            country: data.company.country || '',
            postalCode: data.company.postalCode || '',
            vatNumber: data.company.vatNumber || '',
            website: data.company.website || '',
            logo: data.company.logo || '',
          });
        }
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setLoading(false);
    }
  }, [userId, locale]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  /* ---- save handlers ---- */
  const handleSaveProfile = async () => {
    if (!userId) return;
    try {
      setSavingProfile(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          profile: profileForm,
        }),
      });
      if (res.ok) {
        toast.success(t('settings.savedSuccess' as TranslationKey, locale));
        // Update store locale
        if (profileForm.language !== locale) {
          setLocale(profileForm.language as 'en' | 'fi' | 'ar');
        }
        // Update store user
        if (user) {
          const { setUser } = useAppStore.getState();
          setUser({ ...user, name: profileForm.name, email: profileForm.email, language: profileForm.language as 'en' | 'fi' | 'ar', currency: profileForm.currency });
        }
      } else {
        toast.error(t('common.error', locale));
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!userId || !companyData) return;
    try {
      setSavingCompany(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          company: { ...companyForm, companyId: companyData.id },
        }),
      });
      if (res.ok) {
        toast.success(t('settings.savedSuccess' as TranslationKey, locale));
        if (user) {
          const { setUser } = useAppStore.getState();
          setUser({ ...user, companyName: companyForm.name });
        }
      } else {
        toast.error(t('common.error', locale));
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setSavingCompany(false);
    }
  };

  const handleSavePassword = async () => {
    if (!passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error(t('settings.passwordMismatch' as TranslationKey, locale));
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error(t('auth.password' as TranslationKey, locale));
      return;
    }
    try {
      setSavingPassword(true);
      // Simulated password change (no real backend auth change)
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(t('settings.savedSuccess' as TranslationKey, locale));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      // Update theme
      setTheme(theme);
      // Save notification preferences to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('ibs_notifications', JSON.stringify(notifications));
      }
      toast.success(t('settings.savedSuccess' as TranslationKey, locale));
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setSavingPrefs(false);
    }
  };

  /* ---- theme icon ---- */
  const getThemeIcon = (themeValue: string) => {
    switch (themeValue) {
      case 'light': return <Sun className="h-4 w-4" />;
      case 'dark': return <Moon className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  /* ---- load notification prefs from localStorage ---- */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ibs_notifications');
      if (stored) {
        try { setNotifications(JSON.parse(stored)); } catch { /* use defaults */ }
      }
    }
  }, []);

  /* ==================================================================
     RENDER
     ================================================================== */
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6 p-6">
      {/* ---------- Header ---------- */}
      <motion.div variants={fadeUp}>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {t('settings.title' as TranslationKey, locale)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t('settings.subtitle' as TranslationKey, locale)}
        </p>
      </motion.div>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <Tabs defaultValue="profile" className="space-y-6">
          <motion.div variants={fadeUp}>
            <TabsList className="h-10">
              <TabsTrigger value="profile" className="gap-2 text-sm">
                <User className="h-4 w-4" />
                {t('settings.profile' as TranslationKey, locale)}
              </TabsTrigger>
              <TabsTrigger value="company" className="gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                {t('settings.company' as TranslationKey, locale)}
              </TabsTrigger>
              <TabsTrigger value="preferences" className="gap-2 text-sm">
                <SettingsIcon className="h-4 w-4" />
                {t('settings.preferences' as TranslationKey, locale)}
              </TabsTrigger>
            </TabsList>
          </motion.div>

          {/* ============================================================
              PROFILE TAB
              ============================================================ */}
          <TabsContent value="profile" className="space-y-6">
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5 text-emerald-600" />
                    {t('settings.profileInfo' as TranslationKey, locale)}
                  </CardTitle>
                  <CardDescription>{t('settings.profileDesc' as TranslationKey, locale)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <Avatar className="h-20 w-20">
                        <AvatarImage src={profileForm.avatar || userData?.avatar || undefined} />
                        <AvatarFallback className="text-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                          {profileForm.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        onClick={() => {
                          // Simulated upload
                          toast.info(t('settings.avatarUpload' as TranslationKey, locale));
                        }}>
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{profileForm.name}</p>
                      <p className="text-sm text-muted-foreground">{profileForm.email}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {t('auth.name' as TranslationKey, locale)}
                      </Label>
                      <Input
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {t('auth.email' as TranslationKey, locale)}
                      </Label>
                      <Input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Phone + Language */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {t('customers.phone' as TranslationKey, locale)}
                      </Label>
                      <Input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {t('settings.language' as TranslationKey, locale)}
                      </Label>
                      <Select value={profileForm.language} onValueChange={(v) => setProfileForm({ ...profileForm, language: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="fi">Suomi</SelectItem>
                          <SelectItem value="ar">العربية</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Currency */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {t('settings.currency' as TranslationKey, locale)}
                      </Label>
                      <Select value={profileForm.currency} onValueChange={(v) => setProfileForm({ ...profileForm, currency: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {t('settings.save' as TranslationKey, locale)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Change Password */}
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lock className="h-5 w-5 text-emerald-600" />
                    {t('settings.changePassword' as TranslationKey, locale)}
                  </CardTitle>
                  <CardDescription>{t('settings.passwordDesc' as TranslationKey, locale)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>{t('settings.currentPassword' as TranslationKey, locale)}</Label>
                    <Input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>{t('auth.password' as TranslationKey, locale)}</Label>
                      <Input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t('auth.confirmPassword' as TranslationKey, locale)}</Label>
                      <Input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSavePassword}
                      disabled={!passwordForm.currentPassword || !passwordForm.newPassword || savingPassword}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      {t('settings.updatePassword' as TranslationKey, locale)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ============================================================
              COMPANY TAB
              ============================================================ */}
          <TabsContent value="company" className="space-y-6">
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-emerald-600" />
                    {t('settings.companyInfo' as TranslationKey, locale)}
                  </CardTitle>
                  <CardDescription>{t('settings.companyDesc' as TranslationKey, locale)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo */}
                  <div className="flex items-center gap-6">
                    <div className="relative group">
                      <div className="h-20 w-20 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center border-2 border-dashed border-emerald-300 dark:border-emerald-700">
                        {companyForm.logo ? (
                          <img src={companyForm.logo} alt="Logo" className="h-full w-full rounded-xl object-cover" />
                        ) : (
                          <Building2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                        )}
                      </div>
                      <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        onClick={() => {
                          toast.info(t('settings.avatarUpload' as TranslationKey, locale));
                        }}>
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{companyForm.name || user?.companyName || 'Company'}</p>
                      <p className="text-sm text-muted-foreground">{companyForm.email || '—'}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Company Name + Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {t('auth.companyName' as TranslationKey, locale)}
                      </Label>
                      <Input
                        value={companyForm.name}
                        onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {t('auth.email' as TranslationKey, locale)}
                      </Label>
                      <Input
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Phone + Website */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {t('customers.phone' as TranslationKey, locale)}
                      </Label>
                      <Input
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        {t('settings.website' as TranslationKey, locale)}
                      </Label>
                      <Input
                        value={companyForm.website}
                        onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                        placeholder="https://"
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Address + City */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        {t('customers.address' as TranslationKey, locale)}
                      </Label>
                      <Input
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t('customers.city' as TranslationKey, locale)}</Label>
                      <Input
                        value={companyForm.city}
                        onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Country + Postal Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>{t('customers.country' as TranslationKey, locale)}</Label>
                      <Input
                        value={companyForm.country}
                        onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t('settings.postalCode' as TranslationKey, locale)}</Label>
                      <Input
                        value={companyForm.postalCode}
                        onChange={(e) => setCompanyForm({ ...companyForm, postalCode: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* VAT Number */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>{t('settings.vatNumber' as TranslationKey, locale)}</Label>
                      <Input
                        value={companyForm.vatNumber}
                        onChange={(e) => setCompanyForm({ ...companyForm, vatNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveCompany}
                      disabled={savingCompany}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                    >
                      {savingCompany ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {t('settings.save' as TranslationKey, locale)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ============================================================
              PREFERENCES TAB
              ============================================================ */}
          <TabsContent value="preferences" className="space-y-6">
            {/* Theme */}
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sun className="h-5 w-5 text-emerald-600" />
                    {t('settings.theme' as TranslationKey, locale)}
                  </CardTitle>
                  <CardDescription>{t('settings.themeDesc' as TranslationKey, locale)}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {(['light', 'dark', 'system'] as const).map((option) => (
                      <button
                        key={option}
                        onClick={() => setThemeLocal(option)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                          theme === option
                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'border-border hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        {getThemeIcon(option)}
                        <span className="text-sm font-medium">
                          {t(`settings.${option}` as TranslationKey, locale)}
                        </span>
                        {theme === option && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Notifications */}
            <motion.div variants={fadeUp}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Bell className="h-5 w-5 text-emerald-600" />
                    {t('settings.notifications' as TranslationKey, locale)}
                  </CardTitle>
                  <CardDescription>{t('settings.notifDesc' as TranslationKey, locale)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(Object.entries(notifications) as [string, boolean][]).map(([key, value]) => {
                    const labelKey = `settings.notif.${key}` as TranslationKey;
                    return (
                      <div key={key} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{t(labelKey, locale)}</p>
                        </div>
                        <Switch
                          checked={value}
                          onCheckedChange={(checked) =>
                            setNotifications((prev) => ({ ...prev, [key]: checked }))
                          }
                        />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>

            {/* Save Preferences */}
            <motion.div variants={fadeUp} className="flex justify-end">
              <Button
                onClick={handleSavePreferences}
                disabled={savingPrefs}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              >
                {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t('settings.save' as TranslationKey, locale)}
              </Button>
            </motion.div>
          </TabsContent>
        </Tabs>
      )}
    </motion.div>
  );
}
