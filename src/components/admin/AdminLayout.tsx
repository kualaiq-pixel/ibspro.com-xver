'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Building2,
  CreditCard,
  MessageCircle,
  ScrollText,
  Settings,
  ArrowLeft,
  Bell,
  Shield,
  Menu,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAppStore, type AdminTab } from '@/lib/store';
import { t, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NavItem {
  icon: React.ElementType;
  labelKey: string;
  tab: AdminTab;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: 'admin.overview', tab: 'overview' },
  { icon: Users, labelKey: 'admin.users', tab: 'users' },
  { icon: Building2, labelKey: 'admin.companies', tab: 'companies' },
  { icon: CreditCard, labelKey: 'admin.subscriptions', tab: 'subscriptions' },
  { icon: MessageCircle, labelKey: 'admin.chats', tab: 'chats' },
  { icon: ScrollText, labelKey: 'admin.logs', tab: 'logs' },
  { icon: Settings, labelKey: 'admin.settings', tab: 'settings' },
];

function AdminSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { adminTab, setAdminTab, locale, user } = useAppStore();
  const isRtl = locale === 'ar';

  const handleNavClick = useCallback(
    (tab: AdminTab) => {
      setAdminTab(tab);
      onNavigate?.();
    },
    [setAdminTab, onNavigate]
  );

  const handleBackToSite = useCallback(() => {
    useAppStore.getState().setView('landing');
  }, []);

  const handleLogout = useCallback(() => {
    useAppStore.getState().logout();
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  return (
    <div className="flex h-full flex-col bg-slate-900 dark:bg-slate-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-700/50">
        <div className="flex size-9 items-center justify-center rounded-lg bg-red-600 text-white font-bold text-lg shadow-lg shadow-red-600/25">
          <Shield className="size-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-white">
            Admin Panel
          </span>
          <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">
            IBS Pro
          </span>
        </div>
      </div>

      <Separator className="bg-slate-700/50" />

      {/* Nav Items */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = adminTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => handleNavClick(item.tab)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  'hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-700'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span>{t(item.labelKey as 'admin.overview', locale)}</span>
                {item.tab === 'chats' && (
                  <Badge className="ml-auto bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-5 min-w-5">
                    3
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-slate-700/50" />

      {/* Bottom section */}
      <div className="p-3">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 mb-2">
            <Avatar className="size-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-red-600/20 text-red-400 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">Administrator</p>
            </div>
          </div>
        )}

        {/* Back to Site */}
        <button
          onClick={handleBackToSite}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 mb-1',
            'text-slate-400 hover:bg-slate-800 hover:text-white'
          )}
        >
          <ArrowLeft className="size-5 shrink-0" />
          <span>{t('admin.backToSite', locale)}</span>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
            'text-slate-500 hover:bg-red-950/50 hover:text-red-400'
          )}
        >
          <span className="text-sm">{t('auth.logout', locale)}</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, setLocale, user } = useAppStore();
  const { theme, setTheme } = useTheme();
  const isRtl = locale === 'ar';

  const handleLocaleChange = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
    },
    [setLocale]
  );

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'A';

  return (
    <div className={cn('flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950', isRtl && 'rtl')}>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <AdminSidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center gap-4 border-b bg-white dark:bg-slate-900 px-4 lg:px-6 shadow-sm">
          {/* Mobile menu button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden text-slate-600 dark:text-slate-400">
                <Menu className="size-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side={isRtl ? 'right' : 'left'} className="w-72 p-0">
              <SheetTitle className="sr-only">Admin Navigation</SheetTitle>
              <AdminSidebarContent />
            </SheetContent>
          </Sheet>

          {/* Title */}
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-red-600 dark:text-red-500" />
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('admin.portal', locale)}
            </h1>
          </div>

          <div className="flex items-center gap-1 ml-auto rtl:ml-0 rtl:mr-auto">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative text-slate-600 dark:text-slate-400">
              <Bell className="size-5" />
              <Badge className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 bg-red-500 text-white text-[10px] rounded-full">
                5
              </Badge>
            </Button>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                  {locale.toUpperCase()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleLocaleChange('en')}>
                  <span className="mr-2">🇬🇧</span> English
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLocaleChange('fi')}>
                  <span className="mr-2">🇫🇮</span> Suomi
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleLocaleChange('ar')}>
                  <span className="mr-2">🇸🇦</span> العربية
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Theme Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-slate-600 dark:text-slate-400">
                  <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="size-4 mr-2" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="size-4 mr-2" /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="size-4 mr-2" /> System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Admin User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="size-9">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                    <Badge className="w-fit bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 text-[10px] hover:bg-red-100 mt-1">
                      Administrator
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => useAppStore.getState().setView('landing')}
                >
                  <ArrowLeft className="size-4 mr-2" />
                  {t('admin.backToSite', locale)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => useAppStore.getState().logout()}
                  className="text-red-600 focus:text-red-600"
                >
                  {t('auth.logout', locale)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
