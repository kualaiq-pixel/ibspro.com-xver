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
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (role) where.role = role;
    if (status === 'active') where.isActive = true;
    if (status === 'inactive') where.isActive = false;

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          avatar: true,
          phone: true,
          language: true,
          createdAt: true,
          updatedAt: true,
          companyUsers: {
            select: { company: { select: { id: true, name: true } }, role: true },
          },
        },
      }),
      db.user.count({ where }),
    ]);

    const enrichedUsers = users.map((u) => ({
      ...u,
      company: u.companyUsers[0]?.company || null,
      companyRole: u.companyUsers[0]?.role || null,
    }));

    return NextResponse.json({
      users: enrichedUsers,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { userId, name, email, role, isActive } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Admin update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
