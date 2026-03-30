import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password, companyCode } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (!companyCode) {
      return NextResponse.json({ error: 'Company code is required' }, { status: 400 });
    }

    // Find company by code
    const company = await db.company.findUnique({ where: { companyCode: companyCode.toUpperCase() } });
    if (!company) {
      return NextResponse.json({ error: 'Invalid company code' }, { status: 401 });
    }

    if (!company.isActive) {
      return NextResponse.json({ error: 'Company account is deactivated' }, { status: 403 });
    }

    // Find user by username within that company
    const user = await db.user.findFirst({
      where: {
        username: username.toLowerCase(),
        isActive: true,
      },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }

    // Verify user belongs to this company
    const companyUser = await db.companyUser.findFirst({
      where: { userId: user.id, companyId: company.id },
      include: { company: true },
    });

    if (!companyUser) {
      return NextResponse.json({ error: 'User does not belong to this company' }, { status: 403 });
    }

    // Create session
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    // Log activity
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: 'login',
        details: `User logged in to company ${company.name}`,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        language: user.language as string,
        currency: user.currency,
        companyId: companyUser.companyId,
        companyName: companyUser.company.name,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
