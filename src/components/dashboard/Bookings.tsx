'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { arSA, enUS, fi } from 'date-fns/locale';
import {
  CalendarDays,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  CheckCircle2,
  Timer,
  Users,
  LayoutList,
  LayoutGrid,
  Loader2,
} from 'lucide-react';

/* ---------- types ---------- */

interface CustomerOption {
  id: string;
  name: string;
}

interface BookingRecord {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  status: string;
  location: string | null;
  notes: string | null;
  customerId: string;
  customer?: CustomerOption | null;
}

interface BookingStats {
  totalBookings: number;
  thisWeek: number;
  active: number;
  completed: number;
}

/* ---------- constants ---------- */

const BOOKING_STATUSES = ['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const;

const STATUS_VARIANT: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  in_progress: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3.5 w-3.5" />,
  confirmed: <CheckCircle2 className="h-3.5 w-3.5" />,
  in_progress: <Timer className="h-3.5 w-3.5" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5" />,
  cancelled: <span className="h-2 w-2 rounded-full bg-current" />,
};

const CALENDAR_COLOR: Record<string, string> = {
  pending: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
  confirmed: 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/30',
  in_progress: 'border-l-purple-500 bg-purple-50 dark:bg-purple-950/30',
  completed: 'border-l-emerald-500 bg-emerald-50 dark:bg-emerald-950/30',
  cancelled: 'border-l-gray-400 bg-gray-50 dark:bg-gray-900/30',
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
   Bookings Component
   ==================================================================== */

export default function Bookings() {
  const { locale, user } = useAppStore();
  const companyId = user?.companyId;

  /* ---- data state ---- */
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [stats, setStats] = useState<BookingStats>({ totalBookings: 0, thisWeek: 0, active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  /* ---- dialog state ---- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<BookingRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<BookingRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- form state ---- */
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [form, setForm] = useState({
    customerId: '',
    title: '',
    description: '',
    startDate: new Date(),
    endDate: null as Date | null,
    status: 'pending',
    location: '',
    notes: '',
  });

  /* ---- calendar state ---- */
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  /* ---- fetch ---- */
  const fetchBookings = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ companyId });
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/bookings?${params}`);
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
        setStats(data.stats || { totalBookings: 0, thisWeek: 0, active: 0, completed: 0 });
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

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { if (dialogOpen) fetchCustomers(); }, [dialogOpen, fetchCustomers]);

  /* ---- calendar days ---- */
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [calendarMonth]);

  const getBookingsForDay = useCallback((day: Date) => {
    return bookings.filter((b) => {
      const start = new Date(b.startDate);
      if (isSameDay(start, day)) return true;
      if (b.endDate) {
        const end = new Date(b.endDate);
        return day > start && day <= end;
      }
      return false;
    });
  }, [bookings]);

  const statusBadge = (status: string) => {
    const key = `bookings.${status === 'in_progress' ? 'inProgress' : status}` as TranslationKey;
    return (
      <Badge variant="secondary" className={`text-xs gap-1 ${STATUS_VARIANT[status] || STATUS_VARIANT.pending}`}>
        {STATUS_ICON[status]}
        {t(key, locale)}
      </Badge>
    );
  };

  /* ---- actions ---- */
  const openAddDialog = () => {
    setEditingRecord(null);
    setForm({
      customerId: '',
      title: '',
      description: '',
      startDate: new Date(),
      endDate: null,
      status: 'pending',
      location: '',
      notes: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (record: BookingRecord) => {
    setEditingRecord(record);
    setForm({
      customerId: record.customerId,
      title: record.title,
      description: record.description || '',
      startDate: new Date(record.startDate),
      endDate: record.endDate ? new Date(record.endDate) : null,
      status: record.status,
      location: record.location || '',
      notes: record.notes || '',
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (record: BookingRecord) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !form.customerId || !form.title || !form.startDate) return;
    try {
      setSaving(true);
      const url = editingRecord ? `/api/bookings/${editingRecord.id}` : '/api/bookings';
      const method = editingRecord ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          customerId: form.customerId,
          title: form.title,
          description: form.description || null,
          startDate: form.startDate.toISOString(),
          endDate: form.endDate ? form.endDate.toISOString() : null,
          status: form.status,
          location: form.location || null,
          notes: form.notes || null,
        }),
      });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDialogOpen(false);
        fetchBookings();
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
      const res = await fetch(`/api/bookings/${deletingRecord.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDeleteDialogOpen(false);
        setDeletingRecord(null);
        fetchBookings();
      } else {
        toast.error(t('common.error', locale));
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setDeleting(false);
    }
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
            {t('bookings.title' as TranslationKey, locale)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.activeBookings' as TranslationKey, locale)}
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          {t('bookings.add' as TranslationKey, locale)}
        </Button>
      </motion.div>

      {/* ---------- Stats ---------- */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <CalendarDays className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('bookings.title' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-foreground">{stats.totalBookings}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 dark:border-blue-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('bookings.search' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.thisWeek}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-100 dark:border-purple-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/40">
              <Timer className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('bookings.confirmed' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('bookings.completed' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---------- Filters + View Toggle ---------- */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="h-9">
            {BOOKING_STATUSES.map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs px-3 capitalize">
                {s === 'all'
                  ? t('common.filter' as TranslationKey, locale)
                  : t(`bookings.${s === 'in_progress' ? 'inProgress' : s}` as TranslationKey, locale)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('bookings.search' as TranslationKey, locale)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode('table')}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode('calendar')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ---------- TABLE VIEW ---------- */}
      {viewMode === 'table' && (
        <motion.div variants={fadeUp}>
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground">{t('common.noData' as TranslationKey, locale)}</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-border/50 hover:bg-transparent">
                        <TableHead className="font-semibold">{t('bookings.title_field' as TranslationKey, locale)}</TableHead>
                        <TableHead className="font-semibold">{t('bookings.customer' as TranslationKey, locale)}</TableHead>
                        <TableHead className="font-semibold">{t('bookings.startDate' as TranslationKey, locale)}</TableHead>
                        <TableHead className="font-semibold">{t('bookings.endDate' as TranslationKey, locale)}</TableHead>
                        <TableHead className="font-semibold">{t('bookings.status' as TranslationKey, locale)}</TableHead>
                        <TableHead className="font-semibold">{t('bookings.location' as TranslationKey, locale)}</TableHead>
                        <TableHead className="font-semibold text-right">{t('common.actions' as TranslationKey, locale)}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.map((booking) => (
                        <TableRow key={booking.id} className="border-b-border/30 hover:bg-muted/50 transition-colors">
                          <TableCell className="font-medium whitespace-nowrap max-w-[200px] truncate">{booking.title}</TableCell>
                          <TableCell className="whitespace-nowrap">{booking.customer?.name || '—'}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(booking.startDate, locale)}</TableCell>
                          <TableCell className="text-muted-foreground whitespace-nowrap">{booking.endDate ? formatDate(booking.endDate, locale) : '—'}</TableCell>
                          <TableCell>{statusBadge(booking.status)}</TableCell>
                          <TableCell className="max-w-[150px] truncate">
                            {booking.location && (
                              <span className="flex items-center gap-1 text-muted-foreground text-sm">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                {booking.location}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-emerald-600" onClick={() => openEditDialog(booking)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-rose-600" onClick={() => openDeleteDialog(booking)}>
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
      )}

      {/* ---------- CALENDAR VIEW ---------- */}
      {viewMode === 'calendar' && (
        <motion.div variants={fadeUp}>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  {format(calendarMonth, 'MMMM yyyy', { locale: dateFnsLocale(locale) })}
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date())}>
                    {t('common.view' as TranslationKey, locale)}
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {locale === 'fi'
                      ? ['Ma', 'Ti', 'Ke', 'To', 'Pe', 'La', 'Su'][['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day)]
                      : locale === 'ar'
                        ? ['إث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح'][['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day)]
                        : day}
                  </div>
                ))}
              </div>
              {/* Day grid */}
              <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border bg-border">
                {calendarDays.map((day) => {
                  const dayBookings = getBookingsForDay(day);
                  const inMonth = isSameMonth(day, calendarMonth);
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`min-h-[100px] p-1.5 bg-background transition-colors ${!inMonth ? 'opacity-40' : ''}`}
                    >
                      <div className={`text-xs font-medium mb-1 h-6 w-6 flex items-center justify-center rounded-full ${isToday ? 'bg-emerald-600 text-white' : 'text-muted-foreground'}`}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5 overflow-hidden max-h-[72px] overflow-y-auto">
                        {dayBookings.slice(0, 3).map((b) => (
                          <div
                            key={b.id}
                            className={`text-[10px] leading-tight px-1.5 py-0.5 rounded border-l-2 truncate cursor-default ${CALENDAR_COLOR[b.status] || CALENDAR_COLOR.pending}`}
                            title={b.title}
                          >
                            {b.title}
                          </div>
                        ))}
                        {dayBookings.length > 3 && (
                          <p className="text-[10px] text-muted-foreground px-1.5">
                            +{dayBookings.length - 3} more
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ============================================================
          CREATE / EDIT DIALOG
          ============================================================ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord
                ? t('bookings.edit' as TranslationKey, locale)
                : t('bookings.add' as TranslationKey, locale)}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>{t('bookings.title_field' as TranslationKey, locale)} *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder={t('bookings.title_field' as TranslationKey, locale)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('bookings.customer' as TranslationKey, locale)} *</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger><SelectValue placeholder={t('income.selectCustomer' as TranslationKey, locale)} /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('bookings.startDate' as TranslationKey, locale)} *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {format(form.startDate, 'PPP', { locale: dateFnsLocale(locale) })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.startDate}
                      onSelect={(d) => d && setForm({ ...form, startDate: d })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid gap-2">
                <Label>{t('bookings.endDate' as TranslationKey, locale)}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      {form.endDate
                        ? format(form.endDate, 'PPP', { locale: dateFnsLocale(locale) })
                        : '—'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.endDate || undefined}
                      onSelect={(d) => setForm({ ...form, endDate: d })}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>{t('bookings.status' as TranslationKey, locale)}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'] as const).map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(`bookings.${s === 'in_progress' ? 'inProgress' : s}` as TranslationKey, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('bookings.location' as TranslationKey, locale)}</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder={t('bookings.location' as TranslationKey, locale)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('bookings.description' as TranslationKey, locale)}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('bookings.description' as TranslationKey, locale)}
                rows={3}
              />
            </div>
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
              disabled={!form.customerId || !form.title || !form.startDate || saving}
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
