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
import { Textarea } from '@/components/ui/textarea';
import {
  TrendingDown,
  Plus,
  Search,
  Pencil,
  Trash2,
  DollarSign,
  Calendar,
  BarChart3,
  Receipt,
} from 'lucide-react';

interface ExpenseRecord {
  id: string;
  amount: number;
  category: string | null;
  description: string | null;
  date: string;
  vendor: string | null;
  referenceNo: string | null;
}

const EXPENSE_CATEGORIES = [
  'rent',
  'utilities',
  'supplies',
  'marketing',
  'travel',
  'salaries',
  'other',
] as const;

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export default function Expenses() {
  const { locale, user } = useAppStore();
  const companyId = user?.companyId;

  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [thisMonthExpenses, setThisMonthExpenses] = useState(0);
  const [averageExpense, setAverageExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<ExpenseRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    amount: '',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    referenceNo: '',
  });

  const fetchExpenses = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ companyId });
      if (search) params.set('search', search);
      const res = await fetch(`/api/expenses?${params}`);
      const data = await res.json();
      if (res.ok) {
        setExpenses(data.expenses || []);
        setTotalExpenses(data.total || 0);
        setThisMonthExpenses(data.thisMonth || 0);
        setAverageExpense(data.average || 0);
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setLoading(false);
    }
  }, [companyId, search, locale]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const getCategoryLabel = (cat: string | null) => {
    if (!cat) return '—';
    const keyMap: Record<string, TranslationKey> = {
      rent: 'expenses.rent',
      utilities: 'expenses.utilities',
      supplies: 'expenses.supplies',
      marketing: 'expenses.marketing',
      travel: 'expenses.travel',
      salaries: 'expenses.salaries',
      other: 'expenses.other',
    };
    return t(keyMap[cat] || 'common.noData', locale);
  };

  const getCategoryColor = (cat: string | null) => {
    if (!cat) return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    const colors: Record<string, string> = {
      rent: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
      utilities: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      supplies: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      marketing: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
      travel: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
      salaries: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
      other: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    };
    return colors[cat] || colors.other;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-FI' : locale === 'fi' ? 'fi-FI' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'ar' ? 'ar-SA' : locale === 'fi' ? 'fi-FI' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const openAddDialog = () => {
    setEditingRecord(null);
    setForm({
      amount: '',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      referenceNo: '',
    });
    setDialogOpen(true);
  };

  const openEditDialog = (record: ExpenseRecord) => {
    setEditingRecord(record);
    setForm({
      amount: String(record.amount),
      category: record.category || '',
      description: record.description || '',
      date: new Date(record.date).toISOString().split('T')[0],
      vendor: record.vendor || '',
      referenceNo: record.referenceNo || '',
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (record: ExpenseRecord) => {
    setDeletingRecord(record);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !form.amount || !form.date) return;
    try {
      setSaving(true);
      const url = editingRecord ? `/api/expenses/${editingRecord.id}` : '/api/expenses';
      const method = editingRecord ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          amount: form.amount,
          category: form.category || null,
          description: form.description || null,
          date: form.date,
          vendor: form.vendor || null,
          referenceNo: form.referenceNo || null,
        }),
      });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDialogOpen(false);
        fetchExpenses();
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
      const res = await fetch(`/api/expenses/${deletingRecord.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDeleteDialogOpen(false);
        setDeletingRecord(null);
        fetchExpenses();
      } else {
        toast.error(t('common.error', locale));
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      variants={stagger}
      initial="initial"
      animate="animate"
      className="space-y-6 p-6"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {t('expenses.title' as TranslationKey, locale)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('expenses.total' as TranslationKey, locale)}
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-rose-600 hover:bg-rose-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          {t('expenses.add' as TranslationKey, locale)}
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-rose-100 dark:border-rose-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/40">
              <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('expenses.total' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-100 dark:border-orange-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/40">
              <Calendar className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('expenses.thisMonth' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(thisMonthExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-100 dark:border-amber-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/40">
              <BarChart3 className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('expenses.average' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(averageExpense)}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('expenses.search' as TranslationKey, locale)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={fadeUp}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {t('expenses.noResults' as TranslationKey, locale)}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold">{t('expenses.date' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('expenses.description' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('expenses.category' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('expenses.vendor' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold text-right">{t('expenses.amount' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold text-right">{t('common.actions' as TranslationKey, locale)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((record) => (
                      <TableRow
                        key={record.id}
                        className="border-b-border/30 hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDate(record.date)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {record.description || '—'}
                        </TableCell>
                        <TableCell>
                          {record.category && (
                            <Badge variant="secondary" className={`text-xs ${getCategoryColor(record.category)}`}>
                              {getCategoryLabel(record.category)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.vendor || '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          -{formatCurrency(record.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                              onClick={() => openEditDialog(record)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                              onClick={() => openDeleteDialog(record)}
                            >
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord
                ? t('expenses.edit' as TranslationKey, locale)
                : t('expenses.add' as TranslationKey, locale)}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">{t('expenses.amount' as TranslationKey, locale)} *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>{t('expenses.date' as TranslationKey, locale)} *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('expenses.category' as TranslationKey, locale)}</Label>
              <Select
                value={form.category}
                onValueChange={(val) => setForm({ ...form, category: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('expenses.category' as TranslationKey, locale)} />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {t(`expenses.${cat}` as TranslationKey, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{t('expenses.vendor' as TranslationKey, locale)}</Label>
              <Input
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder={t('expenses.vendor' as TranslationKey, locale)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('expenses.description' as TranslationKey, locale)}</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('expenses.description' as TranslationKey, locale)}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t('expenses.reference' as TranslationKey, locale)}</Label>
              <Input
                value={form.referenceNo}
                onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
                placeholder={t('expenses.reference' as TranslationKey, locale)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t('common.cancel' as TranslationKey, locale)}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!form.amount || !form.date || saving}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {saving && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {t('common.save' as TranslationKey, locale)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.areYouSure' as TranslationKey, locale)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.deleteConfirm' as TranslationKey, locale)}
              {deletingRecord && (
                <span className="block mt-2 font-semibold text-foreground">
                  {formatCurrency(deletingRecord.amount)} - {deletingRecord.description || '—'}
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
              {deleting && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {t('common.delete' as TranslationKey, locale)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
