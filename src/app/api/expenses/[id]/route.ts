import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { category, amount, description, date, vendor, referenceNo } = body;

    const expense = await db.expense.update({
      where: { id },
      data: {
        ...(category !== undefined && { category: category || null }),
        ...(amount !== undefined && { amount: parseFloat(amount) }),
        ...(description !== undefined && { description: description || null }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(vendor !== undefined && { vendor: vendor || null }),
        ...(referenceNo !== undefined && { referenceNo: referenceNo || null }),
      },
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error('Error updating expense:', error);
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.expense.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting expense:', error);
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
