import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    // Admin login: find by username where role = 'admin'
    const user = await db.user.findFirst({
      where: {
        username: username.toLowerCase(),
        role: 'admin',
      },
    });

    if (!user || !user.password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account deactivated' }, { status: 403 });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
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
        action: 'admin_login',
        details: 'Admin logged in',
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
      },
      token,
    });
  } catch (error) {
    console.error('Admin login error:', JSON.stringify(error, null, 2));
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 });
  }
}
