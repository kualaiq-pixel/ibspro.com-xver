import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { startOfMonth, subMonths, format, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const fromStr = searchParams.get('from');
    const toStr = searchParams.get('to');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const now = new Date();
    const from = fromStr ? parseISO(fromStr) : subMonths(now, 12);
    const to = toStr ? parseISO(toStr) : now;

    // ── Income by Category ──
    const incomeRecords = await db.income.findMany({
      where: { companyId, date: { gte: from, lte: to } },
    });
    const incomeByCategory: Record<string, number> = {};
    let totalIncome = 0;
    for (const r of incomeRecords) {
      const cat = r.category || 'Other';
      incomeByCategory[cat] = (incomeByCategory[cat] || 0) + r.amount;
      totalIncome += r.amount;
    }

    // ── Expense by Category ──
    const expenseRecords = await db.expense.findMany({
      where: { companyId, date: { gte: from, lte: to } },
    });
    const expenseByCategory: Record<string, number> = {};
    let totalExpenses = 0;
    for (const r of expenseRecords) {
      const cat = r.category || 'Other';
      expenseByCategory[cat] = (expenseByCategory[cat] || 0) + r.amount;
      totalExpenses += r.amount;
    }

    // ── Monthly Income & Expenses (last 12 months) ──
    const monthlyIncome: { month: string; income: number; expenses: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = startOfMonth(subMonths(now, i - 1));
      const label = format(monthStart, 'MMM yyyy');

      const monthIncomes = incomeRecords.filter((r) => {
        const d = new Date(r.date);
        return d >= monthStart && d < monthEnd;
      });
      const monthExpenses = expenseRecords.filter((r) => {
        const d = new Date(r.date);
        return d >= monthStart && d < monthEnd;
      });

      monthlyIncome.push({
        month: label,
        income: monthIncomes.reduce((s, r) => s + r.amount, 0),
        expenses: monthExpenses.reduce((s, r) => s + r.amount, 0),
      });
    }

    // ── Top Income Sources ──
    const topIncomeSources = Object.entries(incomeByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // ── Top Vendors ──
    const vendorMap: Record<string, number> = {};
    for (const r of expenseRecords) {
      const v = r.vendor || 'Unknown';
      vendorMap[v] = (vendorMap[v] || 0) + r.amount;
    }
    const topVendors = Object.entries(vendorMap)
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // ── Profit & Loss Data ──
    const profitLossData = monthlyIncome.map((m) => ({
      ...m,
      netProfit: m.income - m.expenses,
    }));

    // ── Top Customers ──
    const invoices = await db.invoice.findMany({
      where: { companyId },
      include: { customer: { select: { name: true, email: true } } },
    });

    const customerRevenueMap: Record<string, { name: string; email: string | null; total: number; invoiceCount: number }> = {};
    for (const inv of invoices) {
      const key = inv.customerId;
      if (!customerRevenueMap[key]) {
        customerRevenueMap[key] = {
          name: inv.customer.name,
          email: inv.customer.email,
          total: 0,
          invoiceCount: 0,
        };
      }
      customerRevenueMap[key].total += inv.total;
      customerRevenueMap[key].invoiceCount++;
    }
    const topCustomers = Object.values(customerRevenueMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // ── Customer Count Over Time ──
    const customers = await db.customer.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });
    const customerCountOverTime = monthlyIncome.map((m) => {
      const monthStart = startOfMonth(subMonths(now, 11 - monthlyIncome.indexOf(m)));
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      const count = customers.filter((c) => {
        const d = new Date(c.createdAt);
        return d >= monthStart && d < monthEnd;
      }).length;
      return { month: m.month, newCustomers: count };
    });

    // Total customers
    const totalCustomers = customers.length;

    // New vs Returning
    const sixMonthsAgo = subMonths(now, 6);
    const newCustomerCount = customers.filter((c) => new Date(c.createdAt) >= sixMonthsAgo).length;
    const returningCustomerCount = totalCustomers - newCustomerCount;

    // ── Invoice Status Distribution ──
    const invoiceStatusMap: Record<string, number> = {};
    for (const inv of invoices) {
      invoiceStatusMap[inv.status] = (invoiceStatusMap[inv.status] || 0) + 1;
    }
    const invoiceStatusDistribution = Object.entries(invoiceStatusMap)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Paid vs Unpaid amounts
    const paidAmount = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.total, 0);
    const unpaidAmount = invoices.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + i.total, 0);

    // Overdue invoices
    const overdueInvoices = invoices
      .filter((i) => i.status === 'overdue')
      .map((i) => ({
        id: i.id,
        invoiceNo: i.invoiceNo,
        customerName: i.customer.name,
        total: i.total,
        dueDate: i.dueDate.toISOString(),
      }))
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

    // Average payment time (days between issueDate and updatedAt for paid invoices)
    const paidInvoices = invoices.filter((i) => i.status === 'paid');
    let avgPaymentDays = 0;
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((s, i) => {
        const diff = new Date(i.updatedAt).getTime() - new Date(i.issueDate).getTime();
        return s + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgPaymentDays = Math.round(totalDays / paidInvoices.length);
    }

    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 10000) / 100 : 0;

    return NextResponse.json({
      totalIncome,
      totalExpenses,
      netProfit,
      profitMargin,
      incomeByCategory,
      expenseByCategory,
      monthlyIncome,
      topIncomeSources,
      topVendors,
      profitLossData,
      topCustomers,
      customerCountOverTime,
      totalCustomers,
      newCustomerCount,
      returningCustomerCount,
      invoiceStatusDistribution,
      paidAmount,
      unpaidAmount,
      overdueInvoices,
      avgPaymentDays,
      totalInvoices: invoices.length,
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
