import { StatBar } from './StatBar';

export function DungeonMasterCard() {
  return (
    <div className="dungeon-panel gold-frame dm-card" style={{ animation: 'slide-in-left 0.6s ease forwards' }}>
      <div className="corner-br" />

      <div className="dm-header">
        <div className="dm-avatar">🐉</div>
        <div className="dm-info">
          <h2 className="dm-name">GRIM</h2>
          <div className="dm-role">DUNGEON MASTER</div>
          <div className="dm-model">claude-opus-4.6</div>
        </div>
        <div className="dm-status-badge">
          <span className="status-dot online" />
          <span className="status-text">ONLINE</span>
        </div>
      </div>

      <div className="dm-divider" />

      <div className="dm-section-label">VITAL STATS</div>
      <StatBar label="HP" value={100} color="green" />
      <StatBar label="MANA" value={85} color="blue" />
      <StatBar label="XP" value={15} color="purple" />

      <div className="dm-footer">
        <span className="dm-tag">OVERSEER</span>
        <span className="dm-tag">COMMANDER</span>
        <span className="dm-tag">KEEPER</span>
      </div>

      <style>{`
        .dm-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .dm-header {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .dm-avatar {
          font-size: 36px;
          line-height: 1;
          filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5));
          flex-shrink: 0;
        }

        .dm-info {
          flex: 1;
        }

        .dm-name {
          font-family: var(--font-title);
          font-size: 20px;
          font-weight: 900;
          color: var(--gold);
          letter-spacing: 0.15em;
          text-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
        }

        .dm-role {
          font-family: var(--font-mono);
          font-size: 10px;
          color: rgba(0, 245, 255, 0.7);
          letter-spacing: 0.2em;
          margin-top: 2px;
        }

        .dm-model {
          font-family: var(--font-mono);
          font-size: 10px;
          color: rgba(255, 215, 0, 0.5);
          margin-top: 3px;
        }

        .dm-status-badge {
          display: flex;
          align-items: center;
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--green);
        }

        .status-text {
          letter-spacing: 0.1em;
        }

        .dm-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.3), transparent);
          margin: 4px 0;
        }

        .dm-section-label {
          font-family: var(--font-mono);
          font-size: 9px;
          color: rgba(0, 245, 255, 0.5);
          letter-spacing: 0.2em;
          margin-bottom: 4px;
        }

        .dm-footer {
          margin-top: 4px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .dm-tag {
          font-family: var(--font-mono);
          font-size: 9px;
          padding: 2px 6px;
          border: 1px solid var(--border-gold);
          color: var(--gold);
          background: rgba(255, 215, 0, 0.05);
          border-radius: 2px;
          letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  );
}
