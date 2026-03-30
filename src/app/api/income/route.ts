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
        { referenceNo: { contains: search } },
      ];
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) (where.date as Record<string, unknown>).gte = new Date(startDate);
      if (endDate) (where.date as Record<string, unknown>).lte = new Date(endDate);
    }

    const incomes = await db.income.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    const totalIncome = await db.income.aggregate({
      where: { companyId },
      _sum: { amount: true },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthIncome = await db.income.aggregate({
      where: {
        companyId,
        date: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    const count = await db.income.count({ where: { companyId } });
    const averageIncome = count > 0 ? (totalIncome._sum.amount ?? 0) / count : 0;

    return NextResponse.json({
      incomes,
      total: totalIncome._sum.amount ?? 0,
      thisMonth: thisMonthIncome._sum.amount ?? 0,
      average: averageIncome,
      count,
    });
  } catch (error) {
    console.error('Error fetching incomes:', error);
    return NextResponse.json({ error: 'Failed to fetch incomes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, customerId, category, amount, description, date, referenceNo } = body;

    if (!companyId || !amount || !date) {
      return NextResponse.json(
        { error: 'companyId, amount, and date are required' },
        { status: 400 }
      );
    }

    const income = await db.income.create({
      data: {
        companyId,
        customerId: customerId || null,
        category: category || null,
        amount: parseFloat(amount),
        description: description || null,
        date: new Date(date),
        referenceNo: referenceNo || null,
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ income }, { status: 201 });
  } catch (error) {
    console.error('Error creating income:', error);
    return NextResponse.json({ error: 'Failed to create income' }, { status: 500 });
  }
}
