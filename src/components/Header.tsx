import { useEffect, useState } from 'react';

function getBrusselsTime(): string {
  const now = new Date();
  // Brussels is UTC+2 (CEST) / UTC+1 (CET)
  // Use Intl for proper timezone handling
  return now.toLocaleTimeString('en-GB', {
    timeZone: 'Europe/Brussels',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getBrusselsDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-GB', {
    timeZone: 'Europe/Brussels',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function Header() {
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
    <header className="dungeon-header">
      <div className="header-scan-line" />
      <div className="header-content">
        <div className="header-left">
          <div className="header-badge">SYSTEM ONLINE</div>
        </div>
        <div className="header-center">
          <h1 className="header-title">⚔️ THE DUNGEON ⚔️</h1>
          <p className="header-subtitle">OVERLORD'S COMMAND CENTER</p>
        </div>
        <div className="header-right">
          <div className="header-clock">
            <span className="clock-label">BRU</span>
            <span className="clock-time">{time}</span>
            <span className="clock-date">{date}</span>
          </div>
        </div>
      </div>
      <div className="header-bottom-line" />

      <style>{`
        .dungeon-header {
          position: relative;
          width: 100%;
          background: linear-gradient(180deg, rgba(0, 245, 255, 0.05) 0%, transparent 100%);
          border-bottom: 1px solid rgba(0, 245, 255, 0.3);
          overflow: hidden;
          flex-shrink: 0;
        }

        .header-scan-line {
          position: absolute;
          left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0, 245, 255, 0.6), transparent);
          animation: header-scan 4s linear infinite;
          pointer-events: none;
          z-index: 1;
        }

        @keyframes header-scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          position: relative;
          z-index: 2;
        }

        .header-left, .header-right {
          flex: 1;
        }

        .header-right {
          display: flex;
          justify-content: flex-end;
        }

        .header-badge {
          display: inline-block;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--green);
          border: 1px solid rgba(0, 255, 136, 0.4);
          padding: 3px 8px;
          border-radius: 2px;
          background: rgba(0, 255, 136, 0.05);
          animation: glow-pulse 2s ease-in-out infinite;
        }

        .header-center {
          text-align: center;
        }

        .header-title {
          font-family: var(--font-title);
          font-size: 28px;
          font-weight: 900;
          color: var(--gold);
          letter-spacing: 0.15em;
          text-shadow: 0 0 10px rgba(255,215,0,0.6), 0 0 25px rgba(255,215,0,0.25);
          text-transform: uppercase;
          line-height: 1;
        }

        .header-subtitle {
          font-family: var(--font-mono);
          font-size: 11px;
          color: rgba(0, 245, 255, 0.6);
          letter-spacing: 0.3em;
          margin-top: 3px;
        }

        .header-clock {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .clock-label {
          font-family: var(--font-mono);
          font-size: 9px;
          color: rgba(0, 245, 255, 0.5);
          letter-spacing: 0.2em;
        }

        .clock-time {
          font-family: var(--font-title);
          font-size: 20px;
          font-weight: 700;
          color: var(--cyan);
          text-shadow: 0 0 10px rgba(0, 245, 255, 0.5);
          letter-spacing: 0.1em;
        }

        .clock-date {
          font-family: var(--font-mono);
          font-size: 10px;
          color: rgba(0, 245, 255, 0.6);
          letter-spacing: 0.05em;
        }

        .header-bottom-line {
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--cyan-dim), var(--gold), var(--cyan-dim), transparent);
          opacity: 0.5;
        }
      `}</style>
    </header>
  );
}
