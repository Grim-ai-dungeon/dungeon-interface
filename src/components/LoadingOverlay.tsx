// ─── LoadingOverlay.tsx — Dungeon-themed loading screen ─────────────────────

import { useState, useEffect } from 'react';

interface Props {
  onComplete: () => void;
}

const BOOT_LINES = [
  '🔥 Lighting dungeon torches...',
  '📜 Consulting the ancient scrolls...',
  '⚔️  Arming the minions...',
  '🗝️  Unlocking vault chambers...',
  '🐉 Summoning Grim, Dungeon Master...',
  '✅ Dungeon Interface ready.',
];

export function LoadingOverlay({ onComplete }: Props) {
  const [lines, setLines] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let lineIdx = 0;
    const interval = setInterval(() => {
      if (lineIdx < BOOT_LINES.length) {
        setLines(prev => [...prev, BOOT_LINES[lineIdx]]);
        setProgress(Math.round(((lineIdx + 1) / BOOT_LINES.length) * 100));
        lineIdx++;
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setDone(true);
          setTimeout(onComplete, 400);
        }, 300);
      }
    }, 280);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className={`loading-overlay${done ? ' loading-overlay--fade' : ''}`}>
      <div className="loading-content">
        <div className="loading-dragon">🐉</div>
        <div className="loading-title">THE OVERLORD'S DUNGEON</div>
        <div className="loading-subtitle">DUNGEON INTERFACE v2 — INITIALIZING</div>

        <div className="loading-log">
          {lines.map((line, i) => (
            <div key={i} className="loading-log-line">{line}</div>
          ))}
          {!done && <span className="loading-cursor" />}
        </div>

        <div className="loading-bar-wrap">
          <div className="loading-bar-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="loading-pct">{progress}%</div>
      </div>
    </div>
  );
}
