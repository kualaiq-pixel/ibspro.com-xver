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

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = await db.systemSettings.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    return NextResponse.json({
      appName: settingsMap['app_name'] || 'IBS Pro',
      supportEmail: settingsMap['support_email'] || 'support@ibspro.com',
      maintenanceMode: settingsMap['maintenance_mode'] === 'true',
      emailNotifications: settingsMap['email_notifications'] !== 'false',
      pushNotifications: settingsMap['push_notifications'] !== 'false',
      backupEnabled: settingsMap['backup_enabled'] !== 'false',
      backupFrequency: settingsMap['backup_frequency'] || 'daily',
      maxUsersPerCompany: parseInt(settingsMap['max_users_per_company'] || '10'),
      defaultTrialDays: parseInt(settingsMap['default_trial_days'] || '14'),
    });
  } catch (error) {
    console.error('Admin settings error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const entries = Object.entries(body);

    for (const [key, value] of entries) {
      const dbKey = key
        .replace(/([A-Z])/g, '_$1')
        .toLowerCase();
      await db.systemSettings.upsert({
        where: { key: dbKey },
        update: { value: String(value) },
        create: { key: dbKey, value: String(value) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
