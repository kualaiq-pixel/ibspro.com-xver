import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const usersWithMessages = await db.user.findMany({
      where: {
        chatMessages: { some: {} },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
        chatMessages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: {
        chatMessages: { _count: 'desc' },
      },
    });

    const conversations = usersWithMessages.map((u) => {
      const msgs = u.chatMessages;
      const lastMsg = msgs[msgs.length - 1];
      const unreadCount = msgs.filter((m) => !m.isRead && !m.isAdmin).length;
      return {
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        userAvatar: u.avatar,
        lastMessage: lastMsg?.content || '',
        lastMessageAt: lastMsg?.createdAt?.toISOString() || u.createdAt.toISOString(),
        unreadCount,
        totalMessages: msgs.length,
        messages: msgs.map((m) => ({
          id: m.id,
          content: m.content,
          isAdmin: m.isAdmin,
          isRead: m.isRead,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    });

    conversations.sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Admin chats error:', error);
    return NextResponse.json({ error: 'Failed to load chats' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, content } = body;

    if (!userId || !content) {
      return NextResponse.json({ error: 'User ID and content required' }, { status: 400 });
    }

    const message = await db.chatMessage.create({
      data: {
        userId,
        content,
        isAdmin: true,
        isRead: true,
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Admin send chat error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
