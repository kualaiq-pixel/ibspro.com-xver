'use client';

import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  ClipboardList,
  Award,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Search,
  Bell,
  Sun,
  Moon,
  Monitor,
  ChevronLeft,
  ChevronRight,
  User,
  LogIn,
} from 'lucide-react';
import { useAppStore, type DashboardTab } from '@/lib/store';
import { t, type Locale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  tab: DashboardTab;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, labelKey: 'nav.dashboard', tab: 'overview' },
  { icon: Users, labelKey: 'nav.customers', tab: 'customers' },
  { icon: TrendingUp, labelKey: 'nav.income', tab: 'income' },
  { icon: TrendingDown, labelKey: 'nav.expenses', tab: 'expenses' },
  { icon: FileText, labelKey: 'nav.invoices', tab: 'invoices' },
  { icon: Calendar, labelKey: 'nav.bookings', tab: 'bookings' },
  { icon: ClipboardList, labelKey: 'nav.workOrders', tab: 'work-orders' },
  { icon: Award, labelKey: 'nav.certificates', tab: 'certificates' },
  { icon: BarChart3, labelKey: 'nav.reports', tab: 'reports' },
  { icon: Settings, labelKey: 'nav.settings', tab: 'settings' },
];

function SidebarContent({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { dashboardTab, setDashboardTab, locale, user } = useAppStore();
  const isRtl = locale === 'ar';

  const handleNavClick = useCallback(
    (tab: DashboardTab) => {
      setDashboardTab(tab);
      onNavigate?.();
    },
    [setDashboardTab, onNavigate]
  );

  const handleLogout = useCallback(() => {
    useAppStore.getState().logout();
  }, []);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold text-lg">
          I
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          IBS Pro
        </span>
      </div>

      <Separator />

      {/* Nav Items */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = dashboardTab === item.tab;
            return (
              <button
                key={item.tab}
                onClick={() => handleNavClick(item.tab)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  'hover:bg-accent hover:text-accent-foreground',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 hover:text-white'
                    : 'text-muted-foreground'
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span>{t(item.labelKey as 'nav.dashboard', locale)}</span>
              </button>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      {/* Bottom section */}
      <div className="p-3">
        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 mb-2">
            <Avatar className="size-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.companyName || user.role}
              </p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
            'text-muted-foreground hover:bg-red-50 hover:text-red-600',
            'dark:hover:bg-red-950/50 dark:hover:text-red-400'
          )}
        >
          <LogOut className="size-5 shrink-0" />
          <span>{t('nav.logout', locale)}</span>
        </button>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    sidebarOpen,
    setSidebarOpen,
    locale,
    setLocale,
    user,
    dashboardTab,
    setDashboardTab,
    unreadMessages,
  } = useAppStore();
  const { theme, setTheme } = useTheme();
  const isRtl = locale === 'ar';

  const handleLocaleChange = useCallback(
    (newLocale: Locale) => {
      setLocale(newLocale);
    },
    [setLocale]
  );

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  return (
    <div className={cn('flex h-screen overflow-hidden bg-background', isRtl && 'rtl')}>
      {/* Desktop Sidebar */}
      <motion.aside
        className="hidden lg:flex flex-col border-r bg-card"
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        <SidebarContent />
      </motion.aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 lg:px-6">
          {/* Mobile menu button */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side={isRtl ? 'right' : 'left'} className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SidebarContent />
            </SheetContent>
          </Sheet>

          {/* Desktop sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:flex"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {isRtl ? (
              sidebarOpen ? (
                <ChevronRight className="size-5" />
              ) : (
                <ChevronLeft className="size-5" />
              )
            ) : sidebarOpen ? (
              <ChevronLeft className="size-5" />
            ) : (
              <ChevronRight className="size-5" />
            )}
          </Button>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground left-3 rtl:left-auto rtl:right-3" />
            <Input
              placeholder={t('nav.search', locale)}
              className="pl-9 rtl:pl-3 rtl:pr-9 h-9 bg-muted/50"
            />
          </div>

          <div className="flex items-center gap-1 ml-auto rtl:ml-0 rtl:mr-auto">
            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="size-5" />
              {unreadMessages > 0 && (
                <Badge className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 bg-red-500 text-white text-[10px] rounded-full">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </Badge>
              )}
            </Button>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-xs font-medium">
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
                <Button variant="ghost" size="icon">
                  <Sun className="size-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute size-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                  <span className="sr-only">Toggle theme</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>
                  <Sun className="size-4 mr-2" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>
                  <Moon className="size-4 mr-2" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>
                  <Monitor className="size-4 mr-2" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="size-9">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
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
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setDashboardTab('settings')}>
                  <User className="size-4 mr-2" />
                  {t('settings.profile', locale)}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDashboardTab('settings')}>
                  <Settings className="size-4 mr-2" />
                  {t('settings.title', locale)}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => useAppStore.getState().logout()}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50"
                >
                  <LogOut className="size-4 mr-2" />
                  {t('auth.logout', locale)}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={dashboardTab}
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
