import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const r: Record<string, string> = {};
  r.db_url_preview = (process.env.DATABASE_URL || 'MISSING').substring(0, 60);
  try {
    await db.$connect();
    const count = await db.user.count();
    r.status = 'OK';
    r.users = String(count);
    await db.$disconnect();
  } catch (e: any) {
    r.status = 'ERROR';
    r.error = String(e.message || e);
  }
  return NextResponse.json(r);
}
