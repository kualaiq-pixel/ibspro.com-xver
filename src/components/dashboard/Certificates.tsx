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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { arSA, enUS, fi } from 'date-fns/locale';
import {
  Award,
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  CalendarIcon,
  Loader2,
  XCircle,
} from 'lucide-react';

/* ---------- types ---------- */

interface CustomerOption {
  id: string;
  name: string;
}

interface CertificateRecord {
  id: string;
  title: string;
  certificateNo: string;
  description: string | null;
  issueDate: string;
  expiryDate: string | null;
  status: string;
  customerId: string | null;
  customer?: CustomerOption | null;
  createdAt: string;
}

interface CertificateStats {
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
}

/* ---------- constants ---------- */

const STATUS_OPTIONS = ['all', 'active', 'expired', 'revoked'] as const;

const STATUS_VARIANT: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  revoked: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  active: <CheckCircle2 className="h-3.5 w-3.5" />,
  expired: <XCircle className="h-3.5 w-3.5" />,
  revoked: <ShieldAlert className="h-3.5 w-3.5" />,
};

/* ---------- animation ---------- */

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

/* ---------- helpers ---------- */

function formatDate(dateStr: string | null, locale: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString(
    locale === 'ar' ? 'ar-SA' : locale === 'fi' ? 'fi-FI' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );
}

function dateFnsLocale(locale: string) {
  return locale === 'ar' ? arSA : locale === 'fi' ? fi : enUS;
}

function isExpiringSoon(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate);
  const now = new Date();
  const thirtyDays = 30 * 86400000;
  return expiry > now && expiry <= new Date(now.getTime() + thirtyDays);
}

function isExpired(expiryDate: string | null): boolean {
  if (!expiryDate) return false;
  return new Date(expiryDate) < new Date();
}

function daysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const diff = new Date(expiryDate).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

/* ====================================================================
   Certificates Component
   ==================================================================== */

