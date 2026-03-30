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
        { title: { contains: search } },
        { customer: { name: { contains: search } } },
        { location: { contains: search } },
      ];
    }

    const bookings = await db.booking.findMany({
      where,
      include: { customer: { select: { id: true, name: true, email: true } } },
      orderBy: { startDate: 'desc' },
    });

    // Compute stats
    const allBookings = await db.booking.findMany({
      where: { companyId },
    });

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const totalBookings = allBookings.length;
    const thisWeek = allBookings.filter(
      (b) => new Date(b.startDate) >= startOfWeek && new Date(b.startDate) < endOfWeek
    ).length;
    const active = allBookings.filter(
      (b) => b.status === 'pending' || b.status === 'confirmed' || b.status === 'in_progress'
    ).length;
    const completed = allBookings.filter((b) => b.status === 'completed').length;

    return NextResponse.json({
      bookings,
      stats: { totalBookings, thisWeek, active, completed },
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, customerId, title, description, startDate, endDate, status, location, notes } = body;

    if (!companyId || !customerId || !title || !startDate) {
      return NextResponse.json(
        { error: 'companyId, customerId, title, and startDate are required' },
        { status: 400 }
      );
    }

    const booking = await db.booking.create({
      data: {
        companyId,
        customerId,
        title,
        description: description || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        status: status || 'pending',
        location: location || null,
        notes: notes || null,
      },
      include: { customer: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
}
