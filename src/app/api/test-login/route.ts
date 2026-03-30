import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const r: Record<string, string> = {};

    r.step1 = `username=${username}, password=${password ? '***' : 'empty'}`;

    const user = await db.user.findFirst({
      where: { username: username?.toLowerCase(), role: 'admin' },
    });
    r.step2 = user ? `Found: ${user.id}` : 'NOT FOUND';
    
    if (!user) { r.result = 'FAIL: user not found'; return NextResponse.json(r); }

    const valid = await bcrypt.compare(password, user.password);
    r.step3 = `password valid: ${valid}`;
    
    if (!valid) { r.result = 'FAIL: wrong password'; return NextResponse.json(r); }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    try {
      const session = await db.session.create({ data: { userId: user.id, token, expiresAt } });
      r.step4 = `session created: ${session.id}`;
    } catch (e: any) {
      r.step4 = `session ERROR: ${String(e.message || e)}`;
    }

    try {
      await db.activityLog.create({ data: { userId: user.id, action: 'admin_login', details: 'Test login' } });
      r.step5 = 'log created OK';
    } catch (e: any) {
      r.step5 = `log ERROR: ${String(e.message || e)}`;
    }

    r.result = 'SUCCESS';
    r.token = token;
    r.user = JSON.stringify({ id: user.id, name: user.name, username: user.username, role: user.role });

    return NextResponse.json(r);
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
