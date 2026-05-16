import { StatBar } from './StatBar';

interface StatEntry {
  label: string;
  value: number;
  color: 'green' | 'blue' | 'purple' | 'gold' | 'red' | 'cyan';
}

interface MinionCardProps {
  emoji: string;
  name: string;
  title: string;
  model: string;
  stats: StatEntry[];
  abilities: string[];
  statusText: string;
  statusType: 'online' | 'idle' | 'busy';
  animationDelay?: string;
}

export function MinionCard({
  emoji,
  name,
  title,
  model,
  stats,
  abilities,
  statusText,
  statusType,
  animationDelay = '0s',
}: MinionCardProps) {
  return (
    <div
      className="dungeon-panel minion-card"
      style={{ animation: `slide-in-right 0.6s ease ${animationDelay} both` }}
    >
      <div className="corner-br" />

      <div className="minion-header">
        <div className="minion-avatar">{emoji}</div>
        <div className="minion-info">
          <h3 className="minion-name">{name}</h3>
          <div className="minion-title">{title}</div>
          <div className="minion-model">{model}</div>
        </div>
        <div className="minion-status">
          <span className={`status-dot ${statusType}`} />
          <span className="minion-status-text">{statusType.toUpperCase()}</span>
        </div>
      </div>

      <div className="minion-divider" />

      <div className="minion-section-label">STATS</div>
      {stats.map((s) => (
        <StatBar key={s.label} label={s.label} value={s.value} color={s.color} />
      ))}

      <div className="minion-section-label" style={{ marginTop: '8px' }}>ABILITIES</div>
      <div className="minion-abilities">
        {abilities.map((a) => (
          <span key={a} className="ability-tag">{a}</span>
        ))}
      </div>

      <div className="minion-status-bar">
        <span className={`status-dot ${statusType}`} style={{ width: '6px', height: '6px' }} />
        <span className="minion-status-msg">{statusText}</span>
      </div>

      <style>{`
        .minion-card {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .minion-header {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .minion-avatar {
          font-size: 28px;
          line-height: 1;
          filter: drop-shadow(0 0 6px rgba(0, 245, 255, 0.4));
          flex-shrink: 0;
        }

        .minion-info {
          flex: 1;
          min-width: 0;
        }

        .minion-name {
          font-family: var(--font-title);
          font-size: 16px;
          font-weight: 700;
          color: var(--cyan);
          letter-spacing: 0.1em;
          text-shadow: 0 0 8px rgba(0, 245, 255, 0.4);
        }

        .minion-title {
          font-family: var(--font-mono);
          font-size: 9px;
          color: rgba(255, 215, 0, 0.7);
          letter-spacing: 0.15em;
          margin-top: 2px;
        }

        .minion-model {
          font-family: var(--font-mono);
          font-size: 9px;
          color: rgba(0, 245, 255, 0.4);
          margin-top: 2px;
        }

        .minion-status {
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-mono);
          font-size: 9px;
          flex-shrink: 0;
        }

        .minion-status-text {
          color: var(--gold);
          letter-spacing: 0.1em;
        }

        .minion-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 245, 255, 0.2), transparent);
          margin: 2px 0;
        }

        .minion-section-label {
          font-family: var(--font-mono);
          font-size: 9px;
          color: rgba(0, 245, 255, 0.4);
          letter-spacing: 0.2em;
          margin-bottom: 3px;
        }

        .minion-abilities {
          display: flex;
          flex-wrap: wrap;
          gap: 0;
        }

        .minion-status-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          padding-top: 6px;
          border-top: 1px solid rgba(0, 245, 255, 0.1);
          font-family: var(--font-mono);
          font-size: 9px;
          color: rgba(0, 245, 255, 0.6);
          letter-spacing: 0.1em;
        }

        .minion-status-msg {
          color: rgba(0, 245, 255, 0.6);
        }
      `}</style>
    </div>
  );
}
