import { Server } from 'socket.io';
import { Database } from 'bun:sqlite';
import path from 'path';

const DB_PATH = path.resolve(import.meta.dir, '../../db/custom.db');

const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isAdmin" INTEGER NOT NULL DEFAULT 0,
    "isRead" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
  )
`);
try { db.exec(`CREATE INDEX IF NOT EXISTS "ChatMessage_userId_idx" ON "ChatMessage"("userId")`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt")`); } catch {}

function generateId(): string {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

const PORT = 3003;

// Use Bun.serve — this keeps the process alive properly
const server = Bun.serve({
  port: PORT,
  hostname: '0.0.0.0',
  fetch(req, server) {
    // Upgrade WebSocket connections for socket.io
    if (req.headers.get('upgrade') === 'websocket') {
      // Let socket.io handle it via the underlying raw server
      return undefined; 
    }
    // Health check
    return new Response('IBS Pro Chat Service OK', {
      headers: { 'Content-Type': 'text/plain' },
    });
  },
  websocket: undefined,
});

// Now attach socket.io to Bun's underlying node-like server
// @ts-expect-error - Bun's internal server has the needed interface
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

io.on('connection', (socket) => {
  const userId = socket.handshake.auth?.userId as string | undefined;

  if (!userId) {
    socket.disconnect();
    return;
  }

  console.log(`[Chat] Connected: ${userId}`);
  socket.join(userId);

  socket.on('join', (data: { userId?: string }) => {
    const uid = data?.userId || userId;
    socket.join(uid);
    try {
      const row = db.query(`SELECT COUNT(*) as count FROM ChatMessage WHERE userId = ? AND isAdmin = 1 AND isRead = 0`).get(uid) as { count: number } | null;
      socket.emit('chat:unread', { count: row?.count || 0 });
    } catch {}
  });

  socket.on('chat:message', (data: { content: string }) => {
    try {
      if (!data?.content?.trim()) return;
      const id = generateId();
      const now = new Date().toISOString();
      db.query(`INSERT INTO ChatMessage (id, userId, content, isAdmin, isRead, createdAt) VALUES (?, ?, ?, 0, 0, ?)`).run(id, userId, data.content.trim(), now);
      io.to(userId).emit('chat:message', { id, userId, content: data.content.trim(), isAdmin: false, isRead: false, createdAt: now });
    } catch (err) { console.error('[Chat] send:', err); }
  });

  socket.on('chat:history', () => {
    try {
      const rows = db.query(`SELECT id, userId, content, isAdmin, isRead, createdAt FROM ChatMessage WHERE userId = ? ORDER BY createdAt ASC LIMIT 50`).all(userId) as Array<any>;
      socket.emit('chat:history', { messages: rows.map(m => ({ ...m, isAdmin: Boolean(m.isAdmin), isRead: Boolean(m.isRead) })) });
    } catch (err) { console.error('[Chat] history:', err); }
  });

  socket.on('chat:markRead', () => {
    try { db.query(`UPDATE ChatMessage SET isRead = 1 WHERE userId = ? AND isAdmin = 1 AND isRead = 0`).run(userId); } catch {}
    socket.emit('chat:unread', { count: 0 });
  });

  socket.on('admin:reply', (data: { userId: string; content: string }) => {
    try {
      if (!data?.userId || !data?.content?.trim()) return;
      const id = generateId();
      const now = new Date().toISOString();
      db.query(`INSERT INTO ChatMessage (id, userId, content, isAdmin, isRead, createdAt) VALUES (?, ?, ?, 1, 1, ?)`).run(id, data.userId, data.content.trim(), now);
      io.to(data.userId).emit('chat:message', { id, userId: data.userId, content: data.content.trim(), isAdmin: true, isRead: true, createdAt: now });
    } catch (err) { console.error('[Chat] admin:', err); }
  });

  socket.on('admin:getConversations', () => {
    try {
      const rows = db.query(`SELECT cm.userId, u.name as userName, cm.content as lastMessage, cm.createdAt as lastMessageAt, (SELECT COUNT(*) FROM ChatMessage cm2 WHERE cm2.userId = cm.userId) as totalMessages FROM ChatMessage cm INNER JOIN User u ON u.id = cm.userId WHERE cm.createdAt = (SELECT MAX(cm4.createdAt) FROM ChatMessage cm4 WHERE cm4.userId = cm.userId) ORDER BY cm.createdAt DESC`).all() as Array<any>;
      socket.emit('admin:conversations', { conversations: rows });
    } catch (err) { console.error('[Chat] conv:', err); }
  });

  socket.on('admin:getMessages', (data: { userId: string }) => {
    try {
      if (!data?.userId) return;
      const rows = db.query(`SELECT id, userId, content, isAdmin, isRead, createdAt FROM ChatMessage WHERE userId = ? ORDER BY createdAt ASC`).all(data.userId) as Array<any>;
      socket.emit('admin:messages', { userId: data.userId, messages: rows.map(m => ({ ...m, isAdmin: Boolean(m.isAdmin), isRead: Boolean(m.isRead) })) });
    } catch (err) { console.error('[Chat] admin msgs:', err); }
  });

  socket.on('disconnect', () => {});
});

console.log(`[Chat Service] Running on http://0.0.0.0:${PORT}`);
