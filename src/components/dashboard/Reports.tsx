'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Calendar,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  Filter,
  UserPlus,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subMonths, startOfMonth } from 'date-fns';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { toast } from 'sonner';

// ── Types ──
interface ReportData {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  incomeByCategory: Record<string, number>;
  expenseByCategory: Record<string, number>;
  monthlyIncome: { month: string; income: number; expenses: number }[];
  topIncomeSources: { category: string; amount: number }[];
  topVendors: { vendor: string; amount: number }[];
  profitLossData: { month: string; income: number; expenses: number; netProfit: number }[];
  topCustomers: { name: string; email: string | null; total: number; invoiceCount: number }[];
  customerCountOverTime: { month: string; newCustomers: number }[];
  totalCustomers: number;
  newCustomerCount: number;
  returningCustomerCount: number;
  invoiceStatusDistribution: { status: string; count: number }[];
  paidAmount: number;
  unpaidAmount: number;
  overdueInvoices: { id: string; invoiceNo: string; customerName: string; total: number; dueDate: string }[];
  avgPaymentDays: number;
  totalInvoices: number;
}

// ── Colors ──
const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#f97316', '#06b6d4'];
const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#ef4444', '#f97316'];

// ── Helpers ──
function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-EU', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return format(new Date(dateStr), 'MMM d, yyyy');
}

// ── Tooltip style ──
const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgb(0 0 0 / 0.12)',
  color: 'hsl(var(--card-foreground))',
  fontSize: '12px',
};

// ── Animation ──
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: 'easeOut' },
  }),
};

// ── Skeletons ──
function ChartSkeleton() {
  return <Skeleton className="h-[320px] w-full rounded-xl" />;
}

function SummaryCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <Skeleton className="mt-3 h-7 w-28" />
      <Skeleton className="mt-1 h-3 w-20" />
    </Card>
  );
}

