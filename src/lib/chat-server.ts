import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let _io: Server | null = null;
let _serverCleanup: (() => void) | null = null;

/**
 * Initialize Socket.io on an existing Next.js dev server instance.
 * This runs at module scope so the singleton persists across hot reloads.
 * Falls back to polling transport for maximum gateway compatibility.
 */
export function initChatSocket(nextServer: HTTPServer): Server {
  if (_io) return _io;

  _io = new Server(nextServer, {
    cors: { origin: '*' },
    pingInterval: 10000,
    pingTimeout: 5000,
    path: '/',  // Serve on root path so gateway routing works
    addTrailingSlash: false,
  });

  const { db } = require('@/lib/db') as typeof import('@/lib/db');

  _io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId as string | undefined;
    if (!userId) { socket.disconnect(); return; }

    console.log(`[Chat] Connected: ${userId}`);
    socket.join(userId);

    socket.on('join', async (data: { userId?: string }) => {
      const uid = data?.userId || userId;
      socket.join(uid);
      try {
        const row = await db.chatMessage.count({ where: { userId: uid, isAdmin: true, isRead: false } });
        socket.emit('chat:unread', { count: row });
      } catch {}
    });

    socket.on('chat:message', async (data: { content: string }) => {
      if (!data?.content?.trim()) return;
      try {
        const msg = await db.chatMessage.create({
          data: {
            id: `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`,
            userId,
            content: data.content.trim(),
            isAdmin: false,
            isRead: false,
          },
        });
        _io!.to(userId).emit('chat:message', msg);
      } catch (err) { console.error('[Chat] send error:', err); }
    });

    socket.on('chat:history', async () => {
      try {
        const msgs = await db.chatMessage.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          take: 50,
        });
        socket.emit('chat:history', { messages: msgs });
      } catch (err) { console.error('[Chat] history error:', err); }
    });

    socket.on('chat:markRead', async () => {
      try {
        await db.chatMessage.updateMany({
          where: { userId, isAdmin: true, isRead: false },
          data: { isRead: true },
        });
      } catch {}
      socket.emit('chat:unread', { count: 0 });
    });

    socket.on('admin:reply', async (data: { userId: string; content: string }) => {
      if (!data?.userId || !data?.content?.trim()) return;
      try {
        const msg = await db.chatMessage.create({
          data: {
            id: `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`,
            userId: data.userId,
            content: data.content.trim(),
            isAdmin: true,
            isRead: true,
          },
        });
        _io!.to(data.userId).emit('chat:message', msg);
      } catch (err) { console.error('[Chat] admin error:', err); }
    });

    socket.on('admin:getConversations', async () => {
      try {
        // Get last message per user
        const messages = await db.chatMessage.findMany({
          orderBy: { createdAt: 'desc' },
          distinct: ['userId'],
        });
        const convos = await Promise.all(messages.map(async (m) => {
          const user = await db.user.findUnique({ where: { id: m.userId }, select: { name: true, email: true } });
          const total = await db.chatMessage.count({ where: { userId: m.userId } });
          return { userId: m.userId, userName: user?.name, userEmail: user?.email, lastMessage: m.content, lastMessageAt: m.createdAt, totalMessages: total };
        }));
        socket.emit('admin:conversations', { conversations: convos });
      } catch (err) { console.error('[Chat] conv error:', err); }
    });

    socket.on('admin:getMessages', async (data: { userId: string }) => {
      if (!data?.userId) return;
      try {
        const msgs = await db.chatMessage.findMany({
          where: { userId: data.userId },
          orderBy: { createdAt: 'asc' },
        });
        socket.emit('admin:messages', { userId: data.userId, messages: msgs });
      } catch (err) { console.error('[Chat] admin msgs error:', err); }
    });

    socket.on('disconnect', () => {});
  });

  console.log('[Chat] Socket.io initialized on main server');
  return _io;
}

export function getChatIO(): Server | null {
  return _io;
}
