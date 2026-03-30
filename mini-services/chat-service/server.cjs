// IBS Pro Chat Service
const http = require('http');
const { Server } = require('socket.io');
const { Database } = require('bun:sqlite');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../../db/custom.db');

const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS "ChatMessage" ("id" TEXT NOT NULL PRIMARY KEY, "userId" TEXT NOT NULL, "content" TEXT NOT NULL, "isAdmin" INTEGER NOT NULL DEFAULT 0, "isRead" INTEGER NOT NULL DEFAULT 0, "createdAt" TEXT NOT NULL DEFAULT (datetime('now')), FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE)`);
try { db.exec(`CREATE INDEX IF NOT EXISTS "ChatMessage_userId_idx" ON "ChatMessage"("userId")`); } catch {}
try { db.exec(`CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt")`); } catch {}

function genId() { return 'c' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9); }

const PORT = 3003;

const srv = http.createServer();
const io = new Server(srv, {
  cors: { origin: '*' },
  pingInterval: 10000,
  pingTimeout: 5000,
  path: '/',
});

io.on('connection', (s) => {
  const uid = s.handshake.auth?.userId;
  if (!uid) { s.disconnect(); return; }
  console.log('[Chat] + ' + uid);
  s.join(uid);
  s.on('join', (d) => { s.join(d?.userId || uid); try { const r = db.query('SELECT COUNT(*) as c FROM ChatMessage WHERE userId=? AND isAdmin=1 AND isRead=0').get(d?.userId || uid); s.emit('chat:unread',{count:r?.c||0}); } catch{} });
  s.on('chat:message', (d) => { if(!d?.content?.trim())return; const id=genId(),now=new Date().toISOString(); db.query('INSERT INTO ChatMessage(id,userId,content,isAdmin,isRead,createdAt) VALUES(?,?,?,?,?)').run(id,uid,d.content.trim(),0,0,now); io.to(uid).emit('chat:message',{id,userId:uid,content:d.content.trim(),isAdmin:false,isRead:false,createdAt:now}); });
  s.on('chat:history', () => { try{const r=db.query('SELECT id,userId,content,isAdmin,isRead,createdAt FROM ChatMessage WHERE userId=? ORDER BY createdAt ASC LIMIT 50').all(uid); s.emit('chat:history',{messages:r.map(m=>({...m,isAdmin:!!m.isAdmin,isRead:!!m.isRead}))});}catch{} });
  s.on('chat:markRead', () => { try{db.query('UPDATE ChatMessage SET isRead=1 WHERE userId=? AND isAdmin=1 AND isRead=0').run(uid);}catch{} s.emit('chat:unread',{count:0}); });
  s.on('admin:reply', (d) => { if(!d?.userId||!d?.content?.trim())return; const id=genId(),now=new Date().toISOString(); db.query('INSERT INTO ChatMessage(id,userId,content,isAdmin,isRead,createdAt) VALUES(?,?,?,?,?)').run(id,d.userId,d.content.trim(),1,1,now); io.to(d.userId).emit('chat:message',{id,userId:d.userId,content:d.content.trim(),isAdmin:true,isRead:true,createdAt:now}); });
  s.on('admin:getConversations', () => { try{const r=db.query('SELECT cm.userId,u.name as userName,cm.content as lastMessage,cm.createdAt as lastMessageAt,(SELECT COUNT(*) FROM ChatMessage cm2 WHERE cm2.userId=cm.userId) as totalMessages FROM ChatMessage cm INNER JOIN User u ON u.id=cm.userId WHERE cm.createdAt=(SELECT MAX(cm4.createdAt) FROM ChatMessage cm4 WHERE cm4.userId=cm.userId) ORDER BY cm.createdAt DESC').all(); s.emit('admin:conversations',{conversations:r});}catch{} });
  s.on('admin:getMessages', (d) => { try{if(!d?.userId)return;const r=db.query('SELECT id,userId,content,isAdmin,isRead,createdAt FROM ChatMessage WHERE userId=? ORDER BY createdAt ASC').all(d.userId); s.emit('admin:messages',{userId:d.userId,messages:r.map(m=>({...m,isAdmin:!!m.isAdmin,isRead:!!m.isRead}))});}catch{} });
  s.on('disconnect', () => {});
});

srv.listen(PORT, '0.0.0.0', () => {
  console.log('[Chat Service] Running on http://0.0.0.0:' + PORT);
});

// Prevent bun from exiting — keep the event loop alive
const timer = setInterval(() => {}, 86400000);

// Prevent the timer from keeping bun from exiting in test mode
if (typeof global.gc !== 'undefined') { timer.unref(); }

process.on('SIGINT', () => { process.exit(0); });
process.on('SIGTERM', () => { process.exit(0); });
