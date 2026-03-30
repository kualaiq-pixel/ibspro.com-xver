'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Download,
  Filter,
  ScrollText,
  Clock,
  User,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface LogRecord {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ACTION_TYPES = [
  'login',
  'register',
  'create',
  'update',
  'delete',
  'payment',
];

function getActionBadgeClass(action: string): string {
  const lower = action.toLowerCase();
  if (lower.includes('delete') || lower.includes('remove')) return 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 hover:bg-red-100';
  if (lower.includes('create') || lower.includes('add') || lower.includes('register')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100';
  if (lower.includes('update') || lower.includes('edit') || lower.includes('change')) return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 hover:bg-blue-100';
  if (lower.includes('payment') || lower.includes('purchase')) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-100';
  if (lower.includes('login') || lower.includes('auth')) return 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 hover:bg-violet-100';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100';
}

export default function AdminLogs() {
  const { locale } = useAppStore();
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);
      params.set('page', String(page));
      params.set('limit', '20');

      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.pages);
        setTotal(data.total);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, page]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'User', 'Action', 'Details'].join(','),
      ...logs.map((log) =>
        [
          new Date(log.createdAt).toISOString(),
          log.user.name,
          log.action,
          (log.details || '').replace(/,/g, ';'),
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('admin.exportSuccess', locale));
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t('admin.systemLogs', locale)}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('admin.systemLogsDesc', locale)}
            </p>
          </div>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <Download className="size-4" />
            {t('common.export', locale)}
          </Button>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground left-3 rtl:left-auto rtl:right-3" />
              <Input
                placeholder={t('admin.searchLogs', locale)}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 rtl:pl-3 rtl:pr-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t('admin.allActions', locale)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allActions', locale)}</SelectItem>
                {ACTION_TYPES.map((a) => (
                  <SelectItem key={a} value={a} className="capitalize">{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>
      </motion.div>

      {/* Logs Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                {t('common.noData', locale)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.timestamp', locale)}</TableHead>
                      <TableHead>{t('admin.user', locale)}</TableHead>
                      <TableHead>{t('admin.action', locale)}</TableHead>
                      <TableHead>{t('admin.details', locale)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="size-3.5" />
                            {formatDate(log.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex size-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                              <User className="size-3 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{log.user.name}</p>
                              <p className="text-[10px] text-muted-foreground">{log.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs capitalize', getActionBadgeClass(log.action))}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {log.details || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                {t('admin.showing', locale)} {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} {t('admin.of', locale)} {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {t('common.previous', locale)}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  {t('common.next', locale)}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
