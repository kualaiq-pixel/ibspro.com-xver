import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { customer: { select: { id: true, name: true, email: true, phone: true, address: true, city: true, country: true } } },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { customerId, status, issueDate, dueDate, items, taxRate, notes } = body;

    // Parse items and compute totals
    const lineItems = items ? (Array.isArray(items) ? items : []) : undefined;
    let subtotal: number | undefined;
    let taxAmount: number | undefined;
    let total: number | undefined;
    const rate = typeof taxRate === 'number' ? taxRate : undefined;

    if (lineItems) {
      subtotal = lineItems.reduce(
        (sum: number, item: { quantity: number; unitPrice: number }) =>
          sum + (item.quantity || 0) * (item.unitPrice || 0),
        0
      );
      taxAmount = subtotal * ((rate ?? 0) / 100);
      total = subtotal + taxAmount;
    }

    const updateData: Record<string, unknown> = {};
    if (customerId) updateData.customerId = customerId;
    if (status) updateData.status = status;
    if (issueDate) updateData.issueDate = new Date(issueDate);
    if (dueDate) updateData.dueDate = new Date(dueDate);
    if (lineItems) updateData.items = JSON.stringify(lineItems);
    if (rate !== undefined) updateData.taxRate = rate;
    if (subtotal !== undefined) updateData.subtotal = subtotal;
    if (taxAmount !== undefined) updateData.taxAmount = taxAmount;
    if (total !== undefined) updateData.total = total;
    if (notes !== undefined) updateData.notes = notes;

    const invoice = await db.invoice.update({
      where: { id },
      data: updateData,
      include: { customer: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
  }
}
