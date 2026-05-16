import { useTheme } from '../ThemeContext';

// ─── Theme Switcher UI ────────────────────────────────────────────────────────
// A compact button row that lets users switch themes live.

const THEME_ICONS: Record<string, string> = {
  cyberpunk: '🤖',
  hellfire: '🔥',
  arctic: '❄️',
};

export function ThemeSwitcher() {
  const { theme, themes, setTheme } = useTheme();

  return (
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
            onClick={() => setTheme(t.id)}
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
  );
}

function hexCssToRgbStr(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0,245,255';
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}
