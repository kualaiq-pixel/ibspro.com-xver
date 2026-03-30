import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { customerId, category, amount, description, date, referenceNo } = body;

    const income = await db.income.update({
      where: { id },
      data: {
        ...(customerId !== undefined && { customerId: customerId || null }),
        ...(category !== undefined && { category: category || null }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description: description || null }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(referenceNo !== undefined && { referenceNo: referenceNo || null }),
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ income });
  } catch (error) {
    console.error('Error updating income:', error);
    return NextResponse.json({ error: 'Failed to update income' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.income.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting income:', error);
    return NextResponse.json({ error: 'Failed to delete income' }, { status: 500 });
  }
}
