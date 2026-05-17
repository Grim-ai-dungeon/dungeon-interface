// ─── DungeonHUD.tsx — Top bar title + clock ──────────────────────────────────

import { useEffect, useState } from 'react';

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

export function DungeonHUD() {
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

      {/* Left: system status */}
      <div className="hud-left">
        <span className="hud-badge hud-badge--online">● SYS.ONLINE</span>
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

      {/* Right: Brussels clock */}
      <div className="hud-right">
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
