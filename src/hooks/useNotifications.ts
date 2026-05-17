// ─── useNotifications.ts — Dungeon notification system ───────────────────────
// Manages dungeon alerts: gateway events, agent status changes, and important
// simulation events. Provides toast queue + notification history drawer state.

import { useState, useCallback, useRef } from 'react';
import type { ToastItem } from '../components/ToastStack';

export interface NotificationRecord {
  id: number;
  agentId: string;
  message: string;
  type: 'success' | 'warn' | 'error' | 'info';
  time: string;
  read: boolean;
}

let notifId = 5000;
function nextId() { return ++notifId; }

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Decide whether an event is important enough to show a toast
function shouldToast(type: NotificationRecord['type'], agentId: string, message: string): boolean {
  // Always toast errors
  if (type === 'error') return true;
  // Always toast gateway connection events
  if (agentId === 'system') return true;
  // Toast warnings from real agents (not ambient flavor)
  if (type === 'warn') {
    // Skip ambient flavor toasts — they have emoji patterns at the start
    const ambientPatterns = ['🌑', '⚡ An arcane', '🔮', '🐉 A low', '🌀', '🔥 The forge', '⚙️', '💥', '🔩', '📖 A page', '🕯️', '📜 An ancient', '🔍 A tome', '💰 Coins rattle', '✨ A stray', '🔒', '👁️', '🎨', '✏️', '🖼️ A canvas', '🌈'];
    if (ambientPatterns.some(p => message.startsWith(p))) return false;
    return true;
  }
  // Toast success only for gateway/real completions (check message content)
  if (type === 'success') {
    const importantPatterns = ['connected', 'response received', 'task complete', 'joined the dungeon', 'gateway'];
    return importantPatterns.some(p => message.toLowerCase().includes(p));
  }
  return false;
}

interface UseNotificationsReturn {
  toasts: ToastItem[];
  notifications: NotificationRecord[];
  unreadCount: number;
  addNotification: (agentId: string, message: string, type: NotificationRecord['type']) => void;
  dismissToast: (id: number) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export function useNotifications(): UseNotificationsReturn {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);

  // Rate-limit: track last toast time per agentId to avoid spam
  const lastToastTime = useRef<Map<string, number>>(new Map());
  const MIN_TOAST_GAP_MS = 3000; // no more than 1 toast per agent per 3s

  const addNotification = useCallback((
    agentId: string,
    message: string,
    type: NotificationRecord['type']
  ) => {
    const id = nextId();
    const time = nowTime();

    // Always add to notification history
    const record: NotificationRecord = { id, agentId, message, type, time, read: false };
    setNotifications(prev => [record, ...prev].slice(0, 100)); // keep last 100

    // Decide if this warrants a toast
    if (!shouldToast(type, agentId, message)) return;

    // Rate-limit toasts per agent
    const now = Date.now();
    const lastTime = lastToastTime.current.get(agentId) ?? 0;
    if (now - lastTime < MIN_TOAST_GAP_MS && type !== 'error') return;
    lastToastTime.current.set(agentId, now);

    // TTL: errors linger longer
    const ttl = type === 'error' ? 8000 : type === 'warn' ? 5500 : 4000;

    const toast: ToastItem = { id, agentId, message, type, ttl };
    setToasts(prev => [...prev.slice(-4), toast]); // max 5 toasts at once
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    toasts,
    notifications,
    unreadCount,
    addNotification,
    dismissToast,
    markAllRead,
    clearAll,
  };
}
