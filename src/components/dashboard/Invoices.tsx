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
import { Separator } from '@/components/ui/separator';
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
import {
  arSA,
  enUS,
  fi,
} from 'date-fns/locale';
import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  X,
  Clock,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Receipt,
  CalendarIcon,
  Loader2,
} from 'lucide-react';

/* ---------- types ---------- */

interface CustomerOption {
  id: string;
  name: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface InvoiceRecord {
  id: string;
  invoiceNo: string;
  status: string;
  issueDate: string;
  dueDate: string;
  items: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  customerId: string;
  customer?: CustomerOption | null;
}

interface InvoiceStats {
  totalInvoices: number;
  pendingAmount: number;
  paidAmount: number;
  overdueCount: number;
}

/* ---------- constants ---------- */

const INVOICE_STATUSES = ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;

const STATUS_VARIANT: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  draft: <Receipt className="h-3.5 w-3.5" />,
  sent: <Clock className="h-3.5 w-3.5" />,
  paid: <CheckCircle2 className="h-3.5 w-3.5" />,
  overdue: <AlertTriangle className="h-3.5 w-3.5" />,
  cancelled: <X className="h-3.5 w-3.5" />,
};

const emptyLineItem = (): LineItem => ({ description: '', quantity: 1, unitPrice: 0 });

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

function formatCurrency(amount: number, locale: string) {
  return new Intl.NumberFormat(
    locale === 'ar' ? 'ar-FI' : locale === 'fi' ? 'fi-FI' : 'en-US',
    { style: 'currency', currency: 'EUR' }
  ).format(amount);
}

function formatDate(dateStr: string, locale: string) {
  return new Date(dateStr).toLocaleDateString(
    locale === 'ar' ? 'ar-SA' : locale === 'fi' ? 'fi-FI' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' }
  );
}

function dateFnsLocale(locale: string) {
  return locale === 'ar' ? arSA : locale === 'fi' ? fi : enUS;
}

/* ====================================================================
   Invoices Component
   ==================================================================== */

