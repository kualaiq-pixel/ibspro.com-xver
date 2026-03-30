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
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  UserPlus,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  notes: string | null;
  createdAt: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.05 } },
};

export default function Customers() {
  const { locale, user } = useAppStore();
  const companyId = user?.companyId;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [newThisMonth, setNewThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    notes: '',
  });

  const fetchCustomers = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({ companyId });
      if (search) params.set('search', search);
      const res = await fetch(`/api/customers?${params}`);
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers || []);
        setTotalCount(data.total || 0);
        setNewThisMonth(data.newThisMonth || 0);
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setLoading(false);
    }
  }, [companyId, search, locale]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const openAddDialog = () => {
    setEditingCustomer(null);
    setForm({ name: '', email: '', phone: '', address: '', city: '', country: '', notes: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      country: customer.country || '',
      notes: customer.notes || '',
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (customer: Customer) => {
    setDeletingCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!companyId || !form.name.trim()) return;
    try {
      setSaving(true);
      const url = editingCustomer ? `/api/customers/${editingCustomer.id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, ...form }),
      });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDialogOpen(false);
        fetchCustomers();
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
    if (!deletingCustomer) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/customers/${deletingCustomer.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(t('common.success', locale));
        setDeleteDialogOpen(false);
        setDeletingCustomer(null);
        fetchCustomers();
      } else {
        toast.error(t('common.error', locale));
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-FI' : locale === 'fi' ? 'fi-FI' : 'en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
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
            {t('customers.title' as TranslationKey, locale)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('customers.total' as TranslationKey, locale)}
          </p>
        </div>
        <Button onClick={openAddDialog} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <UserPlus className="h-4 w-4" />
          {t('customers.add' as TranslationKey, locale)}
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-emerald-100 dark:border-emerald-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40">
              <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('customers.total' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-foreground">{totalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-100 dark:border-blue-900/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('customers.newThisMonth' as TranslationKey, locale)}</p>
              <p className="text-2xl font-bold text-foreground">{newThisMonth}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div variants={fadeUp}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('customers.search' as TranslationKey, locale)}
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
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
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">
                  {t('customers.noResults' as TranslationKey, locale)}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-border/50 hover:bg-transparent">
                      <TableHead className="font-semibold">{t('customers.name' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('customers.email' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('customers.phone' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold">{t('customers.city' as TranslationKey, locale)}</TableHead>
                      <TableHead className="font-semibold text-right">{t('common.actions' as TranslationKey, locale)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer, index) => (
                      <TableRow
                        key={customer.id}
                        className="border-b-border/30 hover:bg-muted/50 transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-semibold text-sm shrink-0">
                              {customer.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{customer.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {customer.email && <Mail className="h-3.5 w-3.5 shrink-0" />}
                            <span className="truncate">{customer.email || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {customer.phone && <Phone className="h-3.5 w-3.5 shrink-0" />}
                            <span className="truncate">{customer.phone || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            {customer.city && <MapPin className="h-3.5 w-3.5 shrink-0" />}
                            <span className="truncate">{customer.city || '—'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-emerald-600"
                              onClick={() => openEditDialog(customer)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-rose-600"
                              onClick={() => openDeleteDialog(customer)}
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
              {editingCustomer
                ? t('customers.edit' as TranslationKey, locale)
                : t('customers.add' as TranslationKey, locale)}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('customers.name' as TranslationKey, locale)} *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('customers.name' as TranslationKey, locale)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">{t('customers.email' as TranslationKey, locale)}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder={t('customers.email' as TranslationKey, locale)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">{t('customers.phone' as TranslationKey, locale)}</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder={t('customers.phone' as TranslationKey, locale)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">{t('customers.address' as TranslationKey, locale)}</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder={t('customers.address' as TranslationKey, locale)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="city">{t('customers.city' as TranslationKey, locale)}</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder={t('customers.city' as TranslationKey, locale)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="country">{t('customers.country' as TranslationKey, locale)}</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  placeholder={t('customers.country' as TranslationKey, locale)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">{t('customers.notes' as TranslationKey, locale)}</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={t('customers.notes' as TranslationKey, locale)}
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
              disabled={!form.name.trim() || saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
              {deletingCustomer && (
                <span className="block mt-2 font-semibold text-foreground">
                  {deletingCustomer.name}
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
