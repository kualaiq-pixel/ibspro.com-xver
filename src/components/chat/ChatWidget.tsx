'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Bot,
  Check,
  CheckCheck,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

interface ChatMsg {
  id: string;
  userId: string;
  content: string;
  isAdmin: boolean;
  isRead: boolean;
  createdAt: string;
}

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return (
    date.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
}

const POLL_INTERVAL = 3000; // Poll every 3 seconds

export default function ChatWidget() {
  const { user, isAuthenticated, chatOpen, setChatOpen, unreadMessages, setUnreadMessages } =
    useAppStore();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(true); // Always "connected" with REST API
  const [loading, setLoading] = useState(true);
  const [lastId, setLastId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch messages via REST API
  const fetchMessages = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const url = lastId ? `/api/chat?lastId=${lastId}` : '/api/chat';
      const res = await fetch(url);
      if (!res.ok) return;

      const data = await res.json();

      if (lastId) {
        // Polling mode: append new messages
        if (data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMsgs = data.messages.filter((m: ChatMsg) => !existingIds.has(m.id));
            return [...prev, ...newMsgs];
          });

          // Check for new admin messages for unread count
          const adminMsgs = data.messages.filter((m: ChatMsg) => m.isAdmin);
          if (adminMsgs.length > 0 && !chatOpen) {
            setUnreadMessages((prev: number) => prev + adminMsgs.length);
          }

          // Update last known ID
          const latest = data.messages[data.messages.length - 1];
          if (latest) setLastId(latest.id);
        }
      } else {
        // Initial load
        setMessages(data.messages || []);
        setUnreadMessages(data.unreadCount || 0);
        if (data.messages && data.messages.length > 0) {
          setLastId(data.messages[data.messages.length - 1].id);
        }
        setLoading(false);
      }
    } catch (err) {
      console.error('[ChatWidget] Fetch error:', err);
      if (!lastId) setLoading(false);
    }
  }, [isAuthenticated, lastId, chatOpen, setUnreadMessages]);

  // Initial load + polling
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Initial fetch
    fetchMessages();

    // Start polling
    pollIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, POLL_INTERVAL);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, fetchMessages]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mark messages as read when chat opens
  useEffect(() => {
    if (chatOpen && isAuthenticated) {
      setUnreadMessages(0);
      fetch('/api/chat', { method: 'PATCH' }).catch(() => {});
    }
  }, [chatOpen, isAuthenticated, setUnreadMessages]);

  // Focus input when chat opens
  useEffect(() => {
    if (chatOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [chatOpen]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !isAuthenticated) return;

    setSending(true);
    const content = input.trim();
    setInput('');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
          setLastId(data.message.id);
          scrollToBottom();
        }
      }
    } catch (err) {
      console.error('[ChatWidget] Send error:', err);
      setInput(content); // Restore input on error
    } finally {
      setSending(false);
    }
  }, [input, isAuthenticated, scrollToBottom]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Chat Panel */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-96 h-[500px] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/20 border bg-white dark:bg-slate-900 dark:border-slate-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                  <MessageCircle className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Live Chat Support</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="size-2 rounded-full bg-green-300 animate-pulse" />
                    <span className="text-[11px] text-white/80">Online</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setChatOpen(false)}
                className="flex size-8 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-slate-950">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="size-6 text-emerald-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 mb-3">
                    <Bot className="size-7 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium">Welcome to Support</p>
                  <p className="text-xs mt-1 text-center max-w-[240px]">
                    Send us a message and we&apos;ll get back to you as soon as possible.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = !msg.isAdmin;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className={cn('flex gap-2 max-w-[85%]', isMine ? 'ml-auto flex-row-reverse' : 'mr-auto')}
                    >
                      {/* Avatar */}
                      {!isMine && (
                        <div className="flex size-8 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40 shrink-0 mt-auto">
                          <Bot className="size-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                      )}

                      <div className={cn('flex flex-col', isMine ? 'items-end' : 'items-start')}>
                        {/* Bubble */}
                        <div
                          className={cn(
                            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed max-w-full break-words',
                            isMine
                              ? 'bg-emerald-600 text-white rounded-br-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm rounded-bl-sm border border-slate-200 dark:border-slate-700'
                          )}
                        >
                          {msg.content}
                        </div>

                        {/* Meta: time + read status */}
                        <div className={cn('flex items-center gap-1.5 mt-1 px-1', isMine ? 'flex-row-reverse' : '')}>
                          <span className="text-[10px] text-muted-foreground">
                            {formatMessageTime(msg.createdAt)}
                          </span>
                          {isMine && (
                            msg.isRead ? (
                              <CheckCheck className="size-3 text-emerald-500" />
                            ) : (
                              <Check className="size-3 text-muted-foreground" />
                            )
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t bg-white dark:bg-slate-900 p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={sending}
                  className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 placeholder:text-muted-foreground disabled:opacity-50 transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className={cn(
                    'flex size-10 items-center justify-center rounded-xl transition-all duration-200 shrink-0',
                    input.trim()
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-muted-foreground'
                  )}
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      {!chatOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setChatOpen(true)}
          className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 transition-shadow duration-200"
        >
          <MessageCircle className="size-6" />
          {/* Unread Badge */}
          {unreadMessages > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-900"
            >
              {unreadMessages > 9 ? '9+' : unreadMessages}
            </motion.span>
          )}
        </motion.button>
      )}
    </div>
  );
}
