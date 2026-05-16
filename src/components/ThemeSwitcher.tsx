import { useState } from 'react';
import { useTheme } from '../ThemeContext';

// ─── Theme Switcher UI ────────────────────────────────────────────────────────
// A compact button row that lets users switch themes live.

const THEME_ICONS: Record<string, string> = {
  cyberpunk: '🤖',
  hellfire: '🔥',
  arctic: '❄️',
  deepspace: '🌌',
  toxic: '☢️',
};

export function ThemeSwitcher() {
  const { theme, themes, setTheme } = useTheme();
  const [flashing, setFlashing] = useState(false);

  function handleSwitch(id: string) {
    if (id === theme.id) return;
    // Trigger fade-flash transition
    setFlashing(true);
    setTimeout(() => {
      setTheme(id);
      // Keep flash overlay a bit longer then fade out
      setTimeout(() => setFlashing(false), 180);
    }, 80);
  }

  return (
    <>
      {/* Fade/flash overlay when switching themes */}
      {flashing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: theme.colors.primary,
            opacity: 0.12,
            pointerEvents: 'none',
            zIndex: 9999,
            animation: 'theme-flash 0.26s ease-out forwards',
          }}
        />
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 6px',
          background: 'rgba(0,0,0,0.4)',
          border: `1px solid ${theme.colors.borderPrimary}`,
          borderRadius: 3,
        }}
      >
        <span
          style={{
            fontSize: 7,
            color: theme.colors.textDim,
            letterSpacing: '0.1em',
            marginRight: 4,
            flexShrink: 0,
          }}
        >
          SKIN
        </span>
        {themes.map((t) => {
          const isActive = t.id === theme.id;
          return (
            <button
              key={t.id}
              title={t.name}
              onClick={() => handleSwitch(t.id)}
              style={{
                background: isActive
                  ? `rgba(${hexCssToRgbStr(t.colors.primary)}, 0.2)`
                  : 'rgba(0,0,0,0.3)',
                border: `1px solid ${isActive ? t.colors.primary : 'rgba(128,128,128,0.3)'}`,
                borderRadius: 2,
                color: isActive ? '#fff' : 'rgba(200,200,200,0.5)',
                cursor: 'pointer',
                fontSize: 13,
                padding: '2px 5px',
                lineHeight: 1,
                transition: 'all 0.2s ease',
                boxShadow: isActive
                  ? `0 0 8px rgba(${hexCssToRgbStr(t.colors.primary)}, 0.4)`
                  : 'none',
              }}
            >
              {THEME_ICONS[t.id] ?? '🎨'}
            </button>
          );
        })}
      </div>

      {/* Keyframe for the flash animation — injected once */}
      <style>{`
        @keyframes theme-flash {
          0%   { opacity: 0.12; }
          40%  { opacity: 0.18; }
          100% { opacity: 0; }
        }
      `}</style>
    </>
  );
}

function hexCssToRgbStr(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0,245,255';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
