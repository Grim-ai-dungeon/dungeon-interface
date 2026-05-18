#!/usr/bin/env python3
"""
Generate detailed isometric-style room backgrounds for the dungeon interface.
Each room gets a unique look with detailed furniture, equipment, and atmosphere.
"""

from PIL import Image, ImageDraw, ImageFilter, ImageFont
import math
import random

W, H = 500, 400
OUT_DIR = "/home/ubuntu/.openclaw/workspace/dungeon-interface/public/assets/rooms"

def lerp(a, b, t):
    return a + (b - a) * t

def lerp_color(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))

def darken(c, factor=0.7):
    return tuple(int(x * factor) for x in c[:3])

def lighten(c, amount=30):
    return tuple(min(255, x + amount) for x in c[:3])

def blend(c1, c2, t):
    return lerp_color(c1, c2, t)

# ──────────────────────────────────────────────────────────────────────────────
# Isometric utilities
# ──────────────────────────────────────────────────────────────────────────────

def iso_to_screen(x, y, z, origin_x, origin_y, tile_w=40, tile_h=20, height_scale=30):
    """Convert isometric grid coordinates to screen coordinates."""
    sx = origin_x + (x - y) * tile_w // 2
    sy = origin_y + (x + y) * tile_h // 2 - z * height_scale
    return (sx, sy)

def draw_iso_floor_tile(draw, x, y, origin_x, origin_y, color, tile_w=40, tile_h=20):
    """Draw a single isometric floor tile."""
    # 4 corners of the tile
    tl = iso_to_screen(x,   y,   0, origin_x, origin_y, tile_w, tile_h)
    tr = iso_to_screen(x+1, y,   0, origin_x, origin_y, tile_w, tile_h)
    br = iso_to_screen(x+1, y+1, 0, origin_x, origin_y, tile_w, tile_h)
    bl = iso_to_screen(x,   y+1, 0, origin_x, origin_y, tile_w, tile_h)
    draw.polygon([tl, tr, br, bl], fill=color)
    # Edge highlights
    edge_light = lighten(color, 20)
    edge_dark = darken(color, 0.75)
    draw.line([tl, tr], fill=edge_light, width=1)
    draw.line([tl, bl], fill=edge_light, width=1)
    draw.line([tr, br], fill=edge_dark, width=1)
    draw.line([bl, br], fill=edge_dark, width=1)

def draw_iso_wall_left(draw, x, y, h, origin_x, origin_y, color, tile_w=40, tile_h=20, height_scale=30):
    """Draw a left-facing wall segment."""
    bl = iso_to_screen(x, y+1, 0, origin_x, origin_y, tile_w, tile_h)
    tl = iso_to_screen(x, y+1, h, origin_x, origin_y, tile_w, tile_h)
    tr = iso_to_screen(x, y,   h, origin_x, origin_y, tile_w, tile_h)
    br = iso_to_screen(x, y,   0, origin_x, origin_y, tile_w, tile_h)
    draw.polygon([bl, tl, tr, br], fill=darken(color, 0.65))
    draw.line([tl, tr], fill=lighten(color, 15), width=1)
    draw.line([bl, tl], fill=darken(color, 0.5), width=1)

def draw_iso_wall_right(draw, x, y, h, origin_x, origin_y, color, tile_w=40, tile_h=20, height_scale=30):
    """Draw a right-facing wall segment."""
    bl = iso_to_screen(x+1, y, 0, origin_x, origin_y, tile_w, tile_h)
    tl = iso_to_screen(x+1, y, h, origin_x, origin_y, tile_w, tile_h)
    tr = iso_to_screen(x,   y, h, origin_x, origin_y, tile_w, tile_h)
    br = iso_to_screen(x,   y, 0, origin_x, origin_y, tile_w, tile_h)
    draw.polygon([bl, tl, tr, br], fill=darken(color, 0.8))

