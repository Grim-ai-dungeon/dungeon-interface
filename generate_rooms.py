#!/usr/bin/env python3
"""
Dungeon Interface - Premium Room Background Generator
Generates high-quality sci-fi dungeon room art for each agent's space.
Uses rich details: floors, walls, furniture props, lighting glows, tech elements.
"""

from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import math
import random
import os

W, H = 800, 600
OUTPUT_DIR = "public/assets/rooms"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def lerp_color(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))

def add_color(c, delta):
    return tuple(clamp(c[i] + delta) for i in range(3))

def alpha_blend(base, overlay, alpha):
    return tuple(clamp(base[i] * (1 - alpha) + overlay[i] * alpha) for i in range(3))

def draw_glow(img, x, y, radius, color, intensity=0.8, falloff=2.0):
    """Draw a soft radial glow at position."""
    draw_data = img.load()
    iw, ih = img.size
    for dy in range(-radius, radius+1):
        for dx in range(-radius, radius+1):
            px, py = x + dx, y + dy
            if 0 <= px < iw and 0 <= py < ih:
                dist = math.sqrt(dx*dx + dy*dy)
                if dist < radius:
                    t = (1.0 - dist/radius) ** falloff * intensity
                    existing = draw_data[px, py]
                    blended = tuple(clamp(existing[i] + color[i] * t) for i in range(3))
                    if len(existing) == 4:
                        draw_data[px, py] = blended + (existing[3],)
                    else:
                        draw_data[px, py] = blended

def draw_neon_line(draw, x1, y1, x2, y2, color, width=2, glow_passes=3):
    """Draw a neon glowing line."""
    for g in range(glow_passes, 0, -1):
        alpha = int(60 / g)
        glow_color = color + (alpha,)
        draw.line([(x1, y1), (x2, y2)], fill=glow_color, width=width + g*3)
    draw.line([(x1, y1), (x2, y2)], fill=color + (255,), width=width)

def draw_hex_floor(draw, img, cx, cy, size, color_base, accent_color, count=15):
    """Draw a hexagonal floor grid pattern."""
    hex_w = size * math.sqrt(3)
    hex_h = size * 2
    row_h = hex_h * 0.75

    rows = int(H / row_h) + 3
    cols = int(W / hex_w) + 3

    for r in range(-1, rows):
        for c in range(-1, cols):
            x = c * hex_w + (r % 2) * (hex_w / 2)
            y = r * row_h
            
            # Perspective fade - darken toward edges
            fade = 1.0 - abs(x - cx) / (W * 0.7) - abs(y - cy) / (H * 0.7)
            fade = max(0.1, fade)
            
            # Floor tile base
            shade_r = random.randint(-15, 15)
            tile_color = tuple(clamp(color_base[i] + shade_r) for i in range(3))
            tile_color = tuple(clamp(int(tile_color[i] * fade)) for i in range(3))

            # Draw hex
            points = []
            for angle_deg in range(0, 360, 60):
                angle_rad = math.radians(angle_deg + 30)
                hx = x + size * math.cos(angle_rad)
                hy = y + size * math.sin(angle_rad)
                points.append((hx, hy))
            
            draw.polygon(points, fill=tile_color + (255,))
            
            # Glowing edge on some tiles
            if random.random() < 0.05:
                draw.polygon(points, outline=accent_color + (80,))
            else:
                draw.polygon(points, outline=tuple(clamp(tile_color[i] - 20) for i in range(3)) + (180,))

