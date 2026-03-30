'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  Loader2,
  Globe,
  CreditCard,
  Bell,
  Wrench,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const CURRENCIES = [
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'SEK', label: 'SEK (kr)' },
  { value: 'NOK', label: 'NOK (kr)' },
  { value: 'DKK', label: 'DKK (kr)' },
  { value: 'AED', label: 'AED (د.إ)' },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'fi', label: 'Suomi (Finnish)' },
  { value: 'ar', label: 'العربية (Arabic)' },
];

interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  defaultCurrency: string;
  defaultLanguage: string;
  monthlyPrice: number;
  yearlyPrice: number;
  trialDays: number;
  emailNotifications: boolean;
  chatNotifications: boolean;
  maintenanceMode: boolean;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'IBS Pro',
  supportEmail: 'support@ibspro.com',
  defaultCurrency: 'EUR',
  defaultLanguage: 'en',
  monthlyPrice: 40,
  yearlyPrice: 360,
  trialDays: 14,
  emailNotifications: true,
  chatNotifications: true,
  maintenanceMode: false,
};

export default function AdminSettings() {
  const { locale } = useAppStore();
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
      }
      // If API fails, we keep defaults — page still renders
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSetting = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast.success(t('settings.savedSuccess', locale));
        setHasChanges(false);
      } else {
        toast.error(t('common.error', locale));
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('admin.systemSettings', locale)}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('admin.systemSettingsDesc', locale)}
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2 shrink-0"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t('common.save', locale)}
          </Button>
        </div>
      </motion.div>

      {/* Platform Settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Globe className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {t('admin.platformSettings', locale) || 'Platform Settings'}
                </CardTitle>
                <CardDescription>
                  {t('admin.platformSettingsDesc', locale) || 'Configure your platform identity and defaults'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="platformName">{t('admin.appName', locale)}</Label>
                <Input
                  id="platformName"
                  value={settings.platformName}
                  onChange={(e) => updateSetting('platformName', e.target.value)}
                  placeholder="IBS Pro"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">{t('admin.supportEmail', locale)}</Label>
                <Input
                  id="supportEmail"
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => updateSetting('supportEmail', e.target.value)}
                  placeholder="support@example.com"
                />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultCurrency">{t('admin.defaultCurrency', locale) || 'Default Currency'}</Label>
                <Select
                  value={settings.defaultCurrency}
                  onValueChange={(v) => updateSetting('defaultCurrency', v)}
                >
                  <SelectTrigger id="defaultCurrency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultLanguage">{t('admin.defaultLanguage', locale) || 'Default Language'}</Label>
                <Select
                  value={settings.defaultLanguage}
                  onValueChange={(v) => updateSetting('defaultLanguage', v)}
                >
                  <SelectTrigger id="defaultLanguage" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Subscription Settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <CreditCard className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {t('admin.subscriptionSettings', locale) || 'Subscription Settings'}
                </CardTitle>
                <CardDescription>
                  {t('admin.subscriptionSettingsDesc', locale) || 'Configure pricing and trial period'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-5">
            <div className="grid gap-5 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice">{t('admin.monthlyPrice', locale) || 'Monthly Price'}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {settings.defaultCurrency === 'EUR' ? '€' : settings.defaultCurrency}
                  </span>
                  <Input
                    id="monthlyPrice"
                    type="number"
                    min={0}
                    value={settings.monthlyPrice}
                    onChange={(e) => updateSetting('monthlyPrice', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearlyPrice">{t('admin.yearlyPrice', locale) || 'Yearly Price'}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {settings.defaultCurrency === 'EUR' ? '€' : settings.defaultCurrency}
                  </span>
                  <Input
                    id="yearlyPrice"
                    type="number"
                    min={0}
                    value={settings.yearlyPrice}
                    onChange={(e) => updateSetting('yearlyPrice', parseFloat(e.target.value) || 0)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trialDays">{t('admin.defaultTrialDays', locale)}</Label>
                <Input
                  id="trialDays"
                  type="number"
                  min={0}
                  value={settings.trialDays}
                  onChange={(e) => updateSetting('trialDays', parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
            {/* Savings badge */}
            {settings.monthlyPrice > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {Math.round((1 - settings.yearlyPrice / (settings.monthlyPrice * 12)) * 100)}% {t('landing.pricing.yearly.save', locale) || 'savings'}
                </span>
                <span className="text-muted-foreground">
                  {settings.defaultCurrency} {settings.monthlyPrice * 12} → {settings.defaultCurrency} {settings.yearlyPrice}/yr
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Notification Settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <Bell className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('settings.notifications', locale)}</CardTitle>
                <CardDescription>{t('settings.notifDesc', locale)}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-5">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t('settings.notif.email', locale)}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('admin.emailNotifDesc', locale)}
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(v) => updateSetting('emailNotifications', v)}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">
                  {t('settings.notif.push', locale)}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('admin.chatNotifDesc', locale) || 'Send chat and push notifications to users'}
                </p>
              </div>
              <Switch
                checked={settings.chatNotifications}
                onCheckedChange={(v) => updateSetting('chatNotifications', v)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Maintenance Mode */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className={settings.maintenanceMode ? 'p-6 border-amber-300 dark:border-amber-700' : 'p-6'}>
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center size-9 rounded-lg ${
                settings.maintenanceMode
                  ? 'bg-amber-100 dark:bg-amber-900/40'
                  : 'bg-emerald-100 dark:bg-emerald-900/40'
              }`}>
                <Wrench className={`size-5 ${
                  settings.maintenanceMode
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`} />
              </div>
              <div>
                <CardTitle className="text-lg">{t('admin.maintenanceMode', locale)}</CardTitle>
                <CardDescription>{t('admin.maintenanceModeDesc', locale)}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t('admin.maintenanceMode', locale)}</Label>
                {settings.maintenanceMode && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    ⚠ Maintenance mode is currently active
                  </p>
                )}
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(v) => updateSetting('maintenanceMode', v)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