def draw_iso_box(draw, x, y, w, d, h, origin_x, origin_y, top_color, tile_w=40, tile_h=20, height_scale=30):
    """Draw an isometric box (furniture piece)."""
    # Top face
    corners_top = [
        iso_to_screen(x,   y,   h, origin_x, origin_y, tile_w, tile_h),
        iso_to_screen(x+w, y,   h, origin_x, origin_y, tile_w, tile_h),
        iso_to_screen(x+w, y+d, h, origin_x, origin_y, tile_w, tile_h),
        iso_to_screen(x,   y+d, h, origin_x, origin_y, tile_w, tile_h),
    ]
    draw.polygon(corners_top, fill=top_color)
    draw.polygon(corners_top, outline=darken(top_color, 0.5), width=1)

    # Left face
    left_face = [
        iso_to_screen(x, y,   0, origin_x, origin_y, tile_w, tile_h),
        iso_to_screen(x, y,   h, origin_x, origin_y, tile_w, tile_h),
        iso_to_screen(x, y+d, h, origin_x, origin_y, tile_w, tile_h),
        iso_to_screen(x, y+d, 0, origin_x, origin_y, tile_w, tile_h),
    ]
    draw.polygon(left_face, fill=darken(top_color, 0.65))

    # Right face
    right_face = [
        iso_to_screen(x+w, y,   0, origin_x, origin_y, tile_w, tile_h),
        iso_to_screen(x+w, y,   h, origin_x, origin_y, tile_w, tile_h),
        iso_to_screen(x,   y,   h, origin_x, origin_y, tile_w, tile_h),
        iso_to_screen(x,   y,   0, origin_x, origin_y, tile_w, tile_h),
    ]
    draw.polygon(right_face, fill=darken(top_color, 0.80))

def glow_dot(draw, x, y, color, radius=8, alpha_max=200):
    """Draw a glowing dot."""
    for r in range(radius, 0, -1):
        alpha = int(alpha_max * (1 - r/radius) ** 1.5)
        r_color = color + (alpha,)
        bbox = [x - r, y - r, x + r, y + r]
        draw.ellipse(bbox, fill=r_color)

# ──────────────────────────────────────────────────────────────────────────────
# Room generators
# ──────────────────────────────────────────────────────────────────────────────

