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
import { arSA, enUS, fi } from 'date-fns/locale';
import {
  ClipboardList,
  Plus,
  Search,
  Pencil,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  User,
  CalendarIcon,
  Loader2,
  Flame,
  ArrowUpCircle,
} from 'lucide-react';

/* ---------- types ---------- */

interface CustomerOption {
  id: string;
  name: string;
}

interface WorkOrderRecord {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assignedTo: string | null;
  dueDate: string | null;
  customerId: string | null;
  customer?: CustomerOption | null;
  createdAt: string;
}

interface WorkOrderStats {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
}

/* ---------- constants ---------- */

const STATUS_OPTIONS = ['all', 'open', 'in_progress', 'completed', 'cancelled'] as const;
const PRIORITY_OPTIONS = ['all', 'low', 'medium', 'high', 'urgent'] as const;

const PRIORITY_VARIANT: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const PRIORITY_ICON: Record<string, React.ReactNode> = {
  low: <ArrowUpCircle className="h-3.5 w-3.5" />,
  medium: <Clock className="h-3.5 w-3.5" />,
  high: <AlertTriangle className="h-3.5 w-3.5" />,
  urgent: <Flame className="h-3.5 w-3.5" />,
};

const STATUS_VARIANT: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
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

/* ====================================================================
   WorkOrders Component
   ==================================================================== */

