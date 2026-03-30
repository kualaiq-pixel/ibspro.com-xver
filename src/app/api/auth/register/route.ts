import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, username, password, companyName } = body;

    if (!name || !username || !password) {
      return NextResponse.json({ error: 'Name, username, and password are required' }, { status: 400 });
    }

    // Check if username is taken
    const existingUsername = await db.user.findUnique({ where: { username: username.toLowerCase() } });
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Check if email is taken
    if (email) {
      const existingEmail = await db.user.findUnique({ where: { email } });
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = uuidv4();

    // Generate a unique company code (6 chars uppercase)
    const codePrefix = (companyName || 'IBS').replace(/[^A-Z0-9]/gi, '').toUpperCase().substring(0, 3);
    const codeRandom = Math.random().toString(36).substring(2, 6).toUpperCase();
    const companyCode = `${codePrefix}${codeRandom}`;

    // Create user
    const user = await db.user.create({
      data: {
        id: userId,
        email: email || `${username.toLowerCase()}@ibspro.local`,
        username: username.toLowerCase(),
        password: hashedPassword,
        name,
        role: 'user',
      },
    });

    // Create company
    const companyId = uuidv4();
    await db.company.create({
      data: {
        id: companyId,
        name: companyName || `${name}'s Company`,
        companyCode,
      },
    });

    await db.companyUser.create({
      data: { userId, companyId, role: 'owner' },
    });

    // Create session
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.session.create({
      data: { userId: user.id, token, expiresAt },
    });

    // Create subscription (trial)
    await db.subscription.create({
      data: {
        userId: user.id,
        plan: 'monthly',
        status: 'trial',
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        language: user.language as string,
        currency: user.currency,
        companyId,
        companyName: companyName || `${name}'s Company`,
      },
      token,
      companyCode,
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
