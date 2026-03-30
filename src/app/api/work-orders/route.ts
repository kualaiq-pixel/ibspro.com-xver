import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { companyId };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (priority && priority !== 'all') {
      where.priority = priority;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const workOrders = await db.workOrder.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Compute stats across all work orders for the company
    const allOrders = await db.workOrder.findMany({ where: { companyId } });
    const total = allOrders.length;
    const open = allOrders.filter((o) => o.status === 'open').length;
    const inProgress = allOrders.filter((o) => o.status === 'in_progress').length;
    const completed = allOrders.filter((o) => o.status === 'completed').length;

    return NextResponse.json({
      workOrders,
      stats: { total, open, inProgress, completed },
    });
  } catch (error) {
    console.error('Error fetching work orders:', error);
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, customerId, title, description, priority, status, assignedTo, dueDate } = body;

    if (!companyId || !title) {
      return NextResponse.json({ error: 'companyId and title are required' }, { status: 400 });
    }

    const workOrder = await db.workOrder.create({
      data: {
        companyId,
        customerId: customerId || null,
        title,
        description: description || null,
        priority: priority || 'medium',
        status: status || 'open',
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error) {
    console.error('Error creating work order:', error);
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 });
  }
}