export default function Invoices() {
  const { locale, user } = useAppStore();
  const companyId = user?.companyId;

  /* ---- data state ---- */
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({ totalInvoices: 0, pendingAmount: 0, paidAmount: 0, overdueCount: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  /* ---- dialog state ---- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InvoiceRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<InvoiceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- view dialog ---- */
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingRecord, setViewingRecord] = useState<InvoiceRecord | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<{ id: string; name: string; email: string | null; phone: string | null; address: string | null; city: string | null; country: string | null } | null>(null);

  /* ---- form state ---- */
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [form, setForm] = useState({
    customerId: '',
    issueDate: new Date(),
    dueDate: new Date(Date.now() + 30 * 86400000),
    items: [emptyLineItem()],
    taxRate: 24,
    notes: '',
    status: 'draft',
  });

  /* ---- fetch ---- */
  const fetchInvoices = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ companyId });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/invoices?${params}`);
      const data = await res.json();
      if (res.ok) {
        setInvoices(data.invoices || []);
        setStats(data.stats || { totalInvoices: 0, pendingAmount: 0, paidAmount: 0, overdueCount: 0 });
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

  const fetchInvoiceDetail = useCallback(async (invoiceId: string) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json();
      if (res.ok) {
        setViewingCustomer(data.customer || null);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => { if (dialogOpen) fetchCustomers(); }, [dialogOpen, fetchCustomers]);

  /* ---- computed ---- */
  const subtotal = form.items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (form.taxRate / 100);
  const total = subtotal + taxAmount;

  /* ---- actions ---- */
  const openAddDialog = () => {
    setEditingRecord(null);
    setForm({
      customerId: '',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 86400000),
      items: [emptyLineItem()],
      taxRate: 24,
      notes: '',
      status: 'draft',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (record: InvoiceRecord) => {
    setEditingRecord(record);
    let parsedItems: LineItem[] = [emptyLineItem()];
    try { parsedItems = JSON.parse(record.items); if (!parsedItems.length) parsedItems = [emptyLineItem()]; } catch { /* keep default */ }
    setForm({
      customerId: record.customerId,
      issueDate: new Date(record.issueDate),
      dueDate: new Date(record.dueDate),
      items: parsedItems,
      taxRate: record.taxRate,
      notes: record.notes || '',
      status: record.status,
    });
    setDialogOpen(true);
  };

  const openViewDialog = async (record: InvoiceRecord) => {
    setViewingRecord(record);
    setViewDialogOpen(true);
    fetchInvoiceDetail(record.id);
  };

  const openDeleteDialog = (record: InvoiceRecord) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !form.customerId || !form.items.length) return;
    try {
      setSaving(true);
      const url = editingRecord ? `/api/invoices/${editingRecord.id}` : '/api/invoices';
      const method = editingRecord ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          customerId: form.customerId,
          status: form.status,
          issueDate: form.issueDate.toISOString(),
          dueDate: form.dueDate.toISOString(),
          items: form.items,
          taxRate: form.taxRate,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDialogOpen(false);
        fetchInvoices();
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
      const res = await fetch(`/api/invoices/${deletingRecord.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDeleteDialogOpen(false);
        setDeletingRecord(null);
        fetchInvoices();
      } else {
        toast.error(t('common.error', locale));
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setDeleting(false);
    }
  };

  /* ---- item handlers ---- */
  const updateItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setForm((prev) => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const addItem = () => setForm((prev) => ({ ...prev, items: [...prev.items, emptyLineItem()] }));
  const removeItem = (idx: number) => {
    if (form.items.length <= 1) return;
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  /* ---- render helpers ---- */
  const getStatusBadge = (status: string) => {
    const key = `invoices.${status}` as TranslationKey;
    return (
      <Badge variant="secondary" className={`text-xs gap-1 ${STATUS_VARIANT[status] || STATUS_VARIANT.draft}`}>
        {STATUS_ICON[status]}
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
            {t('invoices.title' as TranslationKey, locale)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('invoices.search' as TranslationKey, locale)}
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          {t('invoices.add' as TranslationKey, locale)}
        </Button>
      </motion.div>

      {/* ---------- Stats ---------- */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('invoices.title' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalInvoices}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 dark:border-blue-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('invoices.draft' as TranslationKey, locale)} / {t('invoices.sent' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(stats.pendingAmount, locale)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('invoices.paid' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.paidAmount, locale)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-100 dark:border-red-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/40">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('invoices.overdue' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdueCount}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---------- Filters ---------- */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="h-9">
            {INVOICE_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs px-3 capitalize">
                {s === 'all' ? t('common.filter' as TranslationKey, locale) : t(`invoices.${s}` as TranslationKey, locale)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('invoices.search' as TranslationKey, locale)}
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
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">{t('common.noData' as TranslationKey, locale)}</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold">{t('invoices.invoiceNo' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('invoices.customer' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('invoices.issueDate' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('invoices.dueDate' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold text-right">{t('invoices.total' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('invoices.status' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold text-right">{t('common.actions' as TranslationKey, locale)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id} className="border-b-border/30 hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono text-sm whitespace-nowrap">{inv.invoiceNo}</TableCell>
                        <TableCell className="whitespace-nowrap">{inv.customer?.name || '—'}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(inv.issueDate, locale)}</TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(inv.dueDate, locale)}</TableCell>
                        <TableCell className="text-right font-semibold whitespace-nowrap">{formatCurrency(inv.total, locale)}</TableCell>
                        <TableCell>{getStatusBadge(inv.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-blue-600" onClick={() => openViewDialog(inv)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" onClick={() => openEditDialog(inv)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600" onClick={() => openDeleteDialog(inv)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord
                ? t('invoices.edit' as TranslationKey, locale)
                : t('invoices.add' as TranslationKey, locale)}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            {/* Customer + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('invoices.customer' as TranslationKey, locale)} *</Label>
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
                <Label>{t('invoices.status' as TranslationKey, locale)}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const).map((s) => (
                      <SelectItem key={s} value={s}>{t(`invoices.${s}` as TranslationKey, locale)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('invoices.issueDate' as TranslationKey, locale)} *</Label>
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
                <Label>{t('invoices.dueDate' as TranslationKey, locale)} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(form.dueDate, 'PPP', { locale: dateFnsLocale(locale) })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.dueDate}
                      onSelect={(d) => d && setForm({ ...form, dueDate: d })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t('invoices.items' as TranslationKey, locale)}</Label>
                <Button variant="outline" size="sm" onClick={addItem} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> {t('common.add' as TranslationKey, locale)}
                </Button>
              </div>
              <div className="space-y-2">
                {/* Header row */}
                <div className="hidden sm:grid sm:grid-cols-[1fr_100px_120px_40px] gap-2 text-xs text-muted-foreground px-1">
                  <span>{t('income.description' as TranslationKey, locale)}</span>
                  <span className="text-center">{t('invoices.items' as TranslationKey, locale)}</span>
                  <span className="text-right">{t('income.amount' as TranslationKey, locale)}</span>
                  <span />
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_40px] gap-2">
                    <Input
                      placeholder={t('income.description' as TranslationKey, locale)}
                      value={item.description}
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                    />
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      className="text-center"
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">€</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                        className="pl-7 text-right"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-muted-foreground hover:text-rose-600"
                      onClick={() => removeItem(idx)}
                      disabled={form.items.length <= 1}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('invoices.subtotal' as TranslationKey, locale)}</span>
                <span className="font-medium">{formatCurrency(subtotal, locale)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{t('invoices.tax' as TranslationKey, locale)}</span>
                  <div className="relative w-20">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.taxRate}
                      onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                      className="h-7 text-xs text-right pr-5"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                </div>
                <span className="font-medium">{formatCurrency(taxAmount, locale)}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-base font-bold">
                <span>{t('invoices.total' as TranslationKey, locale)}</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(total, locale)}</span>
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-2">
              <Label>{t('invoices.notes' as TranslationKey, locale)}</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('invoices.notes' as TranslationKey, locale)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel' as TranslationKey, locale)}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.customerId || !form.items.length || saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.save' as TranslationKey, locale)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          VIEW INVOICE DIALOG
          ============================================================ */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-emerald-600" />
              {viewingRecord?.invoiceNo}
              {viewingRecord && getStatusBadge(viewingRecord.status)}
            </DialogTitle>
          </DialogHeader>
          {viewingRecord && (
            <div className="space-y-6">
              {/* Customer info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('invoices.customer' as TranslationKey, locale)}</p>
                  <p className="font-semibold">{viewingCustomer?.name || viewingRecord.customer?.name}</p>
                  {viewingCustomer?.email && <p className="text-sm text-muted-foreground">{viewingCustomer.email}</p>}
                  {viewingCustomer?.phone && <p className="text-sm text-muted-foreground">{viewingCustomer.phone}</p>}
                  {(viewingCustomer?.address || viewingCustomer?.city || viewingCustomer?.country) && (
                    <p className="text-sm text-muted-foreground">
                      {[viewingCustomer.address, viewingCustomer.city, viewingCustomer.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('invoices.issueDate' as TranslationKey, locale)}</p>
                  <p className="font-semibold">{formatDate(viewingRecord.issueDate, locale)}</p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mt-2">{t('invoices.dueDate' as TranslationKey, locale)}</p>
                  <p className="font-semibold">{formatDate(viewingRecord.dueDate, locale)}</p>
                </div>
              </div>

              <Separator />

              {/* Line items table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('income.description' as TranslationKey, locale)}</TableHead>
                    <TableHead className="text-center">{t('invoices.items' as TranslationKey, locale)}</TableHead>
                    <TableHead className="text-right">{t('income.amount' as TranslationKey, locale)}</TableHead>
                    <TableHead className="text-right">{t('invoices.total' as TranslationKey, locale)}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    let parsed: LineItem[] = [];
                    try { parsed = JSON.parse(viewingRecord.items); } catch { /* empty */ }
                    return parsed.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.description || '—'}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice, locale)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.quantity * item.unitPrice, locale)}</TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>

              {/* Totals */}
              <div className="space-y-1.5 ml-auto w-64">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('invoices.subtotal' as TranslationKey, locale)}</span>
                  <span>{formatCurrency(viewingRecord.subtotal, locale)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('invoices.tax' as TranslationKey, locale)} ({viewingRecord.taxRate}%)</span>
                  <span>{formatCurrency(viewingRecord.taxAmount, locale)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>{t('invoices.total' as TranslationKey, locale)}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(viewingRecord.total, locale)}</span>
                </div>
              </div>

              {/* Notes */}
              {viewingRecord.notes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{t('invoices.notes' as TranslationKey, locale)}</p>
                    <p className="text-sm whitespace-pre-wrap">{viewingRecord.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
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
                  {deletingRecord.invoiceNo} — {formatCurrency(deletingRecord.total, locale)}
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
