'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  TrendingUp,
  Users,
  AlertTriangle,
  MoreHorizontal,
  CalendarPlus,
  XCircle,
  ArrowUpCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface SubscriptionRecord {
  id: string;
  plan: string;
  status: string;
  startDate: string;
  endDate: string | null;
  amount: number;
  user: { id: string; name: string; email: string };
}

interface SubStats {
  totalActive: number;
  totalTrial: number;
  totalCancelled: number;
  totalExpired: number;
  monthlyRevenue: number;
  churnRate: number;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const statusConfig: Record<string, { color: string; bg: string; darkBg: string }> = {
  trial: { color: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-100', darkBg: 'dark:bg-cyan-950/40' },
  active: { color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-950/40' },
  cancelled: { color: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-100', darkBg: 'dark:bg-gray-800' },
  expired: { color: 'text-red-700 dark:text-red-400', bg: 'bg-red-100', darkBg: 'dark:bg-red-950/40' },
};

export default function AdminSubscriptions() {
  const { locale } = useAppStore();
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [stats, setStats] = useState<SubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSubscriptions(data.subscriptions);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (subId: string, action: string) => {
    toast.info(`${action} action on subscription ${subId}`);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('admin.subscriptionManagement', locale)}
        </h1>
        <p className="text-muted-foreground mt-1">{t('admin.subscriptionDesc', locale)}</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <Skeleton className="h-24" /><Skeleton className="h-24" />
            <Skeleton className="h-24" /><Skeleton className="h-24" />
          </>
        ) : stats ? (
          <>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{t('admin.activeSubs', locale)}</p>
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-600">
                  <CreditCard className="size-5 text-white" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.totalActive}</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{t('admin.trialUsers', locale)}</p>
                <div className="flex size-10 items-center justify-center rounded-lg bg-cyan-600">
                  <Users className="size-5 text-white" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.totalTrial}</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{t('admin.monthlyRev', locale)}</p>
                <div className="flex size-10 items-center justify-center rounded-lg bg-violet-600">
                  <TrendingUp className="size-5 text-white" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{t('admin.churnRate', locale)}</p>
                <div className="flex size-10 items-center justify-center rounded-lg bg-red-600">
                  <AlertTriangle className="size-5 text-white" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold">{stats.churnRate}%</p>
            </Card>
          </>
        ) : null}
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t('admin.allStatus', locale)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allStatus', locale)}</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>
      </motion.div>

      {/* Subscriptions Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : subscriptions.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                {t('common.noData', locale)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.user', locale)}</TableHead>
                      <TableHead>{t('admin.plan', locale)}</TableHead>
                      <TableHead>{t('invoices.status', locale)}</TableHead>
                      <TableHead>{t('admin.startDate', locale)}</TableHead>
                      <TableHead>{t('admin.endDate', locale)}</TableHead>
                      <TableHead>{t('income.amount', locale)}</TableHead>
                      <TableHead className="text-right">{t('common.actions', locale)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscriptions.map((sub) => {
                      const sc = statusConfig[sub.status] || statusConfig.trial;
                      return (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sub.user.name}</p>
                              <p className="text-xs text-muted-foreground">{sub.user.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {sub.plan}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                'text-xs capitalize',
                                sc.bg, sc.color, sc.darkBg, 'hover:bg-current/10'
                              )}
                            >
                              {sub.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatDate(sub.startDate)}</TableCell>
                          <TableCell className="text-sm">{formatDate(sub.endDate || '')}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(sub.amount)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAction(sub.id, 'Extend')}>
                                  <CalendarPlus className="size-4 mr-2" />
                                  {t('admin.extend', locale)}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction(sub.id, 'Cancel')} className="text-red-600">
                                  <XCircle className="size-4 mr-2" />
                                  {t('admin.cancel', locale)}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAction(sub.id, 'Upgrade')}>
                                  <ArrowUpCircle className="size-4 mr-2" />
                                  {t('admin.upgrade', locale)}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
    </div>
  );
}