def make_grim_chamber():
    """Dark command center — throne, holo displays, war table, glowing monitors."""
    img = Image.new("RGBA", (W, H), (5, 3, 12, 255))
    draw = ImageDraw.Draw(img)

    # Background gradient — deep black/purple
    for y in range(H):
        t = y / H
        c = lerp_color((12, 5, 25), (3, 1, 8), t)
        draw.line([(0, y), (W, y)], fill=c)

    # Subtle purple nebula bg
    for _ in range(6):
        cx = random.randint(50, W-50)
        cy = random.randint(30, H-100)
        for r in range(80, 0, -5):
            alpha = int(18 * (1 - r/80))
            draw.ellipse([cx-r, cy-r*0.6, cx+r, cy+r*0.6], fill=(60, 0, 120, alpha))

    OX, OY = W//2 + 20, H//2 - 20
    TW, TH, HS = 44, 22, 28

    def s(x, y, z=0):
        return iso_to_screen(x, y, z, OX, OY, TW, TH, HS)

    # Floor — dark obsidian tiles
    floor_colors = [
        (18, 12, 30), (20, 14, 35), (16, 10, 28), (22, 15, 38)
    ]
    for gx in range(8):
        for gy in range(6):
            seed = gx * 17 + gy * 31
            c = floor_colors[(seed) % len(floor_colors)]
            # Rune pattern on center tiles
            if gx in [3,4] and gy in [2,3]:
                c = (25, 10, 50)
            draw_iso_floor_tile(draw, gx, gy, OX, OY, c, TW, TH)

    # Rune glow lines on floor
    p1 = s(3.5, 2.5)
    p2 = s(4.5, 2.5)
    p3 = s(4.5, 3.5)
    p4 = s(3.5, 3.5)
    for i in range(3):
        alpha = 80 - i*25
        draw.polygon([p1,p2,p3,p4], outline=(180, 50, 255, alpha), width=1)
    # Rune circle
    cx2 = (p1[0]+p3[0])//2
    cy2 = (p1[1]+p3[1])//2
    draw.ellipse([cx2-18, cy2-9, cx2+18, cy2+9], outline=(180, 50, 255, 100), width=1)

    # Back walls
    wall_color = (30, 18, 55)
    for gx in range(8):
        draw_iso_wall_left(draw, gx, 0, 3, OX, OY, wall_color, TW, TH, HS)
    for gy in range(6):
        draw_iso_wall_right(draw, 8, gy, 3, OX, OY, wall_color, TW, TH, HS)

    # Holographic monitors on back wall — row of 4 glowing screens
    monitor_positions = [(1, 0), (2, 0), (3, 0), (5, 0), (6, 0)]
    monitor_colors = [
        (0, 200, 255), (255, 50, 100), (0, 255, 150),
        (200, 100, 255), (255, 180, 0)
    ]
    for i, (mx, my) in enumerate(monitor_positions):
        mc = monitor_colors[i % len(monitor_colors)]
        # Monitor box
        draw_iso_box(draw, mx, my, 0.8, 0.1, 1.8, OX, OY, (25, 20, 40), TW, TH, HS)
        # Screen glow
        screen_top = s(mx + 0.4, my + 0.05, 1.8)
        screen_base = s(mx + 0.4, my + 0.05, 0.3)
        for glow_r in range(12, 0, -2):
            alpha = int(80 * (1 - glow_r/12))
            draw.ellipse([screen_top[0]-glow_r*1.5, screen_top[1]-glow_r,
                          screen_top[0]+glow_r*1.5, screen_top[1]+glow_r], fill=mc+(alpha,))
        draw.ellipse([screen_top[0]-5, screen_top[1]-5,
                      screen_top[0]+5, screen_top[1]+5], fill=mc+(200,))

    # War table — center-front
    draw_iso_box(draw, 2.5, 2, 3, 1.5, 0.6, OX, OY, (40, 25, 70), TW, TH, HS)
    # Holographic map on table
    table_top = s(4, 2.75, 0.6)
    for r in range(20, 0, -3):
        alpha = int(60 * (1 - r/20))
        draw.ellipse([table_top[0]-r*2, table_top[1]-r,
                      table_top[0]+r*2, table_top[1]+r], fill=(0, 180, 255, alpha))
    # Map grid lines
    for i in range(5):
        t_ratio = i/4
        map_p1 = s(2.8 + t_ratio*2.4, 2.1, 0.65)
        map_p2 = s(2.8 + t_ratio*2.4, 3.3, 0.65)
        draw.line([map_p1, map_p2], fill=(0, 150, 220, 60), width=1)
        map_h1 = s(2.8, 2.1 + t_ratio*1.2, 0.65)
        map_h2 = s(5.2, 2.1 + t_ratio*1.2, 0.65)
        draw.line([map_h1, map_h2], fill=(0, 150, 220, 60), width=1)

    # Dark Throne — back center
    draw_iso_box(draw, 3.2, 0.3, 1.6, 1.2, 2.5, OX, OY, (35, 15, 60), TW, TH, HS)
    # Throne armrests
    draw_iso_box(draw, 3.1, 0.4, 0.2, 1.0, 2.8, OX, OY, (50, 20, 80), TW, TH, HS)
    draw_iso_box(draw, 4.7, 0.4, 0.2, 1.0, 2.8, OX, OY, (50, 20, 80), TW, TH, HS)
    # Crown spikes on throne
    throne_top = s(4, 0.3, 2.8)
    for i in range(5):
        spike_x = throne_top[0] + (i-2) * 8
        draw.polygon([
            (spike_x, throne_top[1]),
            (spike_x-4, throne_top[1]+8),
            (spike_x+4, throne_top[1]+8)
        ], fill=(255, 200, 0, 180))

    # Glowing red eyes above throne (dragon motif)
    eye_y = throne_top[1] - 20
    for ex in [throne_top[0]-10, throne_top[0]+10]:
        for r in range(8, 0, -1):
            alpha = int(200 * (1-r/8))
            draw.ellipse([ex-r, eye_y-r*0.6, ex+r, eye_y+r*0.6], fill=(255, 30, 30, alpha))
        draw.ellipse([ex-2, eye_y-1, ex+2, eye_y+1], fill=(255, 150, 150, 255))

    # Cable bundles on floor
    for i in range(3):
        p_start = s(7.5, i*1.5 + 0.5, 0.05)
        p_end = s(2, i*1.5 + 0.5, 0.05)
        cable_c = [(180, 0, 60), (0, 150, 200), (120, 0, 200)][i]
        draw.line([p_start, p_end], fill=cable_c+(100,), width=2)

    # Ambient glow effects
    # Red glow from throne area
    throne_center = s(4, 0.9, 1.5)
    for r in range(60, 0, -5):
        alpha = int(25 * (1 - r/60))
        draw.ellipse([throne_center[0]-r*1.5, throne_center[1]-r,
                      throne_center[0]+r*1.5, throne_center[1]+r],
                     fill=(180, 0, 60, alpha))

    # Purple energy orb on stand
    draw_iso_box(draw, 7, 1, 0.5, 0.5, 1.0, OX, OY, (40, 20, 70), TW, TH, HS)
    orb_pos = s(7.25, 1.25, 1.2)
    for r in range(15, 0, -1):
        alpha = int(180 * (1-r/15))
        draw.ellipse([orb_pos[0]-r, orb_pos[1]-r, orb_pos[0]+r, orb_pos[1]+r],
                     fill=(160, 50, 255, alpha))
    draw.ellipse([orb_pos[0]-4, orb_pos[1]-4, orb_pos[0]+4, orb_pos[1]+4],
                 fill=(220, 180, 255, 240))

    # Floating particles
    rng = random.Random(42)
    for _ in range(20):
        px2 = rng.randint(50, W-50)
        py2 = rng.randint(50, H-80)
        c = rng.choice([(180, 50, 255), (255, 50, 100), (0, 180, 255)])
        r = rng.randint(1, 3)
        draw.ellipse([px2-r, py2-r, px2+r, py2+r], fill=c+(rng.randint(100, 200),))

    # Title card glow
    title_y = H - 45
    draw.rectangle([W//2-90, title_y-2, W//2+90, title_y+18], fill=(15, 5, 30, 200))
    draw.rectangle([W//2-90, title_y-2, W//2+90, title_y+18], outline=(200, 50, 255, 150), width=1)

    # Apply slight blur for atmosphere
    img = img.filter(ImageFilter.GaussianBlur(0.5))

    return img


def make_bob_library():
    """Bookshelf library — shelves, scrolls, data crystals, reading desk, holograms."""
    img = Image.new("RGBA", (W, H), (3, 5, 12, 255))
    draw = ImageDraw.Draw(img)

    # Background — warm navy/teal
    for y in range(H):
        t = y / H
        c = lerp_color((8, 15, 35), (3, 5, 18), t)
        draw.line([(0, y), (W, y)], fill=c)

    # Ambient blue glow spots
    for cx, cy, radius in [(W*0.3, H*0.4, 120), (W*0.7, H*0.3, 90)]:
        for r in range(int(radius), 0, -8):
            alpha = int(12 * (1 - r/radius))
            draw.ellipse([cx-r, cy-r*0.7, cx+r, cy+r*0.7], fill=(30, 80, 180, alpha))

    OX, OY = W//2 - 10, H//2 - 10
    TW, TH, HS = 42, 21, 26

    def s(x, y, z=0):
        return iso_to_screen(x, y, z, OX, OY, TW, TH, HS)

    # Floor — warm wood planks
    wood_colors = [(35, 22, 10), (32, 20, 8), (38, 24, 12), (30, 19, 7)]
    for gx in range(8):
        for gy in range(6):
            c = wood_colors[(gx + gy*3) % len(wood_colors)]
            # Wood grain lines
            if (gx + gy) % 2 == 0:
                c = darken(c, 0.9)
            draw_iso_floor_tile(draw, gx, gy, OX, OY, c, TW, TH)

    # Carpet/rug in center
    rug_pts = [s(2, 2), s(5, 2), s(5, 4), s(2, 4)]
    draw.polygon(rug_pts, fill=(60, 30, 80, 180))
    draw.polygon(rug_pts, outline=(100, 60, 130), width=1)
    # Rug pattern
    inner_rug = [s(2.3, 2.3), s(4.7, 2.3), s(4.7, 3.7), s(2.3, 3.7)]
    draw.polygon(inner_rug, outline=(120, 80, 160, 120), width=1)

    # Back wall
    wall_color = (22, 18, 40)
    for gx in range(8):
        draw_iso_wall_left(draw, gx, 0, 3.5, OX, OY, wall_color, TW, TH, HS)
    for gy in range(6):
        draw_iso_wall_right(draw, 8, gy, 3.5, OX, OY, wall_color, TW, TH, HS)

    # Massive bookshelf units on back wall
    shelf_colors = [(45, 30, 15), (40, 25, 12), (50, 35, 18)]
    book_colors = [
        (180, 40, 40), (200, 150, 30), (40, 100, 180), (30, 140, 60),
        (150, 50, 180), (200, 100, 40), (80, 80, 180), (180, 60, 120),
        (60, 160, 160), (200, 80, 40), (120, 40, 40), (40, 80, 150)
    ]

    # Left bookshelf
    draw_iso_box(draw, 0, 0, 2, 0.6, 3.2, OX, OY, shelf_colors[0], TW, TH, HS)
    # Books on left shelf (3 rows)
    for shelf_row in range(3):
        z_level = 0.3 + shelf_row * 1.0
        for bk in range(8):
            bc = book_colors[(bk + shelf_row*4) % len(book_colors)]
            book_x = 0.05 + bk * 0.22
            if book_x > 1.9:
                break
            draw_iso_box(draw, book_x, 0.02, 0.18, 0.5, 0.85, OX, OY, bc, TW, TH, HS)
            # Spine highlight
            spine = s(book_x + 0.18, 0.02, z_level + 0.85)
            draw.line([spine, s(book_x + 0.18, 0.5, z_level + 0.85)],
                      fill=lighten(bc, 40)+(150,), width=1)

    # Right bookshelf
    draw_iso_box(draw, 6, 0, 2, 0.6, 3.2, OX, OY, shelf_colors[1], TW, TH, HS)
    for shelf_row in range(3):
        for bk in range(8):
            bc = book_colors[(bk + shelf_row*3 + 5) % len(book_colors)]
            book_x = 6.05 + bk * 0.22
            if book_x > 7.9:
                break
            draw_iso_box(draw, book_x, 0.02, 0.18, 0.5, 0.85, OX, OY, bc, TW, TH, HS)

    # Center reading desk
    draw_iso_box(draw, 2.5, 1.5, 3, 2, 0.7, OX, OY, (50, 32, 15), TW, TH, HS)
    # Open book on desk
    book_top = s(3.5, 2.5, 0.72)
    # Left page
    draw.polygon([book_top, (book_top[0]+20, book_top[1]-8),
                  (book_top[0]+18, book_top[1]+6), (book_top[0]-2, book_top[1]+8)],
                 fill=(230, 225, 200, 230))
    # Right page
    draw.polygon([book_top, (book_top[0]+20, book_top[1]-8),
                  (book_top[0]+38, book_top[1]-4), (book_top[0]+18, book_top[1]+6)],
                 fill=(220, 215, 190, 230))
    # Text lines on book
    for line_i in range(4):
        ly = book_top[1] + line_i*3 - 2
        draw.line([(book_top[0]+3, ly), (book_top[0]+15, ly-3)], fill=(100, 80, 60, 180), width=1)

    # Candlestick on desk
    candle_base = s(3, 2, 0.7)
    draw.rectangle([candle_base[0]-2, candle_base[1]-12, candle_base[0]+2, candle_base[1]], fill=(200, 200, 180))
    # Flame
    for r in range(8, 0, -1):
        alpha = int(200 * (1-r/8))
        draw.ellipse([candle_base[0]-r, candle_base[1]-20-r,
                      candle_base[0]+r, candle_base[1]-12+r], fill=(255, 200, 50, alpha))
    draw.ellipse([candle_base[0]-2, candle_base[1]-16,
                  candle_base[0]+2, candle_base[1]-12], fill=(255, 255, 150, 255))

    # Floating data crystals
    crystal_positions = [
        s(4.5, 1, 2), s(5, 3.5, 1.5), s(1.5, 4.5, 1)
    ]
    crystal_colors = [(100, 200, 255), (200, 150, 255), (150, 255, 200)]
    for i, (cpx, cpy) in enumerate(crystal_positions):
        cc = crystal_colors[i]
        # Crystal body (diamond shape)
        draw.polygon([
            (cpx, cpy-14),
            (cpx-8, cpy),
            (cpx, cpy+10),
            (cpx+8, cpy)
        ], fill=cc+(180,))
        draw.polygon([
            (cpx, cpy-14),
            (cpx-8, cpy),
            (cpx, cpy+10),
            (cpx+8, cpy)
        ], outline=(255,255,255,100), width=1)
        # Crystal glow
        for r in range(20, 0, -3):
            alpha = int(40 * (1-r/20))
            draw.ellipse([cpx-r, cpy-r, cpx+r, cpy+r], fill=cc+(alpha,))

    # Holographic display orb — floating over desk
    holo_pos = s(4, 2.5, 2.5)
    for r in range(25, 0, -2):
        alpha = int(60 * (1-r/25))
        draw.ellipse([holo_pos[0]-r*1.2, holo_pos[1]-r,
                      holo_pos[0]+r*1.2, holo_pos[1]+r], fill=(30, 150, 255, alpha))
    # Holo lines
    for i in range(6):
        angle = i * math.pi / 3
        lx = int(holo_pos[0] + 18 * math.cos(angle))
        ly = int(holo_pos[1] + 10 * math.sin(angle))
        draw.line([holo_pos, (lx, ly)], fill=(100, 200, 255, 80), width=1)

    # Scroll racks (right side)
    draw_iso_box(draw, 7.2, 2, 0.5, 3, 1.8, OX, OY, (40, 25, 10), TW, TH, HS)
    # Scrolls
    for si in range(5):
        scroll_p = s(7.25, 2.3 + si*0.5, 0.2)
        draw.ellipse([scroll_p[0]-3, scroll_p[1]-6, scroll_p[0]+3, scroll_p[1]+6],
                     fill=(200, 190, 160, 220))
        draw.line([(scroll_p[0], scroll_p[1]-8), (scroll_p[0], scroll_p[1]+8)],
                  fill=(150, 120, 80, 200), width=1)

    # Dust motes / floating particles
    rng = random.Random(12)
    for _ in range(15):
        px2 = rng.randint(40, W-40)
        py2 = rng.randint(40, H-80)
        c = rng.choice([(100, 180, 255), (200, 180, 100), (150, 255, 200)])
        r = rng.randint(1, 2)
        draw.ellipse([px2-r, py2-r, px2+r, py2+r], fill=c+(rng.randint(60, 150),))

    img = img.filter(ImageFilter.GaussianBlur(0.4))
    return img


def make_kevin_workshop():
    """Mechanical workshop — workbench, tools, circuit boards, welding sparks, blueprints."""
    img = Image.