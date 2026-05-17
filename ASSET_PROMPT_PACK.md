# Space Dungeon Asset Prompt Pack

A reusable prompt pack for generating the first cohesive art layer for the dungeon interface.

## Style Direction
- crisp high-res 2D sci-fi control game UI
- retro-futuristic but clean, not chunky retro pixel art
- dark metallic materials, soft cyan glow, amber warning accents
- space station / dungeon control room vibe
- readable shapes, low clutter, no text baked into the art

## Shared Negative Prompt
`text, watermark, logo, signature, blurry, muddy details, low contrast, deformed perspective, extra limbs, cropped subject, noisy background, oversaturated rainbow colors, medieval fantasy props, steampunk gears, cartoon childish style`

## 1) Main Background / Scene Plate
**Prompt A**
`top-down sci-fi dungeon command chamber floating in deep space, dark metallic floor panels, glowing cyan conduits, amber warning lights, reactor haze, clean high-res 2D game environment art, cinematic soft rim lighting, strong readable shapes, negative space for UI overlays, retro-futuristic control game, 16:9`

**Prompt B**
`space dungeon operations deck seen from slightly elevated top-down view, black steel walkways, illuminated floor grates, faint holographic reflections, subtle nebula outside, crisp digital illustration for game interface background, moody lighting, restrained cyan and amber palette, low clutter, 16:9`

**Prompt C**
`dark orbital dungeon interior, command hall with glowing terminals and sealed chamber doors, smooth 2D game art, sharp silhouettes, soft atmospheric fog, high readability, premium sci-fi strategy game background, blue-black palette with small amber highlights, 16:9`

Usage: use as the overall map/background mood plate or as inspiration for tile paintovers.

## 2) Window Frame Variants (9-slice friendly)
**Prompt A**
`futuristic terminal window frame, front-facing UI panel shell, dark gunmetal metal, cyan emissive edge lights, modular corners, clean center opening for content, game HUD frame, minimal ornament, high-res 2D interface asset, transparent background, 4:3`

**Prompt B**
`space dungeon control panel frame, industrial sci-fi border, sharp mechanical corners, amber warning indicators, subtle scanline glass inset, premium strategy game UI asset, symmetrical composition, transparent background, 4:3`

**Prompt C**
`retro-futuristic holographic terminal frame, dark steel and smoked glass, glowing corner brackets, layered depth, readable interior space for chat and logs, clean high-res 2D UI skin, transparent background, 4:3`

Usage: generate several frames, then crop into corners/edges for reusable CSS or 9-slice treatment.

## 3) Holographic / CRT Overlay
**Prompt A**
`subtle holographic overlay texture, faint scanlines, soft screen bloom, tiny interface noise, premium sci-fi game UI layer, transparent background, minimal visual noise, 16:9`

**Prompt B**
`CRT scanline glass overlay for futuristic terminal, faint horizontal lines, subtle dust and reflection, clean readable transparency, high-res game UI texture, transparent background, 16:9`

**Prompt C**
`smoked holographic interface veil, gentle cyan bloom, sparse digital noise, premium monitor overlay texture, transparent background, 16:9`

Usage: blend lightly over windows or entire HUD; keep subtle.

## 4) Resource Icons
Create each icon as a separate run with the same house style.

**Power / Energy**
`minimalist sci-fi power icon, glowing cyan reactor bolt inside hexagonal frame, clean high-res 2D game HUD icon, dark transparent background, sharp readable silhouette, square`

**Minions / Crew**
`minimalist crew icon for sci-fi dungeon game, three stylized operator silhouettes with subtle goggles motif, amber-cyan glow, premium HUD icon, transparent background, square`

**Credits / Metal**
`minimalist resource currency icon, stacked metallic ingots and digital credit chip hybrid, clean futuristic HUD symbol, cyan edge light with amber accent, transparent background, square`

Usage: keep icons simple enough to read at 20-32px.

## 5) Core Tile Set
**Floor Tile**
`top-down sci-fi floor tile, dark metal plating, subtle panel seams, cyan embedded light strips, premium game environment tile, clean edges, high-res 2D, square`

**Wall Tile**
`top-down sci-fi wall tile, reinforced black steel bulkhead, glowing edge strips, readable shadow depth, premium strategy game tile art, square`

**Airlock / Door**
`top-down sci-fi airlock door tile, sealed mechanical hatch with cyan status lights and amber hazard markings, clean readable game asset, square`

Usage: target a smooth non-blocky style; can be downscaled if needed.

## 6) Portrait / Character Cards
**Grim Portrait**
`commanding dragon dungeon master avatar for sci-fi control game, dark theatrical presence, glowing eyes, tech-arcane command chamber aesthetic, clean high-res 2D portrait, transparent background, bust shot`

**Overlord Portrait**
`mysterious overlord command portrait for a sci-fi dungeon management game, regal but shadowed, premium digital illustration, dark metallic and neon interface palette, transparent background, bust shot`

**Minion Variant**
`despicable-me-inspired minion-like operator in space technician gear, goggles, blue utility suit, cute but competent, clean high-res 2D game portrait, transparent background, bust shot`

Usage: these should support room windows, left bar cards, and future dialogs.

## Suggested Aspect Ratios / Sizes
- Backgrounds: 16:9 at high resolution
- Window frames: 4:3 or square source, transparent background
- Icons: 1:1
- Tiles: 1:1
- Portraits: 3:4 or bust-crop portrait

## Recommended First Generation Order
1. Window frame variants
2. Resource icons
3. Holographic overlay
4. Main background
5. Floor / wall / airlock tiles
6. Portraits

## Notes
- Keep text out of the art.
- Prefer clean silhouettes over extra greeble.
- If outputs get too busy, add: `minimal clutter, readable negative space, game UI readability`.
- If outputs get too childish, add: `premium strategy game art, industrial realism, restrained palette`.
