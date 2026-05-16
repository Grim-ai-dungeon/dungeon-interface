import { useEffect, useState } from 'react';
import { useTheme } from '../ThemeContext';

// ─── Loading Overlay ─────────────────────────────────────────────────────────
// Shows "INITIALIZING DUNGEON..." animation before the main UI renders.

const BOOT_SEQUENCE = [
  'LOADING DUNGEON KERNEL...',
  'INITIALIZING ISOMETRIC RENDERER...',
  'CONNECTING TO OPENCLAW API...',
  'DEPLOYING MINION AGENTS...',
  'CALIBRATING GRIM SUBSYSTEM...',
  'DUNGEON ONLINE. WELCOME, OVERLORD.',
];

interface LoadingOverlayProps {
  onComplete: () => void;
}

export function LoadingOverlay({ onComplete }: LoadingOverlayProps) {
  const { theme } = useTheme();
  const [lineIndex, setLineIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Advance boot lines
    const lineInterval = setInterval(() => {
      setLineIndex((prev) => {
        const next = prev + 1;
        if (next >= BOOT_SEQUENCE.length) {
          clearInterval(lineInterval);
          // Brief pause then fade out
          setTimeout(() => {
            setFading(true);
            setTimeout(onComplete, 400);
          }, 500);
        }
        return next;
      });
    }, 280);

    // Smooth progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 1.6;
      });
    }, 30);

    return () => {
      clearInterval(lineInterval);
      clearInterval(progressInterval);
    };
  }, [onComplete]);

  return (
    <div
      className="loading-overlay"
      style={{
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s ease',
        background: theme.colors.bgDeep,
      }}
    >
      {/* Corner decorations */}
      <div className="loading-corner loading-corner--tl" style={{ borderColor: theme.colors.primary }} />
      <div className="loading-corner loading-corner--tr" style={{ borderColor: theme.colors.primary }} />
      <div className="loading-corner loading-corner--bl" style={{ borderColor: theme.colors.primary }} />
      <div className="loading-corner loading-corner--br" style={{ borderColor: theme.colors.primary }} />

      <div className="loading-content">
        {/* Main icon */}
        <div
          className="loading-dragon"
          style={{ filter: `drop-shadow(0 0 20px ${theme.colors.secondary}) drop-shadow(0 0 40px ${theme.colors.secondary}88)` }}
        >
          🐉
        </div>

        {/* Title */}
        <div
          className="loading-title"
          style={{
            color: theme.colors.secondary,
            textShadow: `0 0 30px ${theme.colors.secondary}, 0 0 60px ${theme.colors.secondary}55`,
            fontFamily: theme.fontTitle,
          }}
        >
          DUNGEON INTERFACE
        </div>
        <div
          className="loading-subtitle"
          style={{ color: theme.colors.textDim, fontFamily: theme.fontMono }}
        >
          GRIM — DUNGEON MASTER COMMAND CONSOLE v2.0
        </div>

        {/* Boot log */}
        <div
          className="loading-log"
          style={{
            borderColor: theme.colors.borderPrimary,
            background: `${theme.colors.bgPanel}ee`,
            fontFamily: theme.fontMono,
          }}
        >
          {BOOT_SEQUENCE.slice(0, lineIndex + 1).map((line, i) => (
            <div
              key={i}
              className={`loading-log-line ${i === lineIndex ? 'loading-log-line--active' : ''}`}
              style={{
                color: i === lineIndex ? theme.colors.primary : theme.colors.textDimmer,
              }}
            >
              <span style={{ color: theme.colors.textDimmer, marginRight: 8 }}>
                {String(i).padStart(2, '0')}&gt;
              </span>
              {line}
              {i === lineIndex && <span className="loading-cursor" style={{ background: theme.colors.primary }} />}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="loading-progress-wrap" style={{ borderColor: theme.colors.borderPrimary }}>
          <div
            className="loading-progress-fill"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: `linear-gradient(90deg, ${theme.colors.primaryDim}, ${theme.colors.primary})`,
              boxShadow: `0 0 12px ${theme.colors.primary}88`,
            }}
          />
        </div>

        <div
          className="loading-pct"
          style={{ color: theme.colors.textDim, fontFamily: theme.fontMono }}
        >
          {Math.min(Math.floor(progress), 100).toString().padStart(3, '0')}%
        </div>
      </div>
    </div>
  );
}
