'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Send,
  CheckCircle2,
  MessageCircle,
  Loader2,
  Bot,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  content: string;
  isAdmin: boolean;
  isRead: boolean;
  createdAt: string;
}

interface Conversation {
  userId: string;
  userName: string;
  userEmail: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  totalMessages: number;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en', {
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminChats() {
  const { locale } = useAppStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [search, setSearch] = useState('');

  const selectedConv = conversations.find((c) => c.userId === selectedUserId);

  // Fetch conversations list
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/chat');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch chats:', err);
      setLoading(false);
    }
  }, []);

  // Fetch messages for a specific user
  const fetchMessages = useCallback(async (userId: string) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/admin/chat?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    // Auto-refresh conversations every 5 seconds
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  // Fetch messages when a conversation is selected
  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
    }
  }, [selectedUserId, fetchMessages]);

  // Auto-scroll messages
  useEffect(() => {
    if (messages.length > 0) {
      const el = document.getElementById('admin-chat-messages');
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleSelectConv = (conv: Conversation) => {
    setSelectedUserId(conv.userId);
    setMessages([]);
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedUserId) return;
    try {
      setSending(true);
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          content: replyText.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
        }
        setReplyText('');
        toast.success(t('admin.messageSent', locale));
        // Refresh conversations to update last message
        fetchConversations();
      }
    } catch {
      toast.error(t('common.error', locale));
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.userName.toLowerCase().includes(search.toLowerCase()) ||
      (c.userEmail && c.userEmail.toLowerCase().includes(search.toLowerCase())) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0">
      {/* Conversation List */}
      <div className="w-80 border-r bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <div className="p-4 space-y-3">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MessageCircle className="size-5 text-emerald-600" />
            {t('admin.supportChats', locale)}
          </h1>
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground left-3 rtl:left-auto rtl:right-3" />
            <Input
              placeholder={t('admin.searchChats', locale)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rtl:pl-3 rtl:pr-9 h-9"
            />
          </div>
        </div>
        <Separator />
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-muted-foreground text-sm p-4">
              {t('common.noData', locale)}
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => handleSelectConv(conv)}
                  className={cn(
                    'flex items-start gap-3 w-full rounded-lg p-3 text-left transition-colors hover:bg-muted/50',
                    selectedUserId === conv.userId && 'bg-muted'
                  )}
                >
                  <Avatar className="size-10 shrink-0 mt-0.5">
                    <AvatarFallback className="text-xs bg-slate-100 dark:bg-slate-800">
                      {conv.userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{conv.userName}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {formatDate(conv.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0 h-5 min-w-5 shrink-0">
                      {conv.unreadCount}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarFallback className="text-xs bg-slate-100 dark:bg-slate-800">
                    {selectedConv.userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{selectedConv.userName}</p>
                  <p className="text-xs text-muted-foreground">{selectedConv.userEmail || ''}</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.success(t('admin.chatResolved', locale))}
                className="gap-1 text-emerald-600 hover:text-emerald-700"
              >
                <CheckCircle2 className="size-4" />
                {t('admin.resolve', locale)}
              </Button>
            </div>

            {/* Messages */}
            <div id="admin-chat-messages" className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4 max-w-3xl mx-auto">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-6 text-emerald-500 animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    No messages yet
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex gap-3 max-w-[80%]',
                        msg.isAdmin ? 'ml-auto flex-row-reverse' : ''
                      )}
                    >
                      <div
                        className={cn(
                          'flex size-8 items-center justify-center rounded-full shrink-0',
                          msg.isAdmin
                            ? 'bg-emerald-100 dark:bg-emerald-950/40'
                            : 'bg-slate-200 dark:bg-slate-800'
                        )}
                      >
                        {msg.isAdmin ? (
                          <Bot className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            {selectedConv.userName[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <div
                          className={cn(
                            'rounded-2xl px-4 py-2.5 text-sm',
                            msg.isAdmin
                              ? 'bg-emerald-600 text-white rounded-tr-sm'
                              : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm rounded-tl-sm'
                          )}
                        >
                          {msg.content}
                        </div>
                        <p
                          className={cn(
                            'text-[10px] text-muted-foreground mt-1',
                            msg.isAdmin ? 'text-right' : 'text-left'
                          )}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Reply Input */}
            <div className="border-t bg-white dark:bg-slate-900 p-4">
              <div className="flex gap-3 max-w-3xl mx-auto">
                <Input
                  placeholder={t('admin.typeReply', locale)}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  disabled={sending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSendReply}
                  disabled={sending || !replyText.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="size-12 mx-auto mb-3 opacity-30" />
              <p>{t('admin.selectConversation', locale)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
