// ─── Theme Type Definitions ───────────────────────────────────────────────────

export interface ThemeColors {
  // Base backgrounds
  bgDeep: string;        // deepest background
  bgPanel: string;       // panel backgrounds
  bgCard: string;        // card backgrounds

  // Primary accent
  primary: string;       // main accent (was cyan)
  primaryDim: string;    // dimmed accent
  primaryDark: string;   // dark accent for fills

  // Secondary / Gold
  secondary: string;     // secondary accent (was gold)
  secondaryDim: string;  // dimmed secondary

  // Status colors
  statusGreen: string;   // active/success
  statusGreenDim: string;
  statusBlue: string;    // info
  statusBlueDim: string;
  statusPurple: string;  // magic/special
  statusPurpleDim: string;
  statusRed: string;     // error/danger
  statusOrange: string;  // warning/offline

  // Borders
  borderPrimary: string;   // rgba border using primary
  borderSecondary: string; // rgba border using secondary

  // Text
  textPrimary: string;   // main text color
  textDim: string;       // dimmed text
  textDimmer: string;    // very dim text
}

export interface ThemePixi {
  // PixiJS hex color values (0xRRGGBB)
  bgColor: number;           // canvas background
  gridColor: number;         // grid lines
  gridAlpha: number;         // grid line alpha
  connColor: number;         // connection line color
  connCoreColor: number;     // connection core line
  floorFill: number;         // iso floor tile fill
  floorBorder: number;       // iso floor tile border
  scanLineColor: number;     // scan line sweeper

  // Packet colors
  packetColors: number[];

  // Room base colors & glow colors per room id
  rooms: Record<string, {
    color: number;           // room block fill
    glowColor: number;       // room glow / border
  }>;
}

export interface Theme {
  id: string;
  name: string;
  description: string;

  // Font families
  fontTitle: string;
  fontMono: string;

  // CSS color values
  colors: ThemeColors;

  // PixiJS-specific colors
  pixi: ThemePixi;

  // Visual style options
  glowIntensity: number;    // multiplier for glow effects (0.5 = subtle, 1 = normal, 1.5 = intense)
  scanLineStyle: 'subtle' | 'normal' | 'heavy' | 'none';
  headerEmoji: string;      // main header icon
}