export default function Certificates() {
  const { locale, user } = useAppStore();
  const companyId = user?.companyId;

  /* ---- data state ---- */
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [stats, setStats] = useState<CertificateStats>({ total: 0, active: 0, expiringSoon: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  /* ---- dialog state ---- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CertificateRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<CertificateRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- form state ---- */
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [form, setForm] = useState({
    title: '',
    certificateNo: '',
    description: '',
    customerId: '',
    issueDate: new Date(),
    expiryDate: null as Date | null,
    status: 'active',
  });

  /* ---- fetch ---- */
  const fetchCertificates = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ companyId });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/certificates?${params}`);
      const data = await res.json();
      if (res.ok) {
        setCertificates(data.certificates || []);
        setStats(data.stats || { total: 0, active: 0, expiringSoon: 0, expired: 0 });
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setLoading(false);
    }
  }, [companyId, search, statusFilter, locale]);

  const fetchCustomers = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`/api/customers?companyId=${companyId}`);
      const data = await res.json();
      if (res.ok) {
        setCustomers((data.customers || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    } catch {
      // silent
    }
  }, [companyId]);

  useEffect(() => { fetchCertificates(); }, [fetchCertificates]);
  useEffect(() => { if (dialogOpen) fetchCustomers(); }, [dialogOpen, fetchCustomers]);

  /* ---- actions ---- */
  const openAddDialog = () => {
    setEditingRecord(null);
    setForm({
      title: '',
      certificateNo: '',
      description: '',
      customerId: '',
      issueDate: new Date(),
      expiryDate: null,
      status: 'active',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (record: CertificateRecord) => {
    setEditingRecord(record);
    setForm({
      title: record.title,
      certificateNo: record.certificateNo,
      description: record.description || '',
      customerId: record.customerId || '',
      issueDate: new Date(record.issueDate),
      expiryDate: record.expiryDate ? new Date(record.expiryDate) : null,
      status: record.status,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (record: CertificateRecord) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !form.title || !form.certificateNo) return;
    try {
      setSaving(true);
      const url = editingRecord ? `/api/certificates/${editingRecord.id}` : '/api/certificates';
      const method = editingRecord ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          title: form.title,
          certificateNo: form.certificateNo,
          description: form.description || null,
          customerId: form.customerId || null,
          issueDate: form.issueDate.toISOString(),
          expiryDate: form.expiryDate?.toISOString() || null,
          status: form.status,
        }),
      });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDialogOpen(false);
        fetchCertificates();
      } else {
        toast.error(t('common.error', locale));
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/certificates/${deletingRecord.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDeleteDialogOpen(false);
        setDeletingRecord(null);
        fetchCertificates();
      } else {
        toast.error(t('common.error', locale));
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setDeleting(false);
    }
  };

  /* ---- render helpers ---- */
  const getStatusBadge = (status: string, record?: CertificateRecord) => {
    const key = `certificates.${status}` as TranslationKey;
    // Check if certificate is actually expired by date but still marked active
    let displayStatus = status;
    if (record?.expiryDate && isExpired(record.expiryDate) && status === 'active') {
      displayStatus = 'expired';
    }
    return (
      <Badge variant="secondary" className={`text-xs gap-1 ${STATUS_VARIANT[displayStatus] || STATUS_VARIANT.active}`}>
        {STATUS_ICON[displayStatus]}
        {t(key, locale)}
      </Badge>
    );
  };

  /* ==================================================================
     RENDER
     ================================================================== */
  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6 p-6">
      {/* ---------- Header ---------- */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('certificates.title' as TranslationKey, locale)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('certificates.subtitle' as TranslationKey, locale)}
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          {t('certificates.add' as TranslationKey, locale)}
        </Button>
      </motion.div>

      {/* ---------- Stats ---------- */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <Award className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('certificates.total' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('certificates.active' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-100 dark:border-yellow-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900/40">
              <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('certificates.expiringSoon' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.expiringSoon}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-100 dark:border-red-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('certificates.expired' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expired}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---------- Filters ---------- */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="h-9">
            {STATUS_OPTIONS.map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs px-3">
                {s === 'all'
                  ? t('common.filter' as TranslationKey, locale)
                  : t(`certificates.${s}` as TranslationKey, locale)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('certificates.search' as TranslationKey, locale)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* ---------- Table ---------- */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : certificates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Award className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">{t('common.noData' as TranslationKey, locale)}</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold">{t('certificates.certificateNo' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('certificates.title_field' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('invoices.customer' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('certificates.issueDate' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('certificates.expiryDate' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('certificates.status' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold text-right">{t('common.actions' as TranslationKey, locale)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates.map((cert) => {
                      const expiring = isExpiringSoon(cert.expiryDate);
                      const expired = isExpired(cert.expiryDate);
                      const days = daysUntilExpiry(cert.expiryDate);

                      return (
                        <TableRow
                          key={cert.id}
                          className={`border-b-border/30 hover:bg-muted/50 transition-colors ${
                            expiring ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''
                          } ${expired && cert.status === 'active' ? 'bg-red-50/50 dark:bg-red-900/10' : ''}`}
                        >
                          <TableCell className="font-mono text-sm whitespace-nowrap">{cert.certificateNo}</TableCell>
                          <TableCell>
                            <div className="whitespace-nowrap">
                              <span className="font-medium">{cert.title}</span>
                              {expiring && (
                                <Badge variant="secondary" className="ml-2 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300">
                                  <AlertTriangle className="h-3 w-3 mr-0.5" />
                                  {days}d
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{cert.customer?.name || '—'}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(cert.issueDate, locale)}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <span className={expired ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
                              {formatDate(cert.expiryDate, locale)}
                            </span>
                          </TableCell>
                          <TableCell>{getStatusBadge(cert.status, cert)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" onClick={() => openEditDialog(cert)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600" onClick={() => openDeleteDialog(cert)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ============================================================
          CREATE / EDIT DIALOG
          ============================================================ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord
                ? t('certificates.edit' as TranslationKey, locale)
                : t('certificates.add' as TranslationKey, locale)}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            {/* Title + Certificate No */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('certificates.title_field' as TranslationKey, locale)} *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder={t('certificates.title_field' as TranslationKey, locale)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t('certificates.certificateNo' as TranslationKey, locale)} *</Label>
                <Input
                  value={form.certificateNo}
                  onChange={(e) => setForm({ ...form, certificateNo: e.target.value })}
                  placeholder={t('certificates.certificateNo' as TranslationKey, locale)}
                />
              </div>
            </div>

            {/* Customer + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('invoices.customer' as TranslationKey, locale)}</Label>
                <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                  <SelectTrigger><SelectValue placeholder={t('income.selectCustomer' as TranslationKey, locale)} /></SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('certificates.status' as TranslationKey, locale)}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['active', 'expired', 'revoked'] as const).map((s) => (
                      <SelectItem key={s} value={s}>{t(`certificates.${s}` as TranslationKey, locale)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Issue Date + Expiry Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('certificates.issueDate' as TranslationKey, locale)} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(form.issueDate, 'PPP', { locale: dateFnsLocale(locale) })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.issueDate}
                      onSelect={(d) => d && setForm({ ...form, issueDate: d })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>{t('certificates.expiryDate' as TranslationKey, locale)}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.expiryDate
                        ? format(form.expiryDate, 'PPP', { locale: dateFnsLocale(locale) })
                        : t('certificates.expiryDate' as TranslationKey, locale)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.expiryDate}
                      onSelect={(d) => setForm({ ...form, expiryDate: d })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label>{t('certificates.description' as TranslationKey, locale)}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('certificates.description' as TranslationKey, locale)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel' as TranslationKey, locale)}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.title || !form.certificateNo || saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save' as TranslationKey, locale)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          DELETE CONFIRMATION
          ============================================================ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.areYouSure' as TranslationKey, locale)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.deleteConfirm' as TranslationKey, locale)}
              {deletingRecord && (
                <span className="block mt-2 font-semibold text-foreground">
                  {deletingRecord.certificateNo} — {deletingRecord.title}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel' as TranslationKey, locale)}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {t('common.delete' as TranslationKey, locale)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