def draw_tech_floor(draw, img, color_base, line_color, panel_size=60):
    """Draw a sci-fi tech panel floor."""
    # Base floor fill
    draw.rectangle([0, H//3, W, H], fill=color_base + (255,))
    
    # Panel grid lines
    for x in range(0, W, panel_size):
        for i in range(3):
            alpha = [255, 120, 40][i]
            offset = [0, -1, 1][i]
            draw.line([(x+offset, H//3), (x+offset, H)], fill=line_color + (alpha,), width=1)
    
    for y in range(H//3, H, panel_size):
        for i in range(3):
            alpha = [255, 120, 40][i]
            offset = [0, -1, 1][i]
            draw.line([(0, y+offset), (W, y+offset)], fill=line_color + (alpha,), width=1)
    
    # Random panel accent markings
    for _ in range(30):
        px = random.randint(0, W//panel_size - 1) * panel_size + 5
        py = random.randint(H//3//panel_size, H//panel_size - 1) * panel_size + 5
        pw = random.randint(10, panel_size-10)
        ph = random.randint(5, 20)
        accent_alpha = random.randint(40, 100)
        draw.rectangle([px, py, px+pw, py+ph], fill=line_color + (accent_alpha,))

def draw_wall_with_panels(draw, img, wall_color, accent, y_top=0, y_bottom=None):
    """Draw a detailed sci-fi wall with panels and tech elements."""
    if y_bottom is None:
        y_bottom = H // 2
    
    # Base wall
    draw.rectangle([0, y_top, W, y_bottom], fill=wall_color + (255,))
    
    # Horizontal panel lines
    panel_h = 80
    for y in range(y_top, y_bottom, panel_h):
        draw.line([(0, y+panel_h), (W, y+panel_h)], fill=tuple(clamp(wall_color[i]-30) for i in range(3)) + (200,), width=2)
    
    # Vertical panel segments
    seg_w = 120
    for x in range(0, W, seg_w):
        draw.line([(x, y_top), (x, y_bottom)], fill=tuple(clamp(wall_color[i]-20) for i in range(3)) + (150,), width=1)
        
        # Panel inset shadow
        if x + seg_w < W:
            draw.rectangle([x+4, y_top+4, x+seg_w-4, y_bottom-4], 
                          outline=tuple(clamp(wall_color[i]-40) for i in range(3)) + (80,))
    
    # Tech strips
    strip_y = y_top + (y_bottom - y_top) // 3
    for i in range(3):
        alpha = [255, 150, 60][i]
        width_offset = [0, 4, 8][i]
        draw.line([(0, strip_y + width_offset//2), (W, strip_y + width_offset//2)], 
                  fill=accent + (alpha,), width=max(1, 3-i))
    
    # Vent/detail elements
    for vx in range(60, W-60, 200):
        vy = y_top + (y_bottom - y_top) // 2
        # Vent slots
        for slot in range(5):
            draw.rectangle([vx+slot*8, vy-12, vx+slot*8+5, vy+12],
                          fill=tuple(clamp(wall_color[i]-50) for i in range(3)) + (200,))

def draw_monitor(draw, img, x, y, w, h, screen_color, content_type='data'):
    """Draw a computer monitor/screen prop."""
    # Monitor frame
    frame_color = (30, 35, 45)
    draw.rectangle([x, y, x+w, y+h], fill=frame_color + (255,))
    draw.rectangle([x+1, y+1, x+w-1, y+h-1], outline=(60, 70, 90) + (255,), width=2)
    
    # Screen bezel
    bezel = 6
    draw.rectangle([x+bezel, y+bezel, x+w-bezel, y+h-bezel], 
                   fill=tuple(clamp(screen_color[i]//4) for i in range(3)) + (255,))
    
    # Screen content glow
    screen_rect = [x+bezel+2, y+bezel+2, x+w-bezel-2, y+h-bezel-2]
    draw.rectangle(screen_rect, fill=screen_color + (180,))
    
    # Scan lines
    for sy in range(screen_rect[1], screen_rect[3], 4):
        draw.line([(screen_rect[0], sy), (screen_rect[2], sy)], 
                  fill=tuple(clamp(screen_color[i]//2) for i in range(3)) + (120,), width=1)
    
    # Data content
    if content_type == 'data':
        for row in range(4):
            line_y = screen_rect[1] + 8 + row * 12
            line_w = random.randint(20, screen_rect[2] - screen_rect[0] - 10)
            draw.rectangle([screen_rect[0]+5, line_y, screen_rect[0]+5+line_w, line_y+4],
                          fill=screen_color + (200,))
    elif content_type == 'chart':
        for bar in range(5):
            bx = screen_rect[0] + 5 + bar * ((screen_rect[2]-screen_rect[0]-10)//5)
            bh = random.randint(10, screen_rect[3]-screen_rect[1]-15)
            draw.rectangle([bx, screen_rect[3]-bh-5, bx+8, screen_rect[3]-5],
                          fill=screen_color + (220,))
    
    # Monitor base/stand
    mid_x = x + w//2
    draw.rectangle([mid_x-8, y+h, mid_x+8, y+h+8], fill=(25, 28, 35) + (255,))
    draw.rectangle([mid_x-15, y+h+8, mid_x+15, y+h+12], fill=(25, 28, 35) + (255,))

def draw_bookshelf(draw, x, y, w, h, wood_color, book_colors):
    """Draw a bookshelf with books."""
    # Shelf frame
    draw.rectangle([x, y, x+w, y+h], fill=wood_color + (255,))
    
    # Shelves
    shelf_count = 4
    shelf_h = h // shelf_count
    for s in range(shelf_count):
        sy = y + s * shelf_h
        # Shelf board
        draw.rectangle([x+3, sy+shelf_h-8, x+w-3, sy+shelf_h-4], fill=add_color(wood_color, -30) + (255,))
        
        # Books on shelf
        book_x = x + 5
        while book_x < x + w - 15:
            book_w = random.randint(8, 18)
            book_h = random.randint(shelf_h//2, shelf_h-10)
            bcolor = random.choice(book_colors)
            draw.rectangle([book_x, sy+shelf_h-8-book_h, book_x+book_w, sy+shelf_h-8],
                          fill=bcolor + (255,))
            # Book spine detail
            draw.line([(book_x, sy+shelf_h-8-book_h+3), (book_x+book_w, sy+shelf_h-8-book_h+3)],
                     fill=add_color(bcolor, -40) + (200,), width=1)
            book_x += book_w + 2

def draw_crystal(draw, img, cx, cy, size, color, glow_intensity=0.7):
    """Draw a glowing crystal prop."""
    # Crystal shape (octagon-ish)
    points = []
    for i in range(8):
        angle = math.pi / 4 * i + math.pi / 8
        vary = size * (0.7 + 0.3 * ((i % 3) / 3))
        points.append((cx + vary * math.cos(angle), cy + vary * math.sin(angle)))
    
    draw.polygon(points, fill=tuple(clamp(color[i]//2) for i in range(3)) + (220,))
    draw.polygon(points, outline=color + (255,), width=2)
    
    # Inner facet
    inner = [(cx + (size*0.5) * math.cos(math.pi/4*i), cy + (size*0.5) * math.sin(math.pi/4*i)) for i in range(8)]
    draw.polygon(inner, fill=color + (150,))
    
    # Glow on image
    draw_glow(img, cx, cy, int(size * 2.5), color, glow_intensity)

def draw_pipe(draw, x1, y1, x2, y2, radius, color, glow_color=None):
    """Draw a pipe/cable."""
    # Main pipe
    draw.line([(x1, y1), (x2, y2)], fill=color + (255,), width=radius*2)
    # Highlight
    draw.line([(x1, y1), (x2, y2)], fill=add_color(color, 40) + (150,), width=max(1, radius))
    # Bands
    dist = math.sqrt((x2-x1)**2 + (y2-y1)**2)
    steps = int(dist / 40)
    for i in range(1, steps):
        t = i / steps
        bx = int(x1 + (x2-x1)*t)
        by = int(y1 + (y2-y1)*t)
        draw.line([(bx-3, by-3), (bx+3, by+3)], fill=add_color(color, -30) + (255,), width=radius*2+2)

def apply_vignette(draw, w, h, color=(0,0,0), strength=0.7):
    """Apply edge vignette darkening."""
    for layer in range(5):
        margin = int(w * 0.15 * (layer + 1) / 5)
        alpha = int(80 * strength * (layer + 1) / 5)
        # Top
        draw.rectangle([0, 0, w, margin], fill=color + (alpha,))
        # Bottom  
        draw.rectangle([0, h-margin, w, h], fill=color + (alpha,))
        # Left
        draw.rectangle([0, 0, margin, h], fill=color + (alpha,))
        # Right
        draw.rectangle([w-margin, 0, w, h], fill=color + (alpha,))

# ─────────────────────────────────────────────────────────────────────────────
# ROOM 1: GRIM'S CHAMBER — Dark throne room, command center, dragon aesthetic
# ─────────────────────────────────────────────────────────────────────────────
def generate_grim_chamber():
    img = Image.new('RGBA', (W, H), (5, 3, 15, 255))
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Deep void background
    for y in range(H):
        t = y / H
        c = tuple(clamp(int(v)) for v in [
            lerp_color((5, 2, 15), (20, 8, 35), t)[i] for i in range(3)
        ])
        draw.line([(0, y), (W, y)], fill=c + (255,))
    
    # Stone/obsidian floor pattern
    floor_y = H // 3
    floor_base = (15, 10, 25)
    floor_accent = (50, 30, 80)
    
    # Large stone tiles
    tile_size = 80
    for ty in range(floor_y, H, tile_size//2):
        for tx in range(0, W, tile_size):
            t_depth = (ty - floor_y) / (H - floor_y)
            shade = tuple(clamp(int(floor_base[i] + t_depth * 15 + random.randint(-5, 5))) for i in range(3))
            draw.rectangle([tx+2, ty+2, tx+tile_size-2, ty+tile_size//2-2], fill=shade + (255,))
            # Grout lines
            draw.line([(tx, ty), (tx+tile_size, ty)], fill=(8, 5, 18) + (220,), width=2)
            draw.line([(tx, ty), (tx, ty+tile_size//2)], fill=(8, 5, 18) + (220,), width=2)
    
    # Magma/lava cracks in floor
    rng = random.Random(42)
    for _ in range(8):
        x1 = rng.randint(50, W-50)
        y1 = rng.randint(floor_y + 20, H - 20)
        for seg in range(6):
            x2 = x1 + rng.randint(-30, 30)
            y2 = y1 + rng.randint(-10, 20)
            # Crack glow
            draw.line([(x1, y1), (x2, y2)], fill=(255, 100, 20) + (60,), width=6)
            draw.line([(x1, y1), (x2, y2)], fill=(255, 160, 50) + (120,), width=3)
            draw.line([(x1, y1), (x2, y2)], fill=(255, 220, 80) + (200,), width=1)
            x1, y1 = x2, y2
    
    # Back wall — dark stone with carved runes
    wall_color = (12, 8, 25)
    draw.rectangle([0, 0, W, floor_y], fill=wall_color + (255,))
    
    # Wall pillar details
    for px in [W//6, W//3, W//2, 2*W//3, 5*W//6]:
        # Pillar body
        draw.rectangle([px-15, 0, px+15, floor_y], fill=(20, 14, 38) + (255,))
        draw.rectangle([px-12, 0, px+12, floor_y], fill=(25, 18, 45) + (255,))
        # Glowing rune on pillar
        ry = floor_y // 2
        draw_glow(img, px, ry, 25, (180, 80, 255), 0.4)
        # Rune symbol (simplified)
        draw.ellipse([px-8, ry-8, px+8, ry+8], outline=(180, 80, 255) + (200,), width=2)
        draw.line([(px, ry-8), (px, ry+8)], fill=(180, 80, 255) + (200,), width=2)
    
    # Throne area - center back
    throne_cx = W // 2
    throne_y = floor_y - 60
    
    # Throne base
    draw.rectangle([throne_cx-60, floor_y-10, throne_cx+60, floor_y+5], fill=(25, 18, 50) + (255,))
    draw.rectangle([throne_cx-50, floor_y-70, throne_cx+50, floor_y-10], fill=(30, 22, 55) + (255,))
    # Throne back
    draw.rectangle([throne_cx-45, floor_y-130, throne_cx+45, floor_y-70], fill=(35, 26, 60) + (255,))
    # Throne top spikes
    for sx in range(throne_cx-40, throne_cx+45, 20):
        draw.polygon([(sx, floor_y-130), (sx+10, floor_y-130), (sx+5, floor_y-150)],
                    fill=(45, 35, 75) + (255,))
    # Purple energy throne glow
    draw_glow(img, throne_cx, floor_y - 90, 80, (150, 50, 220), 0.5)
    
    # Dragon skull decoration on throne
    skull_cx, skull_cy = throne_cx, floor_y - 120
    draw.ellipse([skull_cx-20, skull_cy-15, skull_cx+20, skull_cy+10], fill=(35, 28, 55) + (255,))
    # Eye sockets
    draw_glow(img, skull_cx-8, skull_cy-5, 8, (255, 100, 0), 0.8)
    draw_glow(img, skull_cx+8, skull_cy-5, 8, (255, 100, 0), 0.8)
    
    # Side torches
    for torch_x in [80, W-80]:
        torch_y = floor_y - 40
        # Wall bracket
        draw.rectangle([torch_x-5, torch_y-5, torch_x+5, torch_y+15], fill=(40, 35, 55) + (255,))
        # Flame glow
        draw_glow(img, torch_x, torch_y - 10, 50, (255, 120, 30), 0.9)
        draw_glow(img, torch_x, torch_y - 10, 20, (255, 200, 80), 1.2)
    
    # Command console in corner
    console_x, console_y = 100, floor_y + 30
    draw.rectangle([console_x, console_y, console_x+120, console_y+80], fill=(18, 12, 35) + (255,))
    draw_monitor(draw, img, console_x+10, console_y+5, 100, 60, (160, 80, 255), 'data')
    
    # Dragon banner art (simplified)
    for bx in [W//4, 3*W//4]:
        banner_y = 20
        draw.rectangle([bx-15, banner_y, bx+15, banner_y+80], fill=(60, 20, 100) + (220,))
        draw.polygon([(bx-15, banner_y+80), (bx, banner_y+95), (bx+15, banner_y+80)],
                    fill=(60, 20, 100) + (220,))
        # Dragon symbol
        draw.ellipse([bx-8, banner_y+20, bx+8, banner_y+36], outline=(255, 167, 0) + (200,), width=2)
        draw.line([(bx, banner_y+36), (bx-6, banner_y+55)], fill=(255, 167, 0) + (200,), width=2)
        draw.line([(bx, banner_y+36), (bx+6, banner_y+55)], fill=(255, 167, 0) + (200,), width=2)
    
    # Atmospheric purple/gold ambient glow
    draw_glow(img, W//2, floor_y, 200, (100, 40, 180), 0.3)
    draw_glow(img, W//2, H, 300, (50, 20, 90), 0.25)
    
    # Vignette
    apply_vignette(draw, W, H, (0, 0, 5), 0.8)
    
    # Final darkening pass
    enhancer = ImageEnhance.Brightness(img.convert('RGB'))
    result = enhancer.enhance(1.05)
    result = result.convert('RGBA')
    
    return result


# ─────────────────────────────────────────────────────────────────────────────
# ROOM 2: BOB'S LIBRARY — Ancient knowledge vault, glowing tomes, arcane tech
# ─────────────────────────────────────────────────────────────────────────────
def generate_bob_library():
    img = Image.new('RGBA', (W, H), (5, 8, 20, 255))
    draw = ImageDraw.Draw(img, 'RGBA')
    
    # Deep blue atmosphere
    for y in range(H):
        t = y / H
        c = lerp_color((4, 8, 22), (12, 20, 40), t)
        draw.line([(0, y), (W, y)], fill=c + (255,))
    
    floor_y = H // 3
    
    # Ancient wood floor
    floor_base = (25, 15, 8)
    for ty in range(floor_y, H, 20):
        for tx in range(0, W, 120):
            depth_t = (ty - floor_y) / (H - floor_y)
            shade = tuple(clamp(int(floor_base[i] + depth_t * 12 + random.randint(-4, 4))) for i in range(3))
            draw.rectangle([tx+1, ty+1, tx+119, ty+19], fill=shade + (255,))
            # Wood grain
            for gx in range(tx+10, tx+110, 15):
                draw.line([(gx, ty), (gx+5, ty+19)], fill=add_color(shade, -15) + (100,), width=1)
        draw.line([(0, ty), (W, ty)], fill=(12, 7, 3) + (180,), width=1)
    
    # Stone/wood walls
    wall_color = (18, 22, 38)
    draw.rectangle([0, 0, W, floor_y], fill=wall_color + (255,))
    
    # Back wall stone texture
    for wy in range(0, floor_y, 25):
        for wx in range(0, W, 60):
            shade = tuple(clamp(wall_color[i] + random.randint(-5, 5)) for i in range(3))
            draw.rectangle([wx+2, wy+2, wx+58, wy+23], fill=shade + (255,))
            draw.line([(wx, wy), (wx+60, wy)], fill=(8, 10, 20) + (200,), width=1)
            draw.line([(wx, wy), (wx, wy+25)], fill=(8, 10, 20) + (200,), width=1)
    
    # Massive bookshelves lining the back wall
    shelf_colors = [(30, 20, 12), (25, 15, 8)]
    book_color_pool = [
        (80, 20, 20), (20, 60, 100), (20, 80, 40), (100, 80, 20),
        (70, 30, 90), (20, 70, 90), (90, 50, 20), (40, 40, 70)
    ]
    
    # Left bookshelf
    draw_bookshelf(draw, 20, 10, 160, floor_y - 10, shelf_colors[0], book_color_pool)
    # Right bookshelf
    draw_bookshelf(draw, W-180, 10, 160, floor_y - 10, shelf_colors[0], book_color_pool)
    # Center bookshelf (shorter)
    draw_bookshelf(draw, W//2 - 80, 10, 160, floor_y - 20, shelf_colors[1], book_color_pool)
    
    # Glowing books (special ones)
    for bx, by, gc in [(120, 40, (80, 160, 255)), (W-80, 60, (160, 80, 255)), (W//2, 30, (80, 220, 180))]:
        draw_glow(img, bx, by, 20, gc, 0.6)
    
    # Arcane orb on pedestal (center)
    pedestal_x = W // 2
    pedestal_y = floor_y + 30
    # Pedestal
    draw.rectangle([pedestal_x-20, pedestal_y+20, pedestal_x+20, pedestal_y+60], fill=(30, 25, 45) + (255,))
    draw.rectangle([pedestal_x-30, pedestal_y+55, pedestal_x+30, pedestal_y+65], fill=(35, 28, 50) + (255,))
    # Orb
    draw.ellipse([pedestal_x-30, pedestal_y-10, pedestal_x+30, pedestal_y+50], fill=(10, 20, 60) + (220,))
    draw.ellipse([pedestal_x-28, pedestal_y-8, pedestal_x+28, pedestal_y+48], outline=(100, 150, 255) + (200,), width=2)
    draw_glow(img, pedestal_x, pedestal_y+20, 60, (80, 130, 255), 1.0)
    # Orb inner light
    draw.ellipse([pedestal_x-15, pedestal_y+5, pedestal_x+15, pedestal_y+35], fill=(150, 200, 255) + (180,))
    
    # Study table
    table_x, table_y = 150, floor_y + 40
    draw.rectangle([table_x, table_y+40, table_x+200, table_y+50], fill=(40, 28, 15) + (255,))
    draw.rectangle([table_x+5, table_y, table_x+195, table_y+40], fill=(50, 35, 18) + (255,))
    # Open book on table
    book_cx = table_x + 100
    draw.rectangle([book_cx-40, table_y+5, book_cx+40, table