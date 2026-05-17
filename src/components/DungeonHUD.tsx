// ─── DungeonHUD.tsx — Top bar title + clock ──────────────────────────────────

import { useEffect, useState } from 'react';
import { NotificationCenter } from './NotificationCenter';
import type { NotificationRecord } from '../hooks/useNotifications';

function getBrusselsTime(): string {
  return new Date().toLocaleTimeString('en-GB', {
    timeZone: 'Europe/Brussels',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
}

function getBrusselsDate(): string {
  return new Date().toLocaleDateString('en-GB', {
    timeZone: 'Europe/Brussels',
    weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
  });
}

export interface MinionBusyEntry {
  id: string;
  name: string;
  /** true = busy/running, false = idle, 'error' = error */
  busy: boolean | 'error';
}

interface Props {
  minions?: MinionBusyEntry[];
  notifications?: NotificationRecord[];
  unreadCount?: number;
  onToggleNotifications?: () => void;
  notificationsOpen?: boolean;
  onMarkAllRead?: () => void;
  onClearAllNotifications?: () => void;
}

export function DungeonHUD({ minions, notifications = [], unreadCount = 0, onToggleNotifications, notificationsOpen = false, onMarkAllRead, onClearAllNotifications }: Props) {
  const [time, setTime] = useState(getBrusselsTime());
  const [date, setDate] = useState(getBrusselsDate());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(getBrusselsTime());
      setDate(getBrusselsDate());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="dungeon-hud">
      {/* Animated scan line sweeping down */}
      <div className="hud-scan" />

      {/* Left: system status + minion busy lights */}
      <div className="hud-left">
        <span className="hud-badge hud-badge--online">● SYS.ONLINE</span>
        {minions && minions.length > 0 && (
          <div className="hud-minion-lights">
            {minions.map(m => (
              <div key={m.id} className="hud-minion-entry" title={`${m.name}: ${m.busy === true ? 'BUSY' : m.busy === 'error' ? 'ERROR' : 'IDLE'}`}>
                <span
                  className={`hud-minion-dot ${
                    m.busy === true
                      ? 'hud-minion-dot--busy'
                      : m.busy === 'error'
                      ? 'hud-minion-dot--error'
                      : 'hud-minion-dot--idle'
                  }`}
                />
                <span className="hud-minion-name">{m.name.toUpperCase()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Center: title */}
      <div className="hud-center-block">
        <div className="hud-center-title-block">
          <span className="hud-dragon">🐉</span>
          <div className="hud-title-block">
            <div className="hud-title">THE OVERLORD'S DUNGEON</div>
            <div className="hud-sub">GRIM — DUNGEON MASTER COMMAND v2</div>
          </div>
          <span className="hud-dragon hud-dragon--flip">🐉</span>
        </div>
      </div>

      {/* Right: Brussels clock + notification bell */}
      <div className="hud-right">
        {onToggleNotifications && (
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            isOpen={notificationsOpen}
            onToggle={onToggleNotifications}
            onMarkAllRead={onMarkAllRead ?? (() => {})}
            onClearAll={onClearAllNotifications ?? (() => {})}
          />
        )}
        <div className="hud-clock-block">
          <span className="hud-clock-label">BRU</span>
          <span className="hud-clock-time">{time}</span>
          <span className="hud-clock-date">{date}</span>
        </div>
      </div>

      {/* Bottom glow line */}
      <div className="hud-glow-line" />
    </header>
  );
}
