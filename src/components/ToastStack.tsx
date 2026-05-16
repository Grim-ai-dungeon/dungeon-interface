// ─── ToastStack.tsx — Dungeon-styled toast notifications ─────────────────────
// Scroll/wax-seal popup alerts for dungeon events.

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ToastItem {
  id: number;
  agentId: string;
  message: string;
  type: 'success' | 'warn' | 'error' | 'info';
  ttl: number; // ms until dismiss
}

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}

const TYPE_ICON: Record<string, string> = {
  success: '✔',
  warn:    '⚠',
  error:   '✖',
  info:    '✦',
};

const TYPE_COLOR: Record<string, string> = {
  success: '#44ff88',
  warn:    '#FFD700',
  error:   '#CC3333',
  info:    '#99CCFF',
};

const AGENT_COLOR: Record<string, string> = {
  grim:   '#FF9933',
  bob:    '#99CCFF',
  kevin:  '#FF6633',
  stuart: '#FFD700',
  system: '#aaaaaa',
};

const AGENT_EMOJI: Record<string, string> = {
  grim:   '🐉',
  bob:    '📚',
  kevin:  '🔧',
  stuart: '💰',
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(), 350);
  }, [onDismiss]);

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, toast.ttl);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [dismiss, toast.ttl]);

  const color = AGENT_COLOR[toast.agentId] ?? '#FF9933';
  const typeColor = TYPE_COLOR[toast.type] ?? '#99CCFF';
  const emoji = AGENT_EMOJI[toast.agentId] ?? '⚔';
  const icon = TYPE_ICON[toast.type] ?? '✦';

  return (
    <div
      className={`dungeon-toast dungeon-toast--${toast.type}${exiting ? ' dungeon-toast--exit' : ''}`}
      style={{ borderColor: color + '66' }}
      onClick={dismiss}
    >
      {/* Wax seal / badge left edge */}
      <div className="dt-seal" style={{ background: color + '22', borderColor: color + '55' }}>
        <span className="dt-seal-emoji">{emoji}</span>
      </div>

      {/* Content */}
      <div className="dt-body">
        <div className="dt-header">
          <span className="dt-agent" style={{ color }}>{toast.agentId.toUpperCase()}</span>
          <span className="dt-icon" style={{ color: typeColor }}>{icon}</span>
        </div>
        <div className="dt-msg">{toast.message}</div>
      </div>

      {/* Progress bar */}
      <div
        className="dt-progress"
        style={{
          background: color,
          animationDuration: `${toast.ttl}ms`,
        }}
      />
    </div>
  );
}

export function ToastStack({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;
  return (
    <div className="dungeon-toast-stack">
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
