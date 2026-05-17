// ─── ScreenWatcher.tsx — Dungeon "Scrying Portal" panel ──────────────────────
//
// Phase 1: on-demand screenshot capture panel, dungeon-themed.
// Invokes the Rust `capture_screenshot` command via useScreenCapture hook.
// The saved PNG at ~/.openclaw/workspace/screenshots/latest.png is also
// available for Bob/OpenClaw to pick up for visual context.

import { useScreenCapture } from '../hooks/useScreenCapture';
import type { CSSProperties } from 'react';

interface Props {
  onClose: () => void;
}

// ─── Inline styles (keeps component self-contained, no new CSS file needed) ───

const overlay: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.75)',
  backdropFilter: 'blur(4px)',
  zIndex: 900,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const panel: CSSProperties = {
  background: 'linear-gradient(160deg, #0a0a14 0%, #0d0d1f 60%, #0a0a14 100%)',
  border: '1px solid #9933ff55',
  boxShadow: '0 0 40px #9933ff33, 0 0 8px #9933ff44 inset',
  borderRadius: 12,
  padding: '24px 28px',
  width: 680,
  maxWidth: '92vw',
  maxHeight: '88vh',
  overflowY: 'auto',
  position: 'relative',
};

const headerRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 18,
};

const title: CSSProperties = {
  fontFamily: 'monospace',
  fontWeight: 'bold',
  fontSize: 15,
  letterSpacing: '0.12em',
  color: '#cc88ff',
  textTransform: 'uppercase',
  flex: 1,
  textShadow: '0 0 12px #9933ff88',
};

const closeBtn: CSSProperties = {
  background: 'none',
  border: '1px solid #9933ff44',
  color: '#cc88ff',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  padding: '3px 10px',
  letterSpacing: '0.08em',
  transition: 'border-color 0.15s',
};

const captureBtn: CSSProperties = {
  background: 'linear-gradient(135deg, #2d0066 0%, #1a004d 100%)',
  border: '1px solid #9933ff88',
  color: '#dd99ff',
  fontFamily: 'monospace',
  fontSize: 13,
  fontWeight: 'bold',
  letterSpacing: '0.1em',
  padding: '10px 22px',
  borderRadius: 6,
  cursor: 'pointer',
  boxShadow: '0 0 12px #9933ff44',
  textTransform: 'uppercase',
  transition: 'all 0.15s',
};

const captureDisabled: CSSProperties = {
  ...captureBtn,
  opacity: 0.5,
  cursor: 'not-allowed',
};

const meta: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 11,
  color: '#9977bb',
  letterSpacing: '0.06em',
  marginTop: 6,
  lineHeight: 1.6,
};

const errBox: CSSProperties = {
  background: '#2d000a',
  border: '1px solid #cc3355',
  borderRadius: 6,
  padding: '10px 14px',
  color: '#ff6688',
  fontFamily: 'monospace',
  fontSize: 12,
  marginTop: 12,
};

const imgWrap: CSSProperties = {
  marginTop: 16,
  border: '1px solid #9933ff33',
  borderRadius: 6,
  overflow: 'hidden',
  boxShadow: '0 0 20px #9933ff22',
};

const screenshotImg: CSSProperties = {
  display: 'block',
  width: '100%',
  height: 'auto',
};

const divider: CSSProperties = {
  height: 1,
  background: 'linear-gradient(to right, transparent, #9933ff44, transparent)',
  margin: '16px 0',
};

const infoGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '6px 20px',
};

const infoLabel: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 10,
  color: '#7755aa',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const infoVal: CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 11,
  color: '#cc99ff',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ScreenWatcher({ onClose }: Props) {
  const { status, result, error, capture, clear } = useScreenCapture();
  const isCapturing = status === 'capturing';

  const handleCapture = () => { void capture(0); };

  const handleClear = () => {
    clear();
  };

  const captureTime = result
    ? new Date(result.capturedAt).toLocaleTimeString('en-US', { hour12: false })
    : null;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={headerRow}>
          <span style={{ fontSize: 22 }}>🔮</span>
          <span style={title}>Scrying Portal — Screen Watch</span>
          <button style={closeBtn} onClick={onClose}>✕ Close</button>
        </div>

        {/* Subtitle */}
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#7755aa', marginBottom: 16, letterSpacing: '0.06em' }}>
          Phase 1 · On-demand capture · Primary monitor · Saves to{' '}
          <span style={{ color: '#9977bb' }}>~/.openclaw/workspace/screenshots/latest.png</span>
        </div>

        {/* Action row */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            style={isCapturing ? captureDisabled : captureBtn}
            disabled={isCapturing}
            onClick={handleCapture}
          >
            {isCapturing ? '⏳ Scrying…' : '📷 Capture Screen'}
          </button>
          {result && (
            <button
              style={{ ...closeBtn, fontSize: 11 }}
              onClick={handleClear}
            >
              Clear
            </button>
          )}
        </div>

        {/* Status line */}
        <div style={meta}>
          {status === 'idle' && 'Awaiting the Overlord\'s command…'}
          {status === 'capturing' && '⚡ The scrying orb blazes — capturing the realm…'}
          {status === 'success' && `✅ Capture complete · Saved: ${result?.savedPath ?? ''}`}
          {status === 'error' && '❌ The orb went dark — capture failed.'}
        </div>

        {/* Error */}
        {error && (
          <div style={errBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <>
            <div style={divider} />

            {/* Metadata grid */}
            <div style={infoGrid}>
              <div>
                <div style={infoLabel}>Resolution</div>
                <div style={infoVal}>{result.width} × {result.height}</div>
              </div>
              <div>
                <div style={infoLabel}>Captured at</div>
                <div style={infoVal}>{captureTime}</div>
              </div>
              <div>
                <div style={infoLabel}>Monitor index</div>
                <div style={infoVal}>{result.monitorIndex}</div>
              </div>
              <div>
                <div style={infoLabel}>Data size</div>
                <div style={infoVal}>
                  {Math.round(result.dataUrl.length * 0.75 / 1024)} KB (PNG)
                </div>
              </div>
            </div>

            {/* Preview */}
            <div style={imgWrap}>
              <img
                src={result.dataUrl}
                alt="Screenshot preview"
                style={screenshotImg}
              />
            </div>

            <div style={{ ...meta, marginTop: 10, color: '#664499' }}>
              💡 Bob can pick up <code style={{ color: '#9977bb' }}>latest.png</code> from the screenshots directory for visual context.
              Future phases: auto-watch intervals, region crop, diff detection.
            </div>
          </>
        )}

      </div>
    </div>
  );
}
