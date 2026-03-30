'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Calendar,
  ClipboardList,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertCircle,
  UserPlus,
  CalendarPlus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useAppStore, type DashboardTab } from '@/lib/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoicesCount: number;
  activeBookingsCount: number;
  openWorkOrdersCount: number;
  monthlyData: { month: string; income: number; expenses: number }[];
  recentActivity: {
    id: string;
    action: string;
    details: string | null;
    createdAt: string;
    userName: string;
    userAvatar: string | null;
  }[];
  upcomingBookings: {
    id: string;
    title: string;
    startDate: string;
    endDate: string | null;
    status: string;
    location: string | null;
    customerName: string;
  }[];
  dueInvoices: {
    id: string;
    invoiceNo: string;
    total: number;
    dueDate: string;
    status: string;
    customerName: string;
  }[];
}

function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Stat card animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' },
  }),
};

// Stat card skeleton
function StatCardSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-10 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-8 w-32" />
      <Skeleton className="mt-1 h-3 w-20" />
    </Card>
  );
}

// Stat card component
function StatCard({
  label,
  value,
  change,
  changeType,
  icon: Icon,
  iconBgClass,
  index,
}: {
  label: string;
  value: string;
  change?: number;
  changeType?: 'up' | 'down';
  icon: React.ElementType;
  iconBgClass: string;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      variants={cardVariants}
    >
      <Card className="p-6 hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={cn('flex size-10 items-center justify-center rounded-lg', iconBgClass)}>
            <Icon className="size-5 text-white" />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
        {change !== undefined && changeType && (
          <div className="mt-1 flex items-center gap-1">
            {changeType === 'up' ? (
              <ArrowUpRight className="size-3.5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="size-3.5 text-rose-600" />
            )}
            <span
              className={cn(
                'text-xs font-medium',
                changeType === 'up' ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {change}%
            </span>
            <span className="text-xs text-muted-foreground ml-1">vs last month</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// Quick action button
function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  delay,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 + delay * 0.08, duration: 0.3 }}
    >
      <Button
        variant="outline"
        className="flex h-auto flex-col items-center gap-2 p-4 w-full hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors duration-200 group"
        onClick={onClick}
      >
        <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-950 dark:text-emerald-400 dark:group-hover:bg-emerald-600 dark:group-hover:text-white transition-colors">
          <Icon className="size-5" />
        </div>
        <span className="text-xs font-medium">{label}</span>
      </Button>
    </motion.div>
  );
}

export default function Overview() {
  const { locale, setDashboardTab, user } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const companyId = user?.companyId;
      if (!companyId) {
        // Use mock data if no company ID
        setStats({
          totalIncome: 48250,
          totalExpenses: 18320,
          netProfit: 29930,
          pendingInvoicesCount: 7,
          activeBookingsCount: 12,
          openWorkOrdersCount: 5,
          monthlyData: [
            { month: 'Nov 24', income: 8200, expenses: 3100 },
            { month: 'Dec 24', income: 9100, expenses: 3400 },
            { month: 'Jan 25', income: 7800, expenses: 2900 },
            { month: 'Feb 25', income: 8900, expenses: 3200 },
            { month: 'Mar 25', income: 7400, expenses: 2800 },
            { month: 'Apr 25', income: 6850, expenses: 2920 },
          ],
          recentActivity: [
            { id: '1', action: 'Created invoice', details: 'INV-2025-0042 for Acme Corp', createdAt: new Date(Date.now() - 1800000).toISOString(), userName: 'John Doe', userAvatar: null },
            { id: '2', action: 'New booking', details: 'HVAC maintenance scheduled', createdAt: new Date(Date.now() - 7200000).toISOString(), userName: 'Jane Smith', userAvatar: null },
            { id: '3', action: 'Payment received', details: '€2,400 from Tech Solutions', createdAt: new Date(Date.now() - 18000000).toISOString(), userName: 'John Doe', userAvatar: null },
            { id: '4', action: 'Work order completed', details: 'Plumbing repair at Office Park', createdAt: new Date(Date.now() - 43200000).toISOString(), userName: 'Mike Johnson', userAvatar: null },
            { id: '5', action: 'Customer added', details: 'New customer: Sunrise Hotels', createdAt: new Date(Date.now() - 86400000).toISOString(), userName: 'Jane Smith', userAvatar: null },
          ],
          upcomingBookings: [
            { id: '1', title: 'HVAC Maintenance', startDate: new Date(Date.now() + 86400000).toISOString(), endDate: new Date(Date.now() + 172800000).toISOString(), status: 'confirmed', location: 'Downtown Office', customerName: 'Acme Corp' },
            { id: '2', title: 'Electrical Inspection', startDate: new Date(Date.now() + 259200000).toISOString(), endDate: null, status: 'pending', location: 'Tech Park Bldg 3', customerName: 'Tech Solutions' },
            { id: '3', title: 'Fire Safety Check', startDate: new Date(Date.now() + 432000000).toISOString(), endDate: new Date(Date.now() + 518400000).toISOString(), status: 'confirmed', location: 'Metro Mall', customerName: 'Sunrise Hotels' },
          ],
          dueInvoices: [
            { id: '1', invoiceNo: 'INV-2025-0038', total: 1500, dueDate: new Date(Date.now() + 3 * 86400000).toISOString(), status: 'sent', customerName: 'Acme Corp' },
            { id: '2', invoiceNo: 'INV-2025-0040', total: 3200, dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), status: 'sent', customerName: 'Tech Solutions' },
            { id: '3', invoiceNo: 'INV-2025-0041', total: 800, dueDate: new Date(Date.now() + 14 * 86400000).toISOString(), status: 'draft', customerName: 'Metro Services' },
          ],
        });
        return;
      }
      const res = await fetch(`/api/dashboard/stats?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.companyId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleQuickAction = useCallback(
    (tab: DashboardTab) => {
      setDashboardTab(tab);
    },
    [setDashboardTab]
  );

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">
          {t('dashboard.welcome', locale)}, {user?.name?.split(' ')[0] || ''} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('dashboard.title', locale)} — {t('dashboard.overview', locale)}
        </p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <StatCard
              label={t('dashboard.totalIncome', locale)}
              value={formatCurrency(stats.totalIncome, user?.currency)}
              change={12.5}
              changeType="up"
              icon={TrendingUp}
              iconBgClass="bg-emerald-600"
              index={0}
            />
            <StatCard
              label={t('dashboard.totalExpenses', locale)}
              value={formatCurrency(stats.totalExpenses, user?.currency)}
              change={3.2}
              changeType="down"
              icon={TrendingDown}
              iconBgClass="bg-rose-600"
              index={1}
            />
            <StatCard
              label={t('dashboard.netProfit', locale)}
              value={formatCurrency(stats.netProfit, user?.currency)}
              change={18.7}
              changeType="up"
              icon={DollarSign}
              iconBgClass="bg-blue-600"
              index={2}
            />
            <StatCard
              label={t('dashboard.pendingInvoices', locale)}
              value={stats.pendingInvoicesCount.toString()}
              icon={FileText}
              iconBgClass="bg-amber-600"
              index={3}
            />
          </>
        ) : null}
      </div>

      {/* Revenue Chart + Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
          className="lg:col-span-2"
        >
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{t('dashboard.revenueChart', locale)}</CardTitle>
                  <CardDescription>{t('dashboard.monthlyTrend', locale)}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : stats && stats.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.monthlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                      tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        color: 'hsl(var(--card-foreground))',
                      }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'income' ? 'Income' : 'Expenses',
                      ]}
                    />
                    <Legend
                      formatter={(value) =>
                        value === 'income' ? 'Income' : 'Expenses'
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#incomeGradient)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expenses"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      fill="url(#expenseGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  {t('common.noData', locale)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Side Panel - Quick Actions + Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          className="space-y-6"
        >
          {/* Quick Actions */}
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg">{t('dashboard.quickActions', locale)}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 gap-3">
                <QuickActionButton
                  icon={FileText}
                  label={t('dashboard.newInvoice', locale)}
                  onClick={() => handleQuickAction('invoices')}
                  delay={0}
                />
                <QuickActionButton
                  icon={UserPlus}
                  label={t('dashboard.newCustomer', locale)}
                  onClick={() => handleQuickAction('customers')}
                  delay={1}
                />
                <QuickActionButton
                  icon={CalendarPlus}
                  label={t('dashboard.newBooking', locale)}
                  onClick={() => handleQuickAction('bookings')}
                  delay={2}
                />
                <QuickActionButton
                  icon={ClipboardList}
                  label={t('dashboard.newWorkOrder', locale)}
                  onClick={() => handleQuickAction('work-orders')}
                  delay={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle className="text-lg">{t('dashboard.title', locale)}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              {loading ? (
                <>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </>
              ) : stats ? (
                <>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-3">
                      <Calendar className="size-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-medium">{t('dashboard.activeBookings', locale)}</p>
                        <p className="text-xs text-muted-foreground">Currently active</p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-700">
                      {stats.activeBookingsCount}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                    <div className="flex items-center gap-3">
                      <ClipboardList className="size-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-medium">{t('dashboard.openWorkOrders', locale)}</p>
                        <p className="text-xs text-muted-foreground">Needs attention</p>
                      </div>
                    </div>
                    <Badge className="bg-blue-600 text-white hover:bg-blue-700">
                      {stats.openWorkOrdersCount}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="size-5 text-amber-600" />
                      <div>
                        <p className="text-sm font-medium">{t('dashboard.pendingInvoices', locale)}</p>
                        <p className="text-xs text-muted-foreground">Awaiting payment</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-600 text-white hover:bg-amber-700">
                      {stats.pendingInvoicesCount}
                    </Badge>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom Section: Recent Activity + Upcoming */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        >
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('dashboard.recentActivity', locale)}</CardTitle>
                <Clock className="size-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="size-9 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-24 mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : stats && stats.recentActivity.length > 0 ? (
                <div className="space-y-1 max-h-80 overflow-y-auto">
                  {stats.recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="size-9 mt-0.5">
                        <AvatarImage src={activity.userAvatar || ''} alt={activity.userName} />
                        <AvatarFallback className="text-[10px] font-semibold bg-muted">
                          {getInitials(activity.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          <span className="font-semibold">{activity.userName}</span>{' '}
                          <span className="text-muted-foreground">{activity.action.toLowerCase()}</span>
                        </p>
                        {activity.details && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {activity.details}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(activity.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
                  {t('common.noData', locale)}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Upcoming Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.4 }}
          className="space-y-6"
        >
          {/* Upcoming Bookings */}
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('dashboard.upcoming', locale)}</CardTitle>
                <Calendar className="size-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : stats && stats.upcomingBookings.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stats.upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex size-10 flex-col items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 shrink-0">
                        <span className="text-[10px] font-medium uppercase leading-none">
                          {new Date(booking.startDate).toLocaleDateString('en', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold leading-none mt-0.5">
                          {new Date(booking.startDate).getDate()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{booking.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {booking.customerName}
                          {booking.location && ` • ${booking.location}`}
                        </p>
                      </div>
                      <Badge
                        variant={
                          booking.status === 'confirmed'
                            ? 'default'
                            : 'secondary'
                        }
                        className={cn(
                          'shrink-0 text-[10px]',
                          booking.status === 'confirmed' &&
                            'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
                        )}
                      >
                        {booking.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center text-muted-foreground text-sm">
                  {t('common.noData', locale)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Due Invoices */}
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{t('dashboard.dueSoon', locale)}</CardTitle>
                <AlertCircle className="size-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : stats && stats.dueInvoices.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stats.dueInvoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex size-10 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 shrink-0">
                        <FileText className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {invoice.invoiceNo}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {invoice.customerName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">
                          {formatCurrency(invoice.total, user?.currency)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(invoice.dueDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-20 items-center justify-center text-muted-foreground text-sm">
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
