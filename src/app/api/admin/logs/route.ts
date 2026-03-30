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
    const search = searchParams.get('search') || '';
    const action = searchParams.get('action') || '';
    const userId = searchParams.get('userId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { action: { contains: search } },
        { details: { contains: search } },
        { user: { name: { contains: search } } },
      ];
    }
    if (action) where.action = action;
    if (userId) where.userId = userId;

    const [logs, total] = await Promise.all([
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      db.activityLog.count({ where }),
    ]);

    return NextResponse.json({
      logs,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    console.error('Admin logs error:', error);
    return NextResponse.json({ error: 'Failed to load logs' }, { status: 500 });
  }
}
