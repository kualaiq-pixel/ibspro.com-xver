import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const search = searchParams.get('search');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { companyId };

    if (search) {
      where.OR = [
        { description: { contains: search } },
        { category: { contains: search } },
        { vendor: { contains: search } },
        { referenceNo: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    const expenses = await db.expense.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const totalExpenses = await db.expense.aggregate({
      where: { companyId },
      _sum: { amount: true },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthExpenses = await db.expense.aggregate({
      where: {
        companyId,
        date: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    const count = await db.expense.count({ where: { companyId } });
    const averageExpense = count > 0 ? (totalExpenses._sum.amount ?? 0) / count : 0;

    return NextResponse.json({
      expenses,
      total: totalExpenses._sum.amount ?? 0,
      thisMonth: thisMonthExpenses._sum.amount ?? 0,
      average: averageExpense,
      count,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, category, amount, description, date, vendor, referenceNo } = body;

    if (!companyId || !amount || !date) {
      return NextResponse.json(
        { error: 'companyId, amount, and date are required' },
        { status: 400 }
      );
    }

    const expense = await db.expense.create({
      data: {
        companyId,
        category: category || null,
        amount: parseFloat(amount),
        description: description || null,
        date: new Date(date),
        vendor: vendor || null,
        referenceNo: referenceNo || null,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
