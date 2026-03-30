'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import LandingPage from '@/components/landing/LandingPage';
import LoginForm from '@/components/auth/LoginForm';
import AdminLoginForm from '@/components/auth/AdminLoginForm';
import RegisterForm from '@/components/auth/RegisterForm';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Overview from '@/components/dashboard/Overview';
import Customers from '@/components/dashboard/Customers';
import Income from '@/components/dashboard/Income';
import Expenses from '@/components/dashboard/Expenses';
import Invoices from '@/components/dashboard/Invoices';
import Bookings from '@/components/dashboard/Bookings';
import WorkOrders from '@/components/dashboard/WorkOrders';
import Certificates from '@/components/dashboard/Certificates';
import Reports from '@/components/dashboard/Reports';
import Settings from '@/components/dashboard/Settings';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminOverview from '@/components/admin/AdminOverview';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminCompanies from '@/components/admin/AdminCompanies';
import AdminSubscriptions from '@/components/admin/AdminSubscriptions';
import AdminChats from '@/components/admin/AdminChats';
import AdminLogs from '@/components/admin/AdminLogs';
import AdminSettings from '@/components/admin/AdminSettings';
import ChatWidget from '@/components/chat/ChatWidget';

export default function Home() {
  const { view, dashboardTab, adminTab, locale } = useAppStore();
  const isRtl = locale === 'ar';

  const renderDashboardContent = () => {
    switch (dashboardTab) {
      case 'customers': return <Customers />;
      case 'income': return <Income />;
      case 'expenses': return <Expenses />;
      case 'invoices': return <Invoices />;
      case 'bookings': return <Bookings />;
      case 'work-orders': return <WorkOrders />;
      case 'certificates': return <Certificates />;
      case 'reports': return <Reports />;
      case 'settings': return <Settings />;
      default: return <Overview />;
    }
  };

  const renderAdminContent = () => {
    switch (adminTab) {
      case 'users': return <AdminUsers />;
      case 'companies': return <AdminCompanies />;
      case 'subscriptions': return <AdminSubscriptions />;
      case 'chats': return <AdminChats />;
      case 'logs': return <AdminLogs />;
      case 'settings': return <AdminSettings />;
      default: return <AdminOverview />;
    }
  };

  return (
    <div className={isRtl ? 'rtl' : ''} dir={isRtl ? 'rtl' : 'ltr'}>
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <LandingPage />
          </motion.div>
        )}
        {view === 'login' && (
          <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <LoginForm />
          </motion.div>
        )}
        {view === 'admin-login' && (
          <motion.div key="admin-login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <AdminLoginForm />
          </motion.div>
        )}
        {view === 'register' && (
          <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <RegisterForm />
          </motion.div>
        )}
        {view === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-screen">
            <DashboardLayout>
              <AnimatePresence mode="wait">
                <motion.div key={dashboardTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                  {renderDashboardContent()}
                </motion.div>
              </AnimatePresence>
            </DashboardLayout>
          </motion.div>
        )}
        {view === 'admin' && (
          <motion.div key="admin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-screen">
            <AdminLayout>
              <AnimatePresence mode="wait">
                <motion.div key={adminTab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }}>
                  {renderAdminContent()}
                </motion.div>
              </AnimatePresence>
            </AdminLayout>
          </motion.div>
        )}
      </AnimatePresence>
      <ChatWidget />
    </div>
  );
}
