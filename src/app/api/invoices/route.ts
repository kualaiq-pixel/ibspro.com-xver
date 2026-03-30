import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { companyId };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { invoiceNo: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const invoices = await db.invoice.findMany({
      where,
      include: { customer: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Compute stats
    const allInvoices = await db.invoice.findMany({
      where: { companyId },
    });

    const totalInvoices = allInvoices.length;
    const pendingAmount = allInvoices
      .filter((inv) => inv.status === 'draft' || inv.status === 'sent')
      .reduce((sum, inv) => sum + inv.total, 0);
    const paidAmount = allInvoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);
    const overdueCount = allInvoices.filter((inv) => inv.status === 'overdue').length;

    return NextResponse.json({
      invoices,
      stats: { totalInvoices, pendingAmount, paidAmount, overdueCount },
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, customerId, status, issueDate, dueDate, items, taxRate, notes } = body;

    if (!companyId || !customerId || !issueDate || !dueDate || !items) {
      return NextResponse.json(
        { error: 'companyId, customerId, issueDate, dueDate, and items are required' },
        { status: 400 }
      );
    }

    // Generate sequential invoice number
    const companyInvoices = await db.invoice.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: { invoiceNo: true },
      take: 1,
    });

    let nextNum = 1;
    if (companyInvoices.length > 0) {
      const lastNo = companyInvoices[0].invoiceNo;
      const match = lastNo.match(/INV-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const invoiceNo = `INV-${String(nextNum).padStart(4, '0')}`;

    // Parse items
    const lineItems = Array.isArray(items) ? items : [];
    const subtotal = lineItems.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + (item.quantity || 0) * (item.unitPrice || 0),
      0
    );
    const rate = typeof taxRate === 'number' ? taxRate : 0;
    const taxAmount = subtotal * (rate / 100);
    const total = subtotal + taxAmount;

    const invoice = await db.invoice.create({
      data: {
        companyId,
        customerId,
        invoiceNo,
        status: status || 'draft',
        issueDate: new Date(issueDate),
        dueDate: new Date(dueDate),
        items: JSON.stringify(lineItems),
        subtotal,
        taxRate: rate,
        taxAmount,
        total,
        notes: notes || null,
      },
      include: { customer: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}
