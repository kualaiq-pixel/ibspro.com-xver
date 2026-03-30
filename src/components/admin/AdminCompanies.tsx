'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Building2,
  Eye,
  MoreHorizontal,
  Power,
  PowerOff,
  MapPin,
  Globe,
  Mail,
  Phone,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface CompanyRecord {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  postalCode: string | null;
  website: string | null;
  vatNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminCompanies() {
  const { locale } = useAppStore();
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<CompanyRecord | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/companies?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies);
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleToggleActive = async (company: CompanyRecord) => {
    try {
      const res = await fetch(`/api/admin/companies`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          isActive: !company.isActive,
        }),
      });
      if (res.ok) {
        toast.success(
          company.isActive ? t('admin.companyDeactivated', locale) : t('admin.companyActivated', locale)
        );
        fetchCompanies();
      }
    } catch {
      toast.error(t('common.error', locale));
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('admin.companyManagement', locale)}
        </h1>
        <p className="text-muted-foreground mt-1">{t('admin.companyManagementDesc', locale)}</p>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground left-3 rtl:left-auto rtl:right-3" />
            <Input
              placeholder={t('admin.searchCompanies', locale)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rtl:pl-3 rtl:pr-9"
            />
          </div>
        </Card>
      </motion.div>

      {/* Companies Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : companies.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-muted-foreground">
                {t('common.noData', locale)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('admin.companyName', locale)}</TableHead>
                      <TableHead>{t('customers.email', locale)}</TableHead>
                      <TableHead>{t('admin.usersCount', locale)}</TableHead>
                      <TableHead>{t('invoices.dueDate', locale)}</TableHead>
                      <TableHead>{t('invoices.status', locale)}</TableHead>
                      <TableHead className="text-right">{t('common.actions', locale)}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/40">
                              <Building2 className="size-4 text-blue-600 dark:text-blue-400" />
                            </div>
                            <span className="font-medium">{company.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{company.email || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {company.userCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(company.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              'text-xs',
                              company.isActive
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'
                            )}
                          >
                            {company.isActive ? t('admin.active', locale) : t('admin.inactive', locale)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedCompany(company)}>
                                <Eye className="size-4 mr-2" />
                                {t('common.view', locale)}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleActive(company)}>
                                {company.isActive ? (
                                  <><PowerOff className="size-4 mr-2" />{t('admin.deactivate', locale)}</>
                                ) : (
                                  <><Power className="size-4 mr-2" />{t('admin.activate', locale)}</>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Company Details Dialog */}
      <Dialog open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-red-600" />
              {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Mail, label: t('customers.email', locale), value: selectedCompany.email },
                  { icon: Phone, label: t('customers.phone', locale), value: selectedCompany.phone },
                  { icon: Globe, label: t('settings.website', locale), value: selectedCompany.website },
                  { icon: MapPin, label: t('customers.city', locale), value: selectedCompany.city || selectedCompany.address },
                ].map((item) => (
                  <div key={item.label} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                    <item.icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-medium">{item.value || '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('admin.vatNumber', locale)}</p>
                    <p className="text-sm font-medium">{selectedCompany.vatNumber || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('admin.usersCount', locale)}</p>
                    <p className="text-sm font-medium">{selectedCompany.userCount}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground pt-2">
                <span>{t('admin.created', locale)}: {formatDate(selectedCompany.createdAt)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
