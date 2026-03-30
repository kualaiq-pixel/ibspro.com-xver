import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper: Get authenticated user from session cookie
async function getSessionUser(req: NextRequest) {
  try {
    const cookie = req.headers.get('cookie') || '';
    const sessionMatch = cookie.match(/session=([^;]+)/);
    if (!sessionMatch) return null;

    const token = decodeURIComponent(sessionMatch[1]);
    const session = await db.session.findUnique({
      where: { token },
      include: { user: { select: { id: true, name: true, role: true } } },
    });

    if (!session || session.expiresAt < new Date()) return null;
    return session;
  } catch {
    return null;
  }
}

// GET /api/chat - Get chat messages for current user
// Query params: ?lastId=xxx (for polling new messages since last known message)
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const lastId = searchParams.get('lastId');

    let messages;
    if (lastId) {
      // Poll for new messages since last known ID
      const lastMsg = await db.chatMessage.findUnique({ where: { id: lastId } });
      if (lastMsg) {
        messages = await db.chatMessage.findMany({
          where: {
            userId: session.userId,
            createdAt: { gt: lastMsg.createdAt },
          },
          orderBy: { createdAt: 'asc' },
        });
      } else {
        messages = await db.chatMessage.findMany({
          where: { userId: session.userId },
          orderBy: { createdAt: 'asc' },
          take: 50,
        });
      }
    } else {
      // Get last 50 messages
      messages = await db.chatMessage.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: 'asc' },
        take: 50,
      });
    }

    // Get unread count
    const unreadCount = await db.chatMessage.count({
      where: { userId: session.userId, isAdmin: true, isRead: false },
    });

    return NextResponse.json({ messages, unreadCount });
  } catch (error) {
    console.error('[Chat API GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/chat - Send a new message (user)
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    const message = await db.chatMessage.create({
      data: {
        userId: session.userId,
        content: content.trim(),
        isAdmin: false,
        isRead: false,
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('[Chat API POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/chat - Mark messages as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await db.chatMessage.updateMany({
      where: { userId: session.userId, isAdmin: true, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Chat API PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
