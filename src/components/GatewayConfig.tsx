// ─── GatewayConfig.tsx — Gateway connection settings modal ───────────────────

import { useState, useEffect, useCallback } from 'react';
import { gateway, loadGatewayConfig } from '../services/gateway';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
}

// ─── GatewayConfig ────────────────────────────────────────────────────────────

export function GatewayConfig({ onClose, status }: Props) {
  const current = loadGatewayConfig();
  const [url, setUrl] = useState(current.url || 'ws://localhost:18789');
  const [token, setToken] = useState(current.token || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleConnect = useCallback(() => {
    if (!url.trim()) {
      setErrorMsg('Gateway URL is required');
      return;
    }
    setErrorMsg('');
    setSaving(true);
    gateway.configure(url.trim(), token.trim());
    gateway.disconnect();
    // Short delay so disconnect completes before reconnect
    setTimeout(() => {
      gateway.connect();
      setSaving(false);
      onClose();
    }, 300);
  }, [url, token, onClose]);

  const handleDisconnect = useCallback(() => {
    gateway.disconnect();
    onClose();
  }, [onClose]);

  const statusLabel = {
    disconnected: { text: '⚫ Disconnected', cls: 'gc-status--disconnected' },
    connecting:   { text: '🟡 Connecting…',  cls: 'gc-status--connecting' },
    connected:    { text: '🟢 Connected',     cls: 'gc-status--connected' },
    error:        { text: '🔴 Error',         cls: 'gc-status--error' },
  }[status];

  return (
    <>
      {/* Backdrop */}
      <div className="gc-backdrop" onClick={onClose} />

      {/* Modal */}
      <div className="gc-modal">
        <div className="gc-header">
          <span className="gc-title">⚙ Gateway Connection</span>
          <button className="gc-close-btn" onClick={onClose} title="Close">✕</button>
        </div>

        <div className="gc-body">
          <div className={`gc-status ${statusLabel.cls}`}>
            {statusLabel.text}
          </div>

          <label className="gc-label">Gateway URL</label>
          <input
            className="gc-input"
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="ws://localhost:18789"
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
          />

          <label className="gc-label">Gateway Token (password)</label>
          <input
            className="gc-input"
            type="password"
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Leave blank if no auth required"
            onKeyDown={e => e.key === 'Enter' && handleConnect()}
          />

          {errorMsg && (
            <div className="gc-error">{errorMsg}</div>
          )}

          <div className="gc-hint">
            Connects to the OpenClaw Gateway WebSocket. The token is your
            gateway password (set in gateway config). Leave blank for
            unauthenticated local access.
          </div>
        </div>

        <div className="gc-footer">
          {status === 'connected' && (
            <button className="gc-btn gc-btn--danger" onClick={handleDisconnect}>
              Disconnect
            </button>
          )}
          <button
            className="gc-btn gc-btn--primary"
            onClick={handleConnect}
            disabled={saving}
          >
            {saving ? 'Connecting…' : status === 'connected' ? 'Reconnect' : 'Connect'}
          </button>
        </div>
      </div>

      <style>{`
        .gc-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          z-index: 1999;
        }
        .gc-modal {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2000;
          background: #0d0d12;
          border: 1px solid #3a2a00;
          border-radius: 8px;
          width: 400px;
          max-width: 90vw;
          box-shadow: 0 0 40px #000a, 0 0 20px #ff990022;
          font-family: inherit;
        }
        .gc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #2a2020;
          background: #110e08;
          border-radius: 8px 8px 0 0;
        }
        .gc-title {
          font-size: 14px;
          font-weight: 700;
          color: #FF9933;
          letter-spacing: 0.05em;
        }
        .gc-close-btn {
          background: none;
          border: none;
          color: #888;
          font-size: 14px;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 3px;
          transition: color 0.15s;
        }
        .gc-close-btn:hover { color: #FF9933; }
        .gc-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .gc-status {
          font-size: 12px;
          font-weight: 600;
          padding: 6px 10px;
          border-radius: 4px;
          margin-bottom: 4px;
          text-align: center;
        }
        .gc-status--disconnected { background: #1a1a1a; color: #aaa; }
        .gc-status--connecting   { background: #1a1600; color: #FFD700; }
        .gc-status--connected    { background: #0a1a0a; color: #44FF88; }
        .gc-status--error        { background: #1a0808; color: #FF4444; }
        .gc-label {
          font-size: 11px;
          font-weight: 600;
          color: #888;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .gc-input {
          background: #0a0a10;
          border: 1px solid #2a2030;
          border-radius: 4px;
          color: #eee;
          font-size: 13px;
          padding: 8px 10px;
          font-family: monospace;
          outline: none;
          transition: border-color 0.15s;
          width: 100%;
          box-sizing: border-box;
        }
        .gc-input:focus { border-color: #FF9933; }
        .gc-input::placeholder { color: #444; }
        .gc-error {
          font-size: 12px;
          color: #FF4444;
          padding: 4px 8px;
          background: #1a0808;
          border-radius: 4px;
        }
        .gc-hint {
          font-size: 11px;
          color: #555;
          line-height: 1.5;
          margin-top: 4px;
        }
        .gc-footer {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding: 12px 16px;
          border-top: 1px solid #2a2020;
          background: #0d0a06;
          border-radius: 0 0 8px 8px;
        }
        .gc-btn {
          padding: 8px 18px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
          letter-spacing: 0.03em;
        }
        .gc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .gc-btn--primary {
          background: #FF9933;
          color: #000;
        }
        .gc-btn--primary:hover:not(:disabled) { background: #FFB855; }
        .gc-btn--danger {
          background: #3a1010;
          color: #FF4444;
          border: 1px solid #5a1818;
        }
        .gc-btn--danger:hover { background: #4a1414; }
      `}</style>
    </>
  );
}