export default function WorkOrders() {
  const { locale, user } = useAppStore();
  const companyId = user?.companyId;

  /* ---- data state ---- */
  const [orders, setOrders] = useState<WorkOrderRecord[]>([]);
  const [stats, setStats] = useState<WorkOrderStats>({ total: 0, open: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  /* ---- dialog state ---- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<WorkOrderRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<WorkOrderRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- form state ---- */
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    customerId: '',
    priority: 'medium',
    status: 'open',
    assignedTo: '',
    dueDate: null as Date | null,
  });

  /* ---- fetch ---- */
  const fetchOrders = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ companyId });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/work-orders?${params}`);
      const data = await res.json();
      if (res.ok) {
        setOrders(data.workOrders || []);
        setStats(data.stats || { total: 0, open: 0, inProgress: 0, completed: 0 });
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setLoading(false);
    }
  }, [companyId, search, statusFilter, priorityFilter, locale]);

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

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { if (dialogOpen) fetchCustomers(); }, [dialogOpen, fetchCustomers]);

  /* ---- actions ---- */
  const openAddDialog = () => {
    setEditingRecord(null);
    setForm({
      title: '',
      description: '',
      customerId: '',
      priority: 'medium',
      status: 'open',
      assignedTo: '',
      dueDate: null,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (record: WorkOrderRecord) => {
    setEditingRecord(record);
    setForm({
      title: record.title,
      description: record.description || '',
      customerId: record.customerId || '',
      priority: record.priority,
      status: record.status,
      assignedTo: record.assignedTo || '',
      dueDate: record.dueDate ? new Date(record.dueDate) : null,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (record: WorkOrderRecord) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !form.title) return;
    try {
      setSaving(true);
      const url = editingRecord ? `/api/work-orders/${editingRecord.id}` : '/api/work-orders';
      const method = editingRecord ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          title: form.title,
          description: form.description || null,
          customerId: form.customerId || null,
          priority: form.priority,
          status: form.status,
          assignedTo: form.assignedTo || null,
          dueDate: form.dueDate?.toISOString() || null,
        }),
      });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDialogOpen(false);
        fetchOrders();
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
      const res = await fetch(`/api/work-orders/${deletingRecord.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDeleteDialogOpen(false);
        setDeletingRecord(null);
        fetchOrders();
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
  const getPriorityBadge = (priority: string) => {
    const key = `workOrders.${priority}` as TranslationKey;
    return (
      <Badge variant="secondary" className={`text-xs gap-1 ${PRIORITY_VARIANT[priority] || PRIORITY_VARIANT.medium}`}>
        {PRIORITY_ICON[priority]}
        {t(key, locale)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const keyMap: Record<string, string> = {
      open: 'workOrders.open',
      in_progress: 'workOrders.inProgress',
      completed: 'workOrders.completed',
      cancelled: 'bookings.cancelled',
    };
    const key = (keyMap[status] || status) as TranslationKey;
    return (
      <Badge variant="secondary" className={`text-xs ${STATUS_VARIANT[status] || STATUS_VARIANT.open}`}>
        {t(key, locale)}
      </Badge>
    );
  };

  const isOverdue = (dueDate: string | null) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
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
            {t('workOrders.title' as TranslationKey, locale)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('workOrders.search' as TranslationKey, locale)}
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          {t('workOrders.add' as TranslationKey, locale)}
        </Button>
      </motion.div>

      {/* ---------- Stats ---------- */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <ClipboardList className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('workOrders.title' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 dark:border-blue-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('workOrders.open' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.open}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100 dark:border-purple-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/40">
              <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('workOrders.inProgress' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.inProgress}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('workOrders.completed' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---------- Filters ---------- */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="h-9">
              {STATUS_OPTIONS.map((s) => {
                const labelMap: Record<string, string> = {
                  all: 'common.filter',
                  open: 'workOrders.open',
                  in_progress: 'workOrders.inProgress',
                  completed: 'workOrders.completed',
                  cancelled: 'bookings.cancelled',
                };
                return (
                  <TabsTrigger key={s} value={s} className="text-xs px-3">
                    {t((labelMap[s] || s) as TranslationKey, locale)}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder={t('workOrders.priority' as TranslationKey, locale)} />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {p === 'all' ? t('workOrders.priority' as TranslationKey, locale) : t(`workOrders.${p}` as TranslationKey, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('workOrders.search' as TranslationKey, locale)}
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
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ClipboardList className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">{t('common.noData' as TranslationKey, locale)}</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold">{t('workOrders.title_field' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('invoices.customer' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('workOrders.priority' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('workOrders.status' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('workOrders.dueDate' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('workOrders.assignedTo' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold text-right">{t('common.actions' as TranslationKey, locale)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id} className="border-b-border/30 hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium whitespace-nowrap">
                          {order.title}
                          {order.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-[200px]">{order.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{order.customer?.name || '—'}</TableCell>
                        <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className={isOverdue(order.dueDate) && order.status !== 'completed' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}>
                            {formatDate(order.dueDate, locale)}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{order.assignedTo || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" onClick={() => openEditDialog(order)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600" onClick={() => openDeleteDialog(order)}>
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
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord
                ? t('workOrders.edit' as TranslationKey, locale)
                : t('workOrders.add' as TranslationKey, locale)}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            {/* Title */}
            <div className="grid gap-2">
              <Label>{t('workOrders.title_field' as TranslationKey, locale)} *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t('workOrders.title_field' as TranslationKey, locale)}
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label>{t('workOrders.description' as TranslationKey, locale)}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('workOrders.description' as TranslationKey, locale)}
                rows={3}
              />
            </div>

            {/* Customer + Priority */}
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
                <Label>{t('workOrders.priority' as TranslationKey, locale)}</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['low', 'medium', 'high', 'urgent'] as const).map((p) => (
                      <SelectItem key={p} value={p}>{t(`workOrders.${p}` as TranslationKey, locale)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status + Assigned To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('workOrders.status' as TranslationKey, locale)}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['open', 'in_progress', 'completed', 'cancelled'] as const).map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === 'in_progress'
                          ? t('workOrders.inProgress' as TranslationKey, locale)
                          : s === 'cancelled'
                            ? t('bookings.cancelled' as TranslationKey, locale)
                            : t(`workOrders.${s}` as TranslationKey, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('workOrders.assignedTo' as TranslationKey, locale)}</Label>
                <Input
                  value={form.assignedTo}
                  onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
                  placeholder={t('workOrders.assignedTo' as TranslationKey, locale)}
                />
              </div>
            </div>

            {/* Due Date */}
            <div className="grid gap-2">
              <Label>{t('workOrders.dueDate' as TranslationKey, locale)}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.dueDate
                      ? format(form.dueDate, 'PPP', { locale: dateFnsLocale(locale) })
                      : t('workOrders.dueDate' as TranslationKey, locale)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={form.dueDate}
                    onSelect={(d) => setForm({ ...form, dueDate: d })}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel' as TranslationKey, locale)}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.title || saving}
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
                  {deletingRecord.title}
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
