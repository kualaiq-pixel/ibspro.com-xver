'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  CreditCard,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ShieldCheck,
  UserPlus,
  AlertTriangle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AdminOverviewData {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  totalCompanies: number;
  activeCompanies: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  totalRevenue: number;
  monthlyRevenue: number;
  recentSignups: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }[];
  recentLogs: {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    user: { name: string; email: string };
  }[];
  monthlySignups: { month: string; count: number }[];
  subscriptionDistribution: { name: string; value: number; color: string }[];
  systemHealth: {
    databaseStatus: string;
    apiLatency: string;
    uptime: string;
    errorRate: string;
  };
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
  return new Date(dateStr).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

function StatCard({
  label,
  value,
  icon: Icon,
  iconBgClass,
  subtitle,
  index,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  iconBgClass: string;
  subtitle?: string;
  index: number;
}) {
  return (
    <motion.div custom={index} initial="hidden" animate="visible" variants={cardVariants}>
      <Card className="p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={cn('flex size-10 items-center justify-center rounded-lg', iconBgClass)}>
            <Icon className="size-5 text-white" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </Card>
    </motion.div>
  );
}

function StatSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-10 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-8 w-32" />
    </Card>
  );
}

export default function AdminOverview() {
  const { locale, setAdminTab } = useAppStore();
  const [data, setData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch admin overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('admin.dashboardTitle', locale)}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('admin.dashboardSubtitle', locale)}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton />
          </>
        ) : data ? (
          <>
            <StatCard
              label={t('admin.totalUsers', locale)}
              value={data.totalUsers.toLocaleString()}
              icon={Users}
              iconBgClass="bg-blue-600"
              subtitle={`${data.activeUsers} ${t('admin.active', locale)}`}
              index={0}
            />
            <StatCard
              label={t('admin.activeCompanies', locale)}
              value={data.activeCompanies.toLocaleString()}
              icon={Building2}
              iconBgClass="bg-emerald-600"
              subtitle={`${t('admin.total', locale)}: ${data.totalCompanies}`}
              index={1}
            />
            <StatCard
              label={t('admin.activeSubscriptions', locale)}
              value={data.activeSubscriptions.toLocaleString()}
              icon={CreditCard}
              iconBgClass="bg-violet-600"
              subtitle={`${data.trialSubscriptions} ${t('admin.inTrial', locale)}`}
              index={2}
            />
            <StatCard
              label={t('admin.totalRevenue', locale)}
              value={formatCurrency(data.totalRevenue)}
              icon={DollarSign}
              iconBgClass="bg-amber-600"
              subtitle={t('admin.monthlyRevenue', locale)}
              index={3}
            />
          </>
        ) : null}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <Card className="p-6">
          <CardHeader className="p-0 pb-4">
            <CardTitle className="text-lg">{t('admin.quickActions', locale)}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="flex flex-wrap gap-3">
              {[
                { icon: UserPlus, label: t('admin.manageUsers', locale), tab: 'users' as const },
                { icon: Building2, label: t('admin.viewCompanies', locale), tab: 'companies' as const },
                { icon: CreditCard, label: t('admin.manageSubs', locale), tab: 'subscriptions' as const },
                { icon: Activity, label: t('admin.viewLogs', locale), tab: 'logs' as const },
              ].map((action) => (
                <Button
                  key={action.tab}
                  variant="outline"
                  className="gap-2 hover:border-red-500 hover:text-red-600 dark:hover:text-red-400"
                  onClick={() => setAdminTab(action.tab)}
                >
                  <action.icon className="size-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg">{t('admin.subDistribution', locale)}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : data && data.subscriptionDistribution.some((d) => d.value > 0) ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={data.subscriptionDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {data.subscriptionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                  {t('common.noData', locale)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Monthly Signups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg">{t('admin.monthlySignups', locale)}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <Skeleton className="h-[280px] w-full" />
              ) : data && data.monthlySignups.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.monthlySignups}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="count" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[280px] items-center justify-center text-muted-foreground">
                  {t('common.noData', locale)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* System Health + Recent Signups */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-600" />
                <CardTitle className="text-lg">{t('admin.systemHealth', locale)}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : data ? (
                [
                  { label: t('admin.database', locale), value: data.systemHealth.databaseStatus, ok: true },
                  { label: t('admin.apiLatency', locale), value: data.systemHealth.apiLatency, ok: true },
                  { label: t('admin.uptime', locale), value: data.systemHealth.uptime, ok: true },
                  { label: t('admin.errorRate', locale), value: data.systemHealth.errorRate, ok: parseFloat(data.systemHealth.errorRate) < 1 },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="text-sm font-medium">{item.label}</span>
                    <Badge
                      className={cn(
                        item.ok
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
                          : 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-100'
                      )}
                    >
                      {item.value}
                    </Badge>
                  </div>
                ))
              ) : null}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Signups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('admin.recentSignups', locale)}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setAdminTab('users')}>
                  {t('admin.viewAll', locale)} <ArrowUpRight className="size-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : data && data.recentSignups.length > 0 ? (
                <div className="rounded-lg border overflow-hidden max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('customers.name', locale)}</TableHead>
                        <TableHead>{t('customers.email', locale)}</TableHead>
                        <TableHead>{t('admin.role', locale)}</TableHead>
                        <TableHead>{t('invoices.status', locale)}</TableHead>
                        <TableHead>{t('invoices.dueDate', locale)}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.recentSignups.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                'text-xs',
                                user.isActive
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'
                              )}
                            >
                              {user.isActive ? t('admin.active', locale) : t('admin.inactive', locale)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(user.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
                  {t('common.noData', locale)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
