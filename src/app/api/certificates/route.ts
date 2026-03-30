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
        { certificateNo: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const certificates = await db.certificate.findMany({
      where,
      include: { customer: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Compute stats
    const allCerts = await db.certificate.findMany({ where: { companyId } });
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);

    const total = allCerts.length;
    const active = allCerts.filter((c) => c.status === 'active' && c.expiryDate && c.expiryDate > thirtyDaysFromNow).length;
    const expiringSoon = allCerts.filter((c) => c.status === 'active' && c.expiryDate && c.expiryDate <= thirtyDaysFromNow && c.expiryDate > now).length;
    const expired = allCerts.filter((c) => c.status === 'expired' || (c.expiryDate && c.expiryDate <= now)).length;

    return NextResponse.json({
      certificates,
      stats: { total, active, expiringSoon, expired },
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, customerId, title, certificateNo, issueDate, expiryDate, status, description } = body;

    if (!companyId || !title || !certificateNo) {
      return NextResponse.json({ error: 'companyId, title, and certificateNo are required' }, { status: 400 });
    }

    const certificate = await db.certificate.create({
      data: {
        companyId,
        customerId: customerId || null,
        title,
        certificateNo,
        issueDate: new Date(issueDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: status || 'active',
        description: description || null,
      },
      include: { customer: { select: { id: true, name: true } } },
    });

    return NextResponse.json(certificate, { status: 201 });
  } catch (error) {
    console.error('Error creating certificate:', error);
    return NextResponse.json({ error: 'Failed to create certificate' }, { status: 500 });
  }
}
