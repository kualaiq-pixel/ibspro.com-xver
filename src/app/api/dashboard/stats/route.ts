import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
    }

    // Total income
    const totalIncomeResult = await db.income.aggregate({
      _sum: { amount: true },
      where: { companyId },
    });
    const totalIncome = totalIncomeResult._sum.amount ?? 0;

    // Total expenses
    const totalExpenseResult = await db.expense.aggregate({
      _sum: { amount: true },
      where: { companyId },
    });
    const totalExpenses = totalExpenseResult._sum.amount ?? 0;

    // Pending invoices count
    const pendingInvoicesCount = await db.invoice.count({
      where: {
        companyId,
        status: { in: ['draft', 'sent'] },
      },
    });

    // Active bookings count
    const activeBookingsCount = await db.booking.count({
      where: {
        companyId,
        status: { in: ['pending', 'confirmed', 'in_progress'] },
      },
    });

    // Open work orders count
    const openWorkOrdersCount = await db.workOrder.count({
      where: {
        companyId,
        status: { in: ['open', 'in_progress'] },
      },
    });

    // Monthly income/expense data for the last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

      const monthIncome = await db.income.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          date: { gte: monthStart, lte: monthEnd },
        },
      });

      const monthExpense = await db.expense.aggregate({
        _sum: { amount: true },
        where: {
          companyId,
          date: { gte: monthStart, lte: monthEnd },
        },
      });

      monthlyData.push({
        month: monthStart.toLocaleString('en', { month: 'short', year: '2-digit' }),
        income: monthIncome._sum.amount ?? 0,
        expenses: monthExpense._sum.amount ?? 0,
      });
    }

    // Recent activity logs (last 5)
    const recentActivity = await db.activityLog.findMany({
      where: { userId: { in: (await db.companyUser.findMany({ where: { companyId }, select: { userId: true } })).map(cu => cu.userId) } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { user: { select: { name: true, avatar: true } } },
    });

    // Upcoming bookings
    const upcomingBookings = await db.booking.findMany({
      where: {
        companyId,
        startDate: { gte: now },
        status: { in: ['pending', 'confirmed', 'in_progress'] },
      },
      orderBy: { startDate: 'asc' },
      take: 5,
      include: { customer: { select: { name: true } } },
    });

    // Due invoices (not paid, due date approaching within 30 days)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const dueInvoices = await db.invoice.findMany({
      where: {
        companyId,
        status: { in: ['draft', 'sent'] },
        dueDate: { lte: thirtyDaysFromNow, gte: now },
      },
      orderBy: { dueDate: 'asc' },
      take: 5,
      include: { customer: { select: { name: true } } },
    });

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      pendingInvoicesCount,
      activeBookingsCount,
      openWorkOrdersCount,
      monthlyData,
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        action: log.action,
        details: log.details,
        createdAt: log.createdAt,
        userName: log.user.name,
        userAvatar: log.user.avatar,
      })),
      upcomingBookings: upcomingBookings.map(b => ({
        id: b.id,
        title: b.title,
        startDate: b.startDate,
        endDate: b.endDate,
        status: b.status,
        location: b.location,
        customerName: b.customer.name,
      })),
      dueInvoices: dueInvoices.map(inv => ({
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        total: inv.total,
        dueDate: inv.dueDate,
        status: inv.status,
        customerName: inv.customer.name,
      })),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
