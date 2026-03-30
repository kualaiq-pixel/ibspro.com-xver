import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function getAdminSession(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || '';
    const match = cookie.match(/session=([^;]+)/);
    if (!match) return null;
    const token = decodeURIComponent(match[1]);
    const session = await db.session.findUnique({
      where: { token },
      include: { user: { select: { id: true, name: true, role: true } } },
    });
    if (!session || session.user.role !== 'admin') return null;
    if (session.expiresAt < new Date()) return null;
    return session;
  } catch { return null; }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('userId');

    if (targetUserId) {
      const messages = await db.chatMessage.findMany({
        where: { userId: targetUserId },
        orderBy: { createdAt: 'asc' },
      });
      return NextResponse.json({ messages });
    }

    // Get distinct user IDs that have chat messages, with their latest message
    const userRows = await db.chatMessage.groupBy({
      by: ['userId'],
      _max: { createdAt: true },
      _count: { id: true },
    });

    // Sort by most recent message
    userRows.sort((a, b) => (b._max.createdAt?.getTime() || 0) - (a._max.createdAt?.getTime() || 0));

    const conversations = await Promise.all(
      userRows.map(async (row) => {
        const [user, lastMsg, unreadCount] = await Promise.all([
          db.user.findUnique({ where: { id: row.userId }, select: { name: true, email: true, username: true } }),
          db.chatMessage.findFirst({
            where: { userId: row.userId },
            orderBy: { createdAt: 'desc' },
          }),
          db.chatMessage.count({ where: { userId: row.userId, isAdmin: false, isRead: false } }),
        ]);
        return {
          userId: row.userId,
          userName: user?.name || user?.username || 'Unknown',
          userEmail: user?.email,
          lastMessage: lastMsg?.content || '',
          lastMessageAt: lastMsg?.createdAt || new Date().toISOString(),
          totalMessages: row._count.id,
          unreadCount,
        };
      })
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('[Admin Chat API]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { userId, content } = await req.json();
    if (!userId || !content?.trim()) {
      return NextResponse.json({ error: 'userId and content required' }, { status: 400 });
    }

    const message = await db.chatMessage.create({
      data: { userId, content: content.trim(), isAdmin: true, isRead: true },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('[Admin Chat API POST]', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
