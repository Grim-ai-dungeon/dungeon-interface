// ─── Dungeon Interface — Theme Definitions ───────────────────────────────────
//
// Each theme overrides CSS custom properties on :root.
// Add `--torch-rgb` (space-separated R G B) so rgb(var(--torch-rgb) / alpha)
// works in CSS for semi-transparent torch-colored borders and glows.

export type ThemeId = 'dungeon' | 'cyberpunk' | 'hellfire' | 'arctic';

export interface Theme {
  id: ThemeId;
  label: string;
  emoji: string;
  /** Maps CSS custom property names → values */
  vars: Record<string, string>;
}

export const THEMES: Theme[] = [
  // ── 1. DUNGEON (default) ────────────────────────────────────────────────────
  {
    id: 'dungeon',
    label: 'DUNGEON',
    emoji: '🏰',
    vars: {
      '--parchment':   '#F5E6D3',
      '--parchment-d': '#c8b090',
      '--torch':       '#FF9933',
      '--torch-glow':  '#FFB366',
      '--torch-rgb':   '255 153 51',
      '--gold':        '#FFD700',
      '--gold-dim':    '#b8960a',
      '--stone-dark':  '#1a140a',
      '--stone-mid':   '#2a2010',
      '--panel-bg':    '#1a1410',
      '--panel-bd':    'rgb(255 153 51 / 0.25)',
      '--wall':        '#3a3a3a',
      '--floor':       '#8B7355',
      '--green':       '#44ff88',
      '--red':         '#CC3333',
      '--blue':        '#99CCFF',
      '--font-title':  "'Georgia', 'Times New Roman', serif",
      '--font-mono':   "'Courier New', 'Lucida Console', monospace",
    },
  },

  // ── 2. CYBERPUNK ─────────────────────────────────────────────────────────────
  // Deep grid void, terminal green text, neon cyan accents, laser-pink danger.
  {
    id: 'cyberpunk',
    label: 'CYBERPUNK',
    emoji: '🤖',
    vars: {
      '--parchment':   '#00FF41',
      '--parchment-d': '#00AA2B',
      '--torch':       '#00FFFF',
      '--torch-glow':  '#66FFFF',
      '--torch-rgb':   '0 255 255',
      '--gold':        '#00FF41',
      '--gold-dim':    '#008A23',
      '--stone-dark':  '#0F0F1B',
      '--stone-mid':   '#1A1A2E',
      '--panel-bg':    '#0A0A14',
      '--panel-bd':    'rgb(0 255 255 / 0.25)',
      '--wall':        '#2A2A4A',
      '--floor':       '#1A1A3E',
      '--green':       '#00FF41',
      '--red':         '#FF003C',
      '--blue':        '#00FFFF',
      '--font-title':  "'Courier New', 'Lucida Console', monospace",
      '--font-mono':   "'Courier New', 'Lucida Console', monospace",
    },
  },

  // ── 3. HELLFIRE ──────────────────────────────────────────────────────────────
  // Abyssal dark, lava reds, ember orange accents. Oppressive and hot.
  {
    id: 'hellfire',
    label: 'HELLFIRE',
    emoji: '🔥',
    vars: {
      '--parchment':   '#E8D5C4',
      '--parchment-d': '#B8956A',
      '--torch':       '#FF4400',
      '--torch-glow':  '#FF6B00',
      '--torch-rgb':   '255 68 0',
      '--gold':        '#FFD600',
      '--gold-dim':    '#A87F00',
      '--stone-dark':  '#0D0202',
      '--stone-mid':   '#2A0404',
      '--panel-bg':    '#180202',
      '--panel-bd':    'rgb(255 68 0 / 0.3)',
      '--wall':        '#4A1010',
      '--floor':       '#3D0808',
      '--green':       '#FF6B00',
      '--red':         '#D92525',
      '--blue':        '#FF9933',
      '--font-title':  "'Georgia', 'Times New Roman', serif",
      '--font-mono':   "'Courier New', 'Lucida Console', monospace",
    },
  },

  // ── 4. ARCTIC FORTRESS ───────────────────────────────────────────────────────
  // Deep freeze, steel ice panels, glacier blue accents. Cold and precise.
  {
    id: 'arctic',
    label: 'ARCTIC',
    emoji: '❄️',
    vars: {
      '--parchment':   '#E0F0FF',
      '--parchment-d': '#A0C8E8',
      '--torch':       '#4A90E2',
      '--torch-glow':  '#A0D2EB',
      '--torch-rgb':   '74 144 226',
      '--gold':        '#A0D2EB',
      '--gold-dim':    '#4A90E2',
      '--stone-dark':  '#000B18',
      '--stone-mid':   '#102B3F',
      '--panel-bg':    '#051220',
      '--panel-bd':    'rgb(74 144 226 / 0.3)',
      '--wall':        '#1A4A6E',
      '--floor':       '#0A2040',
      '--green':       '#4AFFC8',
      '--red':         '#E24A4A',
      '--blue':        '#A0D2EB',
      '--font-title':  "'Georgia', 'Times New Roman', serif",
      '--font-mono':   "'Courier New', 'Lucida Console', monospace",
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'dungeon';

/** Apply a theme's CSS variables to :root (document.documentElement). */
export function applyTheme(id: ThemeId): void {
  const theme = THEMES.find(t => t.id === id);
  if (!theme) return;
  const root = document.documentElement;
  for (const [prop, value] of Object.entries(theme.vars)) {
    root.style.setProperty(prop, value);
  }
  root.setAttribute('data-theme', id);
}