// ── Summary Card ──
function SummaryCard({
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
    <motion.div custom={index} initial="hidden" animate="visible" variants={fadeUp}>
      <Card className="p-5 hover:shadow-lg transition-shadow duration-300">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <div className={cn('flex size-9 items-center justify-center rounded-lg', iconBgClass)}>
            <Icon className="size-4.5 text-white" />
          </div>
        </div>
        <p className="mt-2 text-xl font-bold tracking-tight">{value}</p>
        {change !== undefined && changeType && (
          <div className="mt-1 flex items-center gap-1">
            {changeType === 'up' ? (
              <ArrowUpRight className="size-3.5 text-emerald-600" />
            ) : (
              <ArrowDownRight className="size-3.5 text-rose-600" />
            )}
            <span className={cn('text-xs font-medium', changeType === 'up' ? 'text-emerald-600' : 'text-rose-600')}>
              {Math.abs(change)}%
            </span>
            <span className="text-xs text-muted-foreground ml-0.5">
              {t('reports.vsLastPeriod', useAppStore.getState().locale)}
            </span>
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ── Custom Label for Pie ──
function renderCustomLabel({ name, percent }: { name: string; percent: number }) {
  return `${name} ${(percent * 100).toFixed(0)}%`;
}

// ── Table Component ──
function DataTable<T>({
  data,
  columns,
  emptyMessage,
}: {
  data: T[];
  columns: { key: string; header: string; render: (row: T) => React.ReactNode }[];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="border-b hover:bg-muted/30 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ──
export default function Reports() {
  const { locale, user } = useAppStore();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState<Date>(subMonths(new Date(), 12));
  const [toDate, setToDate] = useState<Date>(new Date());

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const companyId = user?.companyId;

      if (!companyId) {
        // Use demo data
        setData({
          totalIncome: 127450,
          totalExpenses: 52320,
          netProfit: 75130,
          profitMargin: 58.9,
          incomeByCategory: { Services: 52000, Products: 35200, Consulting: 28500, Subscriptions: 11750 },
          expenseByCategory: { Rent: 12000, Salaries: 18000, Marketing: 8200, Supplies: 6500, Utilities: 4200, Travel: 3420 },
          monthlyIncome: [
            { month: 'Jun 24', income: 8200, expenses: 3600 },
            { month: 'Jul 24', income: 9500, expenses: 3900 },
            { month: 'Aug 24', income: 10200, expenses: 4200 },
            { month: 'Sep 24', income: 8800, expenses: 3800 },
            { month: 'Oct 24', income: 11400, expenses: 4500 },
            { month: 'Nov 24', income: 12800, expenses: 4700 },
            { month: 'Dec 24', income: 13500, expenses: 4900 },
            { month: 'Jan 25', income: 9800, expenses: 4100 },
            { month: 'Feb 25', income: 11200, expenses: 4400 },
            { month: 'Mar 25', income: 10500, expenses: 4200 },
            { month: 'Apr 25', income: 11800, expenses: 4600 },
            { month: 'May 25', income: 10750, expenses: 4320 },
          ],
          topIncomeSources: [
            { category: 'Services', amount: 52000 },
            { category: 'Products', amount: 35200 },
            { category: 'Consulting', amount: 28500 },
            { category: 'Subscriptions', amount: 11750 },
          ],
          topVendors: [
            { vendor: 'Tech Supply Co', amount: 8200 },
            { vendor: 'Office Depot', amount: 6500 },
            { vendor: 'Cloud Hosting Ltd', amount: 4200 },
            { vendor: 'Marketing Pros', amount: 3800 },
            { vendor: 'Travel Agency', amount: 3420 },
          ],
          profitLossData: [
            { month: 'Jun 24', income: 8200, expenses: 3600, netProfit: 4600 },
            { month: 'Jul 24', income: 9500, expenses: 3900, netProfit: 5600 },
            { month: 'Aug 24', income: 10200, expenses: 4200, netProfit: 6000 },
            { month: 'Sep 24', income: 8800, expenses: 3800, netProfit: 5000 },
            { month: 'Oct 24', income: 11400, expenses: 4500, netProfit: 6900 },
            { month: 'Nov 24', income: 12800, expenses: 4700, netProfit: 8100 },
            { month: 'Dec 24', income: 13500, expenses: 4900, netProfit: 8600 },
            { month: 'Jan 25', income: 9800, expenses: 4100, netProfit: 5700 },
            { month: 'Feb 25', income: 11200, expenses: 4400, netProfit: 6800 },
            { month: 'Mar 25', income: 10500, expenses: 4200, netProfit: 6300 },
            { month: 'Apr 25', income: 11800, expenses: 4600, netProfit: 7200 },
            { month: 'May 25', income: 10750, expenses: 4320, netProfit: 6430 },
          ],
          topCustomers: [
            { name: 'Acme Corp', email: 'billing@acme.com', total: 24500, invoiceCount: 12 },
            { name: 'Tech Solutions', email: 'finance@techsolutions.io', total: 18200, invoiceCount: 8 },
            { name: 'Sunrise Hotels', email: 'pay@sunrisehotels.com', total: 15800, invoiceCount: 6 },
            { name: 'Metro Services', email: 'ap@metroservices.fi', total: 12400, invoiceCount: 9 },
            { name: 'Nordic Industries', email: 'info@nordicind.com', total: 9800, invoiceCount: 5 },
            { name: 'Green Valley Ltd', email: 'hello@greenvalley.com', total: 7200, invoiceCount: 4 },
            { name: 'Blue Ocean Corp', email: 'finance@blueocean.com', total: 5600, invoiceCount: 3 },
            { name: 'FastTrack Delivery', email: 'ops@fasttrack.com', total: 4800, invoiceCount: 7 },
          ],
          customerCountOverTime: [
            { month: 'Jun 24', newCustomers: 2 },
            { month: 'Jul 24', newCustomers: 3 },
            { month: 'Aug 24', newCustomers: 1 },
            { month: 'Sep 24', newCustomers: 4 },
            { month: 'Oct 24', newCustomers: 2 },
            { month: 'Nov 24', newCustomers: 5 },
            { month: 'Dec 24', newCustomers: 3 },
            { month: 'Jan 25', newCustomers: 6 },
            { month: 'Feb 25', newCustomers: 2 },
            { month: 'Mar 25', newCustomers: 4 },
            { month: 'Apr 25', newCustomers: 3 },
            { month: 'May 25', newCustomers: 5 },
          ],
          totalCustomers: 48,
          newCustomerCount: 18,
          returningCustomerCount: 30,
          invoiceStatusDistribution: [
            { status: 'paid', count: 42 },
            { status: 'sent', count: 15 },
            { status: 'draft', count: 8 },
            { status: 'overdue', count: 5 },
            { status: 'cancelled', count: 3 },
          ],
          paidAmount: 98400,
          unpaidAmount: 29100,
          overdueInvoices: [
            { id: '1', invoiceNo: 'INV-0032', customerName: 'Metro Services', total: 3200, dueDate: '2025-03-15T00:00:00.000Z' },
            { id: '2', invoiceNo: 'INV-0035', customerName: 'Green Valley Ltd', total: 1800, dueDate: '2025-04-02T00:00:00.000Z' },
            { id: '3', invoiceNo: 'INV-0038', customerName: 'Blue Ocean Corp', total: 4500, dueDate: '2025-04-20T00:00:00.000Z' },
            { id: '4', invoiceNo: 'INV-0041', customerName: 'FastTrack Delivery', total: 960, dueDate: '2025-05-05T00:00:00.000Z' },
            { id: '5', invoiceNo: 'INV-0043', customerName: 'Sunrise Hotels', total: 2800, dueDate: '2025-05-12T00:00:00.000Z' },
          ],
          avgPaymentDays: 14,
          totalInvoices: 73,
        });
        return;
      }

      const from = format(fromDate, 'yyyy-MM-dd');
      const to = format(toDate, 'yyyy-MM-dd');
      const res = await fetch(`/api/reports?companyId=${companyId}&from=${from}&to=${to}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.companyId, fromDate, toDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleExport = useCallback(() => {
    toast.success(t('reports.exportSuccess', locale));
  }, [locale]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';
      case 'sent': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
      case 'draft': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      case 'overdue': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400';
      case 'cancelled': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const incomePieData = data ? Object.entries(data.incomeByCategory).map(([name, value]) => ({ name, value })) : [];
  const expensePieData = data ? Object.entries(data.expenseByCategory).map(([name, value]) => ({ name, value })) : [];
  const statusPieData = data ? data.invoiceStatusDistribution.map((d) => ({ name: d.status, value: d.count })) : [];

  const invoiceStatusColorMap: Record<string, string> = {
    paid: '#10b981',
    sent: '#3b82f6',
    draft: '#9ca3af',
    overdue: '#ef4444',
    cancelled: '#6b7280',
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-violet-600">
              <BarChart3 className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{t('reports.title', locale)}</h1>
              <p className="text-sm text-muted-foreground">{t('reports.subtitle', locale)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="size-4" />
                  <span>{format(fromDate, 'MMM d, yyyy')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={fromDate}
                  onSelect={(d) => d && setFromDate(d)}
                />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground text-sm">—</span>
            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Calendar className="size-4" />
                  <span>{format(toDate, 'MMM d, yyyy')}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={toDate}
                  onSelect={(d) => d && setToDate(d)}
                />
              </PopoverContent>
            </Popover>
            {/* Export */}
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="size-4" />
              {t('reports.export', locale)}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Tabs ── */}
      {loading && !data ? (
        <div className="space-y-6">
          <Skeleton className="h-10 w-full max-w-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <SummaryCardSkeleton key={i} />)}
          </div>
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : data ? (
        <Tabs defaultValue="income" className="space-y-6">
          <TabsList className="bg-muted/80 p-1 h-auto flex-wrap gap-1">
            <TabsTrigger value="income" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-card">
              <TrendingUp className="size-4 hidden sm:block" />
              {t('reports.incomeReport', locale)}
            </TabsTrigger>
            <TabsTrigger value="expense" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-card">
              <TrendingDown className="size-4 hidden sm:block" />
              {t('reports.expenseReport', locale)}
            </TabsTrigger>
            <TabsTrigger value="profitloss" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-card">
              <DollarSign className="size-4 hidden sm:block" />
              {t('reports.profitLoss', locale)}
            </TabsTrigger>
            <TabsTrigger value="customer" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-card">
              <Users className="size-4 hidden sm:block" />
              {t('reports.customerReport', locale)}
            </TabsTrigger>
            <TabsTrigger value="invoice" className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-card">
              <FileText className="size-4 hidden sm:block" />
              {t('reports.invoiceReport', locale)}
            </TabsTrigger>
          </TabsList>

          {/* ═══════════════════ INCOME REPORT TAB ═══════════════════ */}
          <TabsContent value="income" className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <SummaryCard
                label={t('reports.totalIncome', locale)}
                value={formatCurrency(data.totalIncome, user?.currency)}
                change={12.5}
                changeType="up"
                icon={TrendingUp}
                iconBgClass="bg-emerald-600"
                index={0}
              />
            </motion.div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income by Category Pie */}
              <Card className="p-5">
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-base">{t('reports.incomeByCategory', locale)}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {incomePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={incomePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {incomePieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value: number) => [formatCurrency(value), t('reports.amount', locale)]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
                      {t('common.noData', locale)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Income Trend Line */}
              <Card className="p-5">
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-base">{t('reports.incomeTrend', locale)}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.monthlyIncome} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="incLineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [formatCurrency(value), t('reports.income', locale)]}
                      />
                      <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Income Sources Table */}
            <Card className="p-5">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-base">{t('reports.topIncomeSources', locale)}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  data={data.topIncomeSources}
                  columns={[
                    { key: 'rank', header: '#', render: (_, i) => <span className="text-muted-foreground">{i + 1}</span> },
                    { key: 'category', header: t('reports.category', locale), render: (row) => <span className="font-medium">{row.category}</span> },
                    { key: 'amount', header: t('reports.amount', locale), render: (row) => <span className="font-semibold text-emerald-600">{formatCurrency(row.amount, user?.currency)}</span> },
                    { key: 'pct', header: '%', render: (row) => (
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.totalIncome > 0 ? (row.amount / data.totalIncome * 100) : 0}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{data.totalIncome > 0 ? (row.amount / data.totalIncome * 100).toFixed(1) : 0}%</span>
                      </div>
                    )},
                  ]}
                  emptyMessage={t('common.noData', locale)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════ EXPENSE REPORT TAB ═══════════════════ */}
          <TabsContent value="expense" className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <SummaryCard
                label={t('reports.totalExpenses', locale)}
                value={formatCurrency(data.totalExpenses, user?.currency)}
                change={5.2}
                changeType="down"
                icon={TrendingDown}
                iconBgClass="bg-rose-600"
                index={0}
              />
            </motion.div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expenses by Category Pie */}
              <Card className="p-5">
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-base">{t('reports.expensesByCategory', locale)}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {expensePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={expensePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {expensePieData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={tooltipStyle}
                          formatter={(value: number) => [formatCurrency(value), t('reports.amount', locale)]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
                      {t('common.noData', locale)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expense Trend Line */}
              <Card className="p-5">
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-base">{t('reports.expenseTrend', locale)}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data.monthlyIncome} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="expLineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [formatCurrency(value), t('reports.expenses', locale)]}
                      />
                      <Line type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Vendors Table */}
            <Card className="p-5">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-base">{t('reports.topVendors', locale)}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  data={data.topVendors}
                  columns={[
                    { key: 'rank', header: '#', render: (_, i) => <span className="text-muted-foreground">{i + 1}</span> },
                    { key: 'vendor', header: t('reports.vendor', locale), render: (row) => <span className="font-medium">{row.vendor}</span> },
                    { key: 'amount', header: t('reports.amount', locale), render: (row) => <span className="font-semibold text-rose-600">{formatCurrency(row.amount, user?.currency)}</span> },
                    { key: 'pct', header: '%', render: (row) => (
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${data.totalExpenses > 0 ? (row.amount / data.totalExpenses * 100) : 0}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{data.totalExpenses > 0 ? (row.amount / data.totalExpenses * 100).toFixed(1) : 0}%</span>
                      </div>
                    )},
                  ]}
                  emptyMessage={t('common.noData', locale)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════ PROFIT & LOSS TAB ═══════════════════ */}
          <TabsContent value="profitloss" className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                  label={t('reports.totalRevenue', locale)}
                  value={formatCurrency(data.totalIncome, user?.currency)}
                  change={12.5}
                  changeType="up"
                  icon={TrendingUp}
                  iconBgClass="bg-emerald-600"
                  index={0}
                />
                <SummaryCard
                  label={t('reports.totalExpenses', locale)}
                  value={formatCurrency(data.totalExpenses, user?.currency)}
                  change={5.2}
                  changeType="down"
                  icon={TrendingDown}
                  iconBgClass="bg-rose-600"
                  index={1}
                />
                <SummaryCard
                  label={t('reports.netProfit', locale)}
                  value={formatCurrency(data.netProfit, user?.currency)}
                  change={18.7}
                  changeType="up"
                  icon={DollarSign}
                  iconBgClass="bg-blue-600"
                  index={2}
                />
                <SummaryCard
                  label={t('reports.profitMargin', locale)}
                  value={`${data.profitMargin}%`}
                  change={3.1}
                  changeType="up"
                  icon={BarChart3}
                  iconBgClass="bg-violet-600"
                  index={3}
                />
              </div>
            </motion.div>

            {/* Income vs Expenses Bar Chart */}
            <Card className="p-5">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-base">{t('reports.incomeVsExpenses', locale)}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={data.profitLossData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === 'income' ? t('reports.income', locale) : name === 'expenses' ? t('reports.expenses', locale) : t('reports.netProfit', locale),
                      ]}
                    />
                    <Legend
                      formatter={(value) =>
                        value === 'income' ? t('reports.income', locale) : value === 'expenses' ? t('reports.expenses', locale) : t('reports.netProfit', locale)
                      }
                    />
                    <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                    <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Net Profit Line Chart */}
            <Card className="p-5">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-base">{t('reports.netProfitTrend', locale)}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.profitLossData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="netProfitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value: number) => [formatCurrency(value), t('reports.netProfit', locale)]}
                    />
                    <Area type="monotone" dataKey="netProfit" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#netProfitGrad)" dot={{ r: 4, fill: '#8b5cf6' }} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Breakdown Table */}
            <Card className="p-5">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-base">{t('reports.monthlyBreakdown', locale)}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  data={data.profitLossData}
                  columns={[
                    { key: 'month', header: t('reports.month', locale), render: (row) => <span className="font-medium">{row.month}</span> },
                    { key: 'income', header: t('reports.income', locale), render: (row) => <span className="text-emerald-600 font-semibold">{formatCurrency(row.income, user?.currency)}</span> },
                    { key: 'expenses', header: t('reports.expenses', locale), render: (row) => <span className="text-rose-600 font-semibold">{formatCurrency(row.expenses, user?.currency)}</span> },
                    { key: 'netProfit', header: t('reports.netProfit', locale), render: (row) => (
                      <span className={cn('font-bold', row.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {formatCurrency(row.netProfit, user?.currency)}
                      </span>
                    )},
                    { key: 'margin', header: t('reports.margin', locale), render: (row) => {
                      const margin = row.income > 0 ? (row.netProfit / row.income * 100).toFixed(1) : '0.0';
                      return <Badge variant="secondary" className={Number(margin) >= 50 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'}>{margin}%</Badge>;
                    }},
                  ]}
                  emptyMessage={t('common.noData', locale)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════ CUSTOMER REPORT TAB ═══════════════════ */}
          <TabsContent value="customer" className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard
                  label={t('reports.totalCustomers', locale)}
                  value={data.totalCustomers.toString()}
                  icon={Users}
                  iconBgClass="bg-blue-600"
                  index={0}
                />
                <SummaryCard
                  label={t('reports.newCustomers', locale)}
                  value={data.newCustomerCount.toString()}
                  change={24}
                  changeType="up"
                  icon={UserPlus}
                  iconBgClass="bg-emerald-600"
                  index={1}
                />
                <SummaryCard
                  label={t('reports.returningCustomers', locale)}
                  value={data.returningCustomerCount.toString()}
                  icon={TrendingUp}
                  iconBgClass="bg-violet-600"
                  index={2}
                />
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customer Growth */}
              <Card className="p-5">
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-base">{t('reports.customerGrowth', locale)}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.customerCountOverTime} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" allowDecimals={false} />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(value: number) => [value, t('reports.newCustomers', locale)]}
                      />
                      <Bar dataKey="newCustomers" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* New vs Returning Pie */}
              <Card className="p-5">
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-base">{t('reports.newVsReturning', locale)}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: t('reports.newCustomers', locale), value: data.newCustomerCount },
                          { name: t('reports.returningCustomers', locale), value: data.returningCustomerCount },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={100}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#8b5cf6" />
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Customers Table */}
            <Card className="p-5">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-base">{t('reports.topCustomers', locale)}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  data={data.topCustomers}
                  columns={[
                    { key: 'rank', header: '#', render: (_, i) => (
                      <span className={cn('font-bold', i < 3 ? 'text-amber-500' : 'text-muted-foreground')}>{i + 1}</span>
                    )},
                    { key: 'name', header: t('reports.customer', locale), render: (row) => (
                      <div>
                        <p className="font-medium">{row.name}</p>
                        {row.email && <p className="text-xs text-muted-foreground">{row.email}</p>}
                      </div>
                    )},
                    { key: 'invoices', header: t('reports.invoices', locale), render: (row) => <Badge variant="secondary">{row.invoiceCount}</Badge> },
                    { key: 'revenue', header: t('reports.revenue', locale), render: (row) => <span className="font-semibold text-emerald-600">{formatCurrency(row.total, user?.currency)}</span> },
                    { key: 'bar', header: '', render: (row) => (
                      <div className="min-w-[100px]">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.topCustomers.length > 0 && data.topCustomers[0].total > 0 ? (row.total / data.topCustomers[0].total * 100) : 0}%` }} />
                        </div>
                      </div>
                    )},
                  ]}
                  emptyMessage={t('common.noData', locale)}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══════════════════ INVOICE REPORT TAB ═══════════════════ */}
          <TabsContent value="invoice" className="space-y-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard
                  label={t('reports.totalInvoices', locale)}
                  value={data.totalInvoices.toString()}
                  icon={FileText}
                  iconBgClass="bg-blue-600"
                  index={0}
                />
                <SummaryCard
                  label={t('reports.paidAmount', locale)}
                  value={formatCurrency(data.paidAmount, user?.currency)}
                  icon={TrendingUp}
                  iconBgClass="bg-emerald-600"
                  index={1}
                />
                <SummaryCard
                  label={t('reports.unpaidAmount', locale)}
                  value={formatCurrency(data.unpaidAmount, user?.currency)}
                  icon={AlertTriangle}
                  iconBgClass="bg-amber-600"
                  index={2}
                />
                <SummaryCard
                  label={t('reports.avgPaymentTime', locale)}
                  value={`${data.avgPaymentDays} ${t('reports.days', locale)}`}
                  icon={Clock}
                  iconBgClass="bg-violet-600"
                  index={3}
                />
              </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Invoice Status Pie */}
              <Card className="p-5">
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-base">{t('reports.invoiceStatusDist', locale)}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {statusPieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {statusPieData.map((entry) => (
                            <Cell key={entry.name} fill={invoiceStatusColorMap[entry.name] || '#9ca3af'} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground text-sm">
                      {t('common.noData', locale)}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Paid vs Unpaid */}
              <Card className="p-5">
                <CardHeader className="p-0 pb-3">
                  <CardTitle className="text-base">{t('reports.paidVsUnpaid', locale)}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex flex-col items-center justify-center h-[300px] gap-6">
                    {/* Visual bar comparison */}
                    <div className="w-full max-w-xs space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-emerald-600">{t('reports.paid', locale)}</span>
                          <span className="font-semibold">{formatCurrency(data.paidAmount, user?.currency)}</span>
                        </div>
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${data.paidAmount + data.unpaidAmount > 0 ? (data.paidAmount / (data.paidAmount + data.unpaidAmount) * 100) : 0}%` }}
                            transition={{ duration: 1, delay: 0.3 }}
                            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-rose-600">{t('reports.unpaid', locale)}</span>
                          <span className="font-semibold">{formatCurrency(data.unpaidAmount, user?.currency)}</span>
                        </div>
                        <div className="h-4 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${data.paidAmount + data.unpaidAmount > 0 ? (data.unpaidAmount / (data.paidAmount + data.unpaidAmount) * 100) : 0}%` }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status badges */}
                    <div className="flex gap-2 flex-wrap justify-center">
                      {data.invoiceStatusDistribution.map((item) => (
                        <Badge key={item.status} className={cn('text-xs', getStatusColor(item.status))}>
                          {item.status}: {item.count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overdue Invoices */}
            <Card className="p-5">
              <CardHeader className="p-0 pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="size-4 text-rose-500" />
                    {t('reports.overdueInvoices', locale)}
                  </CardTitle>
                  <Badge variant="destructive" className="text-xs">{data.overdueInvoices.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {data.overdueInvoices.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto">
                    <DataTable
                      data={data.overdueInvoices}
                      columns={[
                        { key: 'invoiceNo', header: t('reports.invoiceNo', locale), render: (row) => (
                          <span className="font-mono font-medium text-sm">{row.invoiceNo}</span>
                        )},
                        { key: 'customer', header: t('reports.customer', locale), render: (row) => <span className="font-medium">{row.customerName}</span> },
                        { key: 'total', header: t('reports.amount', locale), render: (row) => <span className="font-semibold text-rose-600">{formatCurrency(row.total, user?.currency)}</span> },
                        { key: 'dueDate', header: t('reports.dueDate', locale), render: (row) => (
                          <div className="flex items-center gap-1">
                            <Clock className="size-3.5 text-rose-500" />
                            <span className="text-xs text-rose-600 font-medium">{formatDate(row.dueDate)}</span>
                          </div>
                        )},
                      ]}
                      emptyMessage={t('reports.noOverdue', locale)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                    <TrendingUp className="size-8 text-emerald-500" />
                    <p className="text-sm">{t('reports.noOverdue', locale)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </div>
  );
}
