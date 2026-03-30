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

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const companies = await db.company.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        companyUsers: {
          select: { userId: true },
        },
      },
    });

    const enriched = companies.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      address: c.address,
      city: c.city,
      country: c.country,
      postalCode: c.postalCode,
      website: c.website,
      vatNumber: c.vatNumber,
      isActive: c.isActive,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      userCount: c.companyUsers.length,
    }));

    return NextResponse.json({ companies: enriched });
  } catch (error) {
    console.error('Admin companies error:', error);
    return NextResponse.json({ error: 'Failed to load companies' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { companyId, isActive } = body;

    if (!companyId) {
      return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
    }

    const company = await db.company.update({
      where: { id: companyId },
      data: {
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ company });
  } catch (error) {
    console.error('Admin update company error:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}
