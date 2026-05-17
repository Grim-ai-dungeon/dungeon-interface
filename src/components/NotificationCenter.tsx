// ─── NotificationCenter.tsx — Dungeon notification bell + history drawer ─────
// Bell icon sits in the HUD right area. Click to open a drawer showing recent
// notifications. Unread count shows as a badge on the bell.

import { useEffect, useRef } from 'react';
import type { NotificationRecord } from '../hooks/useNotifications';

const AGENT_COLORS: Record<string, string> = {
  grim:   '#FFA700',
  bob:    '#6699CC',
  kevin:  '#FF5522',
  stuart: '#FFD700',
  agnes:  '#FF66AA',
  system: '#99CCFF',
};

const TYPE_ICONS: Record<string, string> = {
  success: '✓',
  warn:    '⚡',
  error:   '✗',
  info:    '·',
};

const TYPE_COLORS: Record<string, string> = {
  success: '#44ff88',
  warn:    '#FFD700',
  error:   '#FF4444',
  info:    '#99CCFF',
};

interface Props {
  notifications: NotificationRecord[];
  unreadCount: number;
  isOpen: boolean;
  onToggle: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

export function NotificationCenter({
  notifications,
  unreadCount,
  isOpen,
  onToggle,
  onMarkAllRead,
  onClearAll,
}: Props) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    // Small delay to avoid closing immediately on open
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [isOpen, onToggle]);

  return (
    <div className="notif-center" ref={drawerRef}>
      {/* Bell button */}
      <button
        className={`notif-bell-btn${isOpen ? ' notif-bell-btn--open' : ''}${unreadCount > 0 ? ' notif-bell-btn--active' : ''}`}
        onClick={onToggle}
        title={`${unreadCount} unread notifications`}
        aria-label="Notification center"
      >
        <span className={`notif-bell-icon${unreadCount > 0 ? ' notif-bell-icon--ring' : ''}`}>🔔</span>
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown drawer */}
      {isOpen && (
        <div className="notif-drawer">
          {/* Header */}
          <div className="notif-drawer-header">
            <span className="notif-drawer-title">⚔ ALERTS</span>
            <div className="notif-drawer-actions">
              {unreadCount > 0 && (
                <button className="notif-action-btn" onClick={onMarkAllRead} title="Mark all read">
                  ✓ ALL
                </button>
              )}
              {notifications.length > 0 && (
                <button className="notif-action-btn notif-action-btn--danger" onClick={onClearAll} title="Clear all">
                  ✕ CLEAR
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <span className="notif-empty-icon">🌑</span>
                <span className="notif-empty-text">All quiet in the dungeon.</span>
              </div>
            ) : (
              notifications.map(n => {
                const agentColor = AGENT_COLORS[n.agentId] ?? '#aaaaaa';
                const typeColor  = TYPE_COLORS[n.type]     ?? '#cccccc';
                const typeIcon   = TYPE_ICONS[n.type]      ?? '·';
                return (
                  <div
                    key={n.id}
                    className={`notif-row notif-row--${n.type}${n.read ? ' notif-row--read' : ''}`}
                  >
                    {/* Unread indicator */}
                    {!n.read && <div className="notif-unread-dot" style={{ background: agentColor }} />}
                    {n.read  && <div className="notif-unread-dot notif-unread-dot--read" />}

                    <div className="notif-row-body">
                      <div className="notif-row-header">
                        <span className="notif-row-agent" style={{ color: agentColor }}>
                          [{n.agentId.toUpperCase()}]
                        </span>
                        <span className="notif-row-icon" style={{ color: typeColor }}>
                          {typeIcon}
                        </span>
                        <span className="notif-row-time">{n.time}</span>
                      </div>
                      <div className="notif-row-msg" style={{ color: n.read ? 'rgba(245,230,211,0.5)' : typeColor }}>
                        {n.message}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
