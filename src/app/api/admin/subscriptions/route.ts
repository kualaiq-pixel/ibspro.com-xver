import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function getSession(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return null;
    const token = decodeURIComponent(match[1]);
    const session = await db.session.findUnique({
      where: { token },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!session || session.user.role !== 'admin') return null;
    if (session.expiresAt < new Date()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [subscriptions, totalActive, totalTrial, totalCancelled, totalExpired, monthlyRevenue] = await Promise.all([
      db.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.subscription.count({ where: { status: 'active' } }),
      db.subscription.count({ where: { status: 'trial' } }),
      db.subscription.count({ where: { status: 'cancelled' } }),
      db.subscription.count({ where: { status: 'expired' } }),
      db.subscription.aggregate({
        _sum: { amount: true },
        where: { status: 'active' },
      }),
    ]);

    const churnRate = (totalActive + totalCancelled + totalExpired) > 0
      ? Math.round(((totalCancelled + totalExpired) / (totalActive + totalCancelled + totalExpired)) * 100)
      : 0;

    return NextResponse.json({
      subscriptions,
      stats: {
        totalActive,
        totalTrial,
        totalCancelled,
        totalExpired,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        churnRate,
      },
    });
  } catch (error) {
    console.error('Admin subscriptions error:', error);
    return NextResponse.json({ error: 'Failed to load subscriptions' }, { status: 500 });
  }
}
