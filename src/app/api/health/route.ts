import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const r: Record<string, string> = {};

  try {
    // Find admin user
    const admin = await db.user.findFirst({
      where: { role: 'admin' },
    });

    if (!admin) {
      r.admin = 'NOT FOUND';
      return NextResponse.json(r);
    }

    r.admin_id = admin.id;
    r.admin_username = admin.username || 'null';
    r.admin_email = admin.email;
    r.admin_role = admin.role;
    r.admin_active = String(admin.isActive);
    r.admin_has_password = admin.password ? 'YES' : 'NO';
    r.admin_password_preview = admin.password ? admin.password.substring(0, 20) + '...' : 'null';

    // Test password verify
    if (admin.password) {
      const match = await bcrypt.compare('586627', admin.password);
      r.password_match = match ? 'YES' : 'NO';

      if (!match) {
        // Try hashing it fresh and compare
        const freshHash = await bcrypt.hash('586627', 12);
        r.fresh_hash_preview = freshHash.substring(0, 20) + '...';
        const freshMatch = await bcrypt.compare('586627', freshHash);
        r.fresh_hash_works = freshMatch ? 'YES' : 'NO';
      }
    }

    // Check sessions table
    const sessionCount = await db.session.count();
    r.sessions_in_db = String(sessionCount);

    // List all users
    const allUsers = await db.user.findMany({
      select: { id: true, username: true, email: true, role: true, isActive: true },
    });
    r.all_users = JSON.stringify(allUsers);

  } catch (e: any) {
    r.error = String(e.message || e);
  }

  return NextResponse.json(r);
}
