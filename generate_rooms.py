#!/usr/bin/env python3
"""
Generate detailed isometric-style room backgrounds for the dungeon interface.
"""

from PIL import Image, ImageDraw, ImageFilter
import math
import random
import os

W, H = 500, 400
OUT_DIR = "/home/ubuntu/.openclaw/workspace/dungeon-interface/public/assets/rooms"
os.makedirs(OUT_DIR, exist_ok=True)

def lerp(a, b, t):
    return a + (b - a) * t

def lerp_color(c1, c2, t):
    return tuple(int(lerp(c1[i], c2[i], t)) for i in range(3))

def darken(c, factor=0.7):
    return tuple(max(0, int(x * factor)) for x in c[:3])

def lighten(c, amount=30):
    return tuple(min(255, x + amount) for x in c[:3])

def iso_pt(x, y, z, ox, oy, tw=44, th=22, hs=28):
    sx = ox + (x - y) * tw // 2
    sy = oy + (x + y) * th // 2 - int(z * hs)
    return (sx, sy)

def iso_floor(draw, x, y, ox, oy, color, tw=44, th=22):
    tl = iso_pt(x,   y,   0, ox, oy, tw, th)
    tr = iso_pt(x+1, y,   0, ox, oy, tw, th)
    br = iso_pt(x+1, y+1, 0, ox, oy, tw, th)
    bl = iso_pt(x,   y+1, 0, ox, oy, tw, th)
    draw.polygon([tl, tr, br, bl], fill=color)
    draw.line([tl, tr], fill=lighten(color, 15), width=1)
    draw.line([tl, bl], fill=lighten(color, 10), width=1)
    draw.line([tr, br], fill=darken(color, 0.7), width=1)
    draw.line([bl, br], fill=darken(color, 0.75), width=1)

def iso_wall_back(draw, gx, gy, grid_w, grid_h, wall_h, ox, oy, color, tw=44, th=22, hs=28):
    """Draw walls along x=0 edge (left wall) and y=0 edge (back wall)."""
    pass

def iso_box(draw, x, y, w, d, h, ox, oy, top_c, tw=44, th=22, hs=28):
    p = lambda ix, iy, iz: iso_pt(ix, iy, iz, ox, oy, tw, th, hs)
    # Top
    top = [p(x,y,h), p(x+w,y,h), p(x+w,y+d,h), p(x,y+d,h)]
    draw.polygon(top, fill=top_c)
    draw.polygon(top, outline=darken(top_c, 0.5), width=1)
    # Left side (x const, y varies)
    lft = [p(x,y,0), p(x,y,h), p(x,y+d,h), p(x,y+d,0)]
    draw.polygon(lft, fill=darken(top_c, 0.6))
    draw.polygon(lft, outline=darken(top_c, 0.4), width=1)
    # Front side (y const, x varies)
    frnt = [p(x,y,0), p(x+w,y,0), p(x+w,y,h), p(x,y,h)]
    draw.polygon(frnt, fill=darken(top_c, 0.78))
    draw.polygon(frnt, outline=darken(top_c, 0.55), width=1)

def wall_seg_left(draw, x, y1, y2, h, ox, oy, color, tw=44, th=22, hs=28):
    """Wall along x axis (left-facing wall)."""
    p = lambda ix, iy, iz: iso_pt(ix, iy, iz, ox, oy, tw, th, hs)
    face = [p(x,y1,0), p(x,y1,h), p(x,y2,h), p(x,y2,0)]
    draw.polygon(face, fill=darken(color, 0.65))
    draw.line([p(x,y1,h), p(x,y2,h)], fill=lighten(color, 20), width=1)

def wall_seg_right(draw, y, x1, x2, h, ox, oy, color, tw=44, th=22, hs=28):
    """Wall along y axis (right-facing wall)."""
    p = lambda ix, iy, iz: iso_pt(ix, iy, iz, ox, oy, tw, th, hs)
    face = [p(x1,y,0), p(x2,y,0), p(x2,y,h), p(x1,y,h)]
    draw.polygon(face, fill=darken(color, 0.82))

def glow_circle(draw, cx, cy, color, max_r=20, max_alpha=180):
    for r in range(max_r, 0, -2):
        a = int(max_alpha * (1 - r/max_r) ** 1.5)
        draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=color+(a,))

def gradient_bg(draw, top_color, bot_color):
    for y in range(H):
        c = lerp_color(top_color, bot_color, y/H)
        draw.line([(0,y),(W,y)], fill=c)

# ─────────────────────────────────────────────────────────────────────────────
# GRIM'S CHAMBER — dark command center, throne, holo monitors, war table
# ─────────────────────────────────────────────────────────────────────────────
def make_grim():
    img = Image.new("RGBA", (W, H))
    draw = ImageDraw.Draw(img, "RGBA")
    gradient_bg(draw, (10, 4, 22), (3, 1, 8))

    # Purple nebula clouds
    rng = random.Random(1)
    for _ in range(8):
        cx, cy = rng.randint(60, W-60), rng.randint(40, H-80)
        for r in range(70, 0, -7):
            a = int(12 * (1-r/70))
            draw.ellipse([cx-r, cy-r*0.6, cx+r, cy+r*0.6], fill=(55, 5, 110, a))

    OX, OY = W//2 + 15, H//2 - 5
    TW, TH, HS = 44, 22, 28

    def s(x, y, z=0): return iso_pt(x, y, z, OX, OY, TW, TH, HS)

    # Floor — dark obsidian
    floors = [(16, 10, 28), (20, 13, 35), (14, 9, 24), (22, 15, 38)]
    for gx in range(8):
        for gy in range(6):
            c = floors[(gx*3+gy*7)%len(floors)]
            # Rune tiles in center
            if gx in [3,4] and gy in [2,3]:
                c = (28, 10, 55)
            iso_floor(draw, gx, gy, OX, OY, c, TW, TH)

    # Floor rune glow
    rune_pts = [s(3,2), s(5,2), s(5,4), s(3,4)]
    for i in range(4):
        a = 90 - i*22
        draw.polygon(rune_pts, outline=(180, 50, 255, a), width=1)
    rc = ((rune_pts[0][0]+rune_pts[2][0])//2, (rune_pts[0][1]+rune_pts[2][1])//2)
    draw.ellipse([rc[0]-22, rc[1]-11, rc[0]+22, rc[1]+11], outline=(180, 50, 255, 80), width=1)

    # Walls
    wc = (28, 16, 50)
    for gx in range(8): wall_seg_left(draw, gx, 0, 1, 3.5, OX, OY, wc, TW, TH, HS)
    for gy in range(6): wall_seg_right(draw, gy, 7, 8, 3.5, OX, OY, wc, TW, TH, HS)

    # Wall monitors
    mon_x = [0.3, 1.2, 2.2, 4.8, 5.8]
    mon_c = [(0,200,255),(255,50,100),(0,255,150),(200,100,255),(255,180,0)]
    for i, mx in enumerate(mon_x):
        iso_box(draw, mx, 0.05, 0.7, 0.1, 1.8, OX, OY, (22, 18, 38), TW, TH, HS)
        sp = s(mx+0.35, 0.07, 1.8)
        mc = mon_c[i]
        for r in range(14, 0, -2):
            a = int(70*(1-r/14))
            draw.ellipse([sp[0]-r*1.5, sp[1]-r, sp[0]+r*1.5, sp[1]+r], fill=mc+(a,))
        draw.ellipse([sp[0]-4, sp[1]-4, sp[0]+4, sp[1]+4], fill=mc+(220,))
        # Screen data lines
        for li in range(3):
            lp = s(mx+0.08, 0.07, 1.5 - li*0.4)
            lp2 = s(mx+0.62, 0.07, 1.5 - li*0.4)
            draw.line([lp, lp2], fill=mc+(80,), width=1)

    # War table center
    iso_box(draw, 2.3, 1.8, 3.2, 1.8, 0.65, OX, OY, (38, 22, 65), TW, TH, HS)
    tc = s(3.9, 2.7, 0.67)
    for r in range(22, 0, -3):
        a = int(55*(1-r/22))
        draw.ellipse([tc[0]-r*2.2, tc[1]-r, tc[0]+r*2.2, tc[1]+r], fill=(0, 180, 255, a))
    # Holographic map grid
    for i in range(5):
        t2 = i/4
        p1a = s(2.6+t2*2.7, 1.9, 0.68)
        p1b = s(2.6+t2*2.7, 3.5, 0.68)
        draw.line([p1a, p1b], fill=(0,150,220,50), width=1)
        p2a = s(2.6, 1.9+t2*1.6, 0.68)
        p2b = s(5.3, 1.9+t2*1.6, 0.68)
        draw.line([p2a, p2b], fill=(0,150,220,50), width=1)
    # Territory markers on map
    for mx2, my2, mc2 in [(3.2, 2.5, (255,50,50)), (4.5, 2.2, (50,255,100)), (3.8, 3.1, (255,200,0))]:
        mp = s(mx2, my2, 0.75)
        draw.ellipse([mp[0]-3, mp[1]-3, mp[0]+3, mp[1]+3], fill=mc2+(220,))

    # Throne — back center
    iso_box(draw, 3.1, 0.2, 1.8, 1.3, 2.6, OX, OY, (32, 14, 58), TW, TH, HS)
    iso_box(draw, 3.0, 0.3, 0.22, 1.1, 2.9, OX, OY, (48, 18, 75), TW, TH, HS)  # L armrest
    iso_box(draw, 4.68, 0.3, 0.22, 1.1, 2.9, OX, OY, (48, 18, 75), TW, TH, HS)  # R armrest
    # Crown spikes
    throne_top = s(4, 0.2, 2.9)
    for i in range(5):
        sx2 = throne_top[0] + (i-2)*9
        draw.polygon([(sx2, throne_top[1]-12), (sx2-4, throne_top[1]+2), (sx2+4, throne_top[1]+2)],
                     fill=(255, 210, 30, 220))
    # Dragon eye glow
    for ex in [throne_top[0]-12, throne_top[0]+12]:
        glow_circle(draw, ex, throne_top[1]-22, (255,30,30), 10, 220)
        draw.ellipse([ex-2, throne_top[1]-24, ex+2, throne_top[1]-20], fill=(255,200,200,255))

    # Energy orb on pedestal
    iso_box(draw, 7.2, 1.2, 0.5, 0.5, 1.1, OX, OY, (38, 18, 68), TW, TH, HS)
    op = s(7.45, 1.45, 1.35)
    glow_circle(draw, op[0], op[1], (160, 50, 255), 18, 200)
    draw.ellipse([op[0]-5, op[1]-5, op[0]+5, op[1]+5], fill=(220,180,255,255))

    # Chains hanging from ceiling area
    for chain_x in [1.5, 6.5]:
        cp = s(chain_x, 1, 3.5)
        cb = s(chain_x, 1, 0.5)
        draw.line([cp, cb], fill=(80, 60, 100, 120), width=2)
        for ci in range(5):
            ch = s(chain_x, 1, 3.5 - ci*0.6)
            draw.ellipse([ch[0]-3, ch[1]-2, ch[0]+3, ch[1]+2], outline=(100,80,130,150), width=1)

    # Floor cables
    rng2 = random.Random(77)
    for i in range(4):
        px1, py1 = rng2.randint(50, W-50), rng2.randint(H-150, H-60)
        px2, py2 = rng2.randint(50, W-50), rng2.randint(H-150, H-60)
        cc2 = rng2.choice([(180,0,60),(0,150,200),(120,0,200)])
        draw.line([(px1,py1),(px2,py2)], fill=cc2+(80,), width=2)

    # Floating particles
    rng3 = random.Random(42)
    for _ in range(25):
        px3, py3 = rng3.randint(30, W-30), rng3.randint(30, H-80)
        cc3 = rng3.choice([(180,50,255),(255,50,100),(0,180,255)])
        r3 = rng3.randint(1,3)
        draw.ellipse([px3-r3, py3-r3, px3+r3, py3+r3], fill=cc3+(rng3.randint(80,200),))

    # Ambient red throne glow
    tc2 = s(4, 0.9, 1.5)
    for r in range(70, 0, -6):
        a = int(22*(1-r/70))
        draw.ellipse([tc2[0]-r*1.5, tc2[1]-r, tc2[0]+r*1.5, tc2[1]+r], fill=(160,0,50,a))

    img = img.filter(ImageFilter.GaussianBlur(0.5))
    return img


# ─────────────────────────────────────────────────────────────────────────────
# BOB'S LIBRARY — shelves, books, crystals, reading desk, holograms, scrolls
# ─────────────────────────────────────────────────────────────────────────────
def make_bob():
    img = Image.new("RGBA", (W, H))
    draw = ImageDraw.Draw(img, "RGBA")
    gradient_bg(draw, (7, 12, 30), (3, 5, 16))

    # Warm blue glow spots
    rng = random.Random(5)
    for _ in range(4):
        cx, cy = rng.randint(80, W-80), rng.randint(40, H-80)
        for r in range(90, 0, -9):
            a = int(10*(1-r/90))
            draw.ellipse([cx-r, cy-r*0.7, cx+r, cy+r*0.7], fill=(20,70,160,a))

    OX, OY = W//2 - 5, H//2 - 8
    TW, TH, HS = 44, 22, 26

    def s(x, y, z=0): return iso_pt(x, y, z, OX, OY, TW, TH, HS)

    # Wood plank floor
    wds = [(32, 20, 9), (28, 17, 7), (36, 23, 11), (30, 18, 8)]
    for gx in range(8):
        for gy in range(6):
            c = wds[(gx*5+gy*3)%len(wds)]
            iso_floor(draw, gx, gy, OX, OY, c, TW, TH)

    # Ornate rug
    rp = [s(2,2), s(5,2), s(5,4), s(2,4)]
    draw.polygon(rp, fill=(55, 28, 75, 190))
    rp2 = [s(2.25,2.2), s(4.75,2.2), s(4.75,3.8), s(2.25,3.8)]
    draw.polygon(rp2, outline=(100, 60, 140, 140), width=1)
    rp3 = [s(2.5,2.4), s(4.5,2.4), s(4.5,3.6), s(2.5,3.6)]
    draw.polygon(rp3, outline=(140, 90, 180, 100), width=1)
    # Rug pattern diamonds
    for dx in [3.0, 3.5, 4.0]:
        for dy in [2.7, 3.2]:
            dp = s(dx, dy, 0.01)
            draw.polygon([(dp[0], dp[1]-5), (dp[0]+4, dp[1]), (dp[0], dp[1]+5), (dp[0]-4, dp[1])],
                         outline=(160, 110, 200, 120), width=1)

    # Walls — deep navy stone
    wc = (20, 16, 38)
    for gx in range(8): wall_seg_left(draw, gx, 0, 1, 3.8, OX, OY, wc, TW, TH, HS)
    for gy in range(6): wall_seg_right(draw, gy, 7, 8, 3.8, OX, OY, wc, TW, TH, HS)

    # Left bookshelf — tall with 3 shelves
    iso_box(draw, 0.05, 0.05, 1.9, 0.65, 3.5, OX, OY, (42, 28, 14), TW, TH, HS)
    bk_colors = [(180,40,40),(200,150,30),(40,100,180),(30,140,60),(150,50,180),
                 (200,100,40),(80,80,180),(180,60,120),(60,160,160),(200,80,40)]
    for row in range(3):
        z0 = 0.2 + row*1.0
        for bi in range(9):
            bx = 0.1 + bi*0.19
            if bx > 1.85: break
            bc = bk_colors[(bi+row*4)%len(bk_colors)]
            iso_box(draw, bx, 0.08, 0.16, 0.52, 0.88, OX, OY, bc, TW, TH, HS)
            # Book highlight
            bsp = s(bx+0.16, 0.08, z0+0.88)
            draw.line([bsp, s(bx+0.16, 0.52, z0+0.88)], fill=lighten(bc,50)+(120,), width=1)

    # Right bookshelf
    iso_box(draw, 6.05, 0.05, 1.9, 0.65, 3.5, OX, OY, (38, 24, 12), TW, TH, HS)
    for row in range(3):
        for bi in range(9):
            bx = 6.1 + bi*0.19
            if bx > 7.9: break
            bc = bk_colors[(bi+row*3+6)%len(bk_colors)]
            iso_box(draw, bx, 0.08, 0.16, 0.52, 0.88, OX, OY, bc, TW, TH, HS)

    # Reading desk center
    iso_box(draw, 2.4, 1.5, 3.2, 2.2, 0.72, OX, OY, (48, 30, 14), TW, TH, HS)
    # Desk legs
    for lx, ly in [(2.45, 1.55), (5.5, 1.55), (2.45, 3.6), (5.5, 3.6)]:
        iso_box(draw, lx, ly, 0.1, 0.1, -0.6, OX, OY, (35, 22, 10), TW, TH, HS)

    # Open book on desk
    bp = s(3.5, 2.7, 0.74)
    draw.polygon([(bp[0]-22, bp[1]+4), (bp[0], bp[1]-8), (bp[0]+2, bp[1]+6), (bp[0]-20, bp[1]+12)],
                 fill=(232, 225, 200, 235))
    draw.polygon([(bp[0]+2, bp[1]+6), (bp[0], bp[1]-8), (bp[0]+24, bp[1]-4), (bp[0]+22, bp[1]+8)],
                 fill=(220, 213, 190, 235))
    # Text lines
    for li in range(5):
        draw.line([(bp[0]-18+li, bp[1]+li*2-2), (bp[0]-5+li, bp[1]+li*2-5)],
                  fill=(80,60,40,160), width=1)
        draw.line([(bp[0]+4+li, bp[1]+li*2-6), (bp[0]+18+li, bp[1]+li*2-9)],
                  fill=(80,60,40,160), width=1)

    # Candle on desk
    cp = s(2.8, 2.0, 0.74)
    draw.rectangle([cp[0]-2, cp[1]-14, cp[0]+2, cp[1]], fill=(200,200,180))
    for r in range(9, 0, -1):
        a = int(210*(1-r/9))
        draw.ellipse([cp[0]-r, cp[1]-22-r, cp[0]+r, cp[1]-13+r//2], fill=(255,200,50,a))
    draw.ellipse([cp[0]-2, cp[1]-18, cp[0]+2, cp[1]-14], fill=(255,255,150,255))

    # Second candle
    cp2 = s(5.1, 3.5, 0.74)
    draw.rectangle([cp2[0]-2, cp2[1]-14, cp2[0]+2, cp2[1]], fill=(190,190,170))
    for r in range(8, 0, -1):
        a = int(200*(1-r/8))
        draw.ellipse([cp2[0]-r, cp2[1]-21-r, cp2[0]+r, cp2[1]-13+r//2], fill=(255,210,60,a))

    # Floating data crystals
    cryst_data = [(s(4.5, 1, 2.2), (100,200,255)), (s(1.5, 4.5, 1.2), (200,150,255)),
                  (s(5.5, 4, 1.5), (150,255,200))]
    for (cx2, cy2), cc2 in cryst_data:
        # Glow
        for r in range(22, 0, -3):
            a = int(45*(1-r/22))
            draw.ellipse([cx2-r, cy2-r, cx2+r, cy2+r], fill=cc2+(a,))
        # Crystal shape
        draw.polygon([(cx2, cy2-16), (cx2-9, cy2), (cx2, cy2+10), (cx2+9, cy2)],
                     fill=cc2+(190,))
        draw.polygon([(cx2, cy2-16), (cx2-9, cy2), (cx2, cy2+10), (cx2+9, cy2)],
                     outline=(255,255,255,100), width=1)
        # Shine
        draw.ellipse([cx2-3, cy2-14, cx2+1, cy2-10], fill=(255,255,255,150))

    # Holographic globe above desk
    hp = s(3.9, 2.5, 2.6)
    for r in range(28, 0, -2):
        a = int(55*(1-r/28))
        draw.ellipse([hp[0]-r*1.3, hp[1]-r, hp[0]+r*1.3, hp[1]+r], fill=(30,140,255,a))
    # Globe lines
    for ang in range(0, 360, 30):
        rad = math.radians(ang)
        lx2 = int(hp[0] + 22*math.cos(rad))
        ly2 = int(hp[1] + 12*math.sin(rad))
        draw.line([hp, (lx2, ly2)], fill=(100,200,255,60), width=1)
    draw.ellipse([hp[0]-5, hp[1]-5, hp[0]+5, hp[1]+5], fill=(200,240,255,220))

    # Scroll rack (right side)
    iso_box(draw, 7.25, 2.2, 0.5, 2.8, 1.8, OX, OY, (38, 24, 12), TW, TH, HS)
    for si in range(7):
        sp2 = s(7.3, 2.4+si*0.38, 0.15+si*0.22)
        draw.ellipse([sp2[0]-4, sp2[1]-7, sp2[0]+4, sp2[1]+7], fill=(200,190,160,210))
        draw.line([(sp2[0], sp2[1]-9), (sp2[0], sp2[1]+9)], fill=(150,120,80,180), width=1)

    # Floating dust particles
    rng2 = random.Random(15)
    for _ in range(18):
        px2, py2 = rng2.randint(40, W-40), rng2.randint(40, H-70)
        c2 = rng2.choice([(100,180,255),(200,180,100),(150,255,200),(255,220,120)])
        r2 = rng2.randint(1, 2)
        draw.ellipse([px2-r2, py2-r2, px2+r2, py2+r2], fill=c2+(rng2.randint(50,140),))

    img = img.filter(ImageFilter.GaussianBlur(0.4))
    return img


# ─────────────────────────────────────────────────────────────────────────────
# KEVIN'S WORKSHOP — workbench, tools, circuit boards, welding sparks, blueprints
# ─────────────────────────────────────────────────────────────────────────────
def make_kevin():
    img = Image.new("RGBA", (W, H))
    draw = ImageDraw.Draw(img, "RGBA")
    gradient_bg(draw, (18, 8, 3), (6, 3, 1))

    # Orange/ember glow spots
    rng = random.Random(3)
    for _ in range(5):
        cx, cy = rng.randint(60, W-60), rng.randint(40, H-80)
        for r in range(80, 0, -8):
            a = int(14*(1-r/80))
            draw.ellipse([cx-r, cy-r*0.6, cx+r, cy+r*0.6], fill=(120,40,5,a))

    OX, OY = W//2 + 10, H//2 - 5
    TW, TH, HS = 44, 22, 28

    def s(x, y, z=0): return iso_pt(x, y, z, OX, OY, TW, TH, HS)

    # Concrete/metal floor
    fl_colors = [(28, 22, 18), (24, 18, 14), (32, 25, 20), (26, 20, 16)]
    for gx in range(8):
        for gy in range(6):
            c = fl_colors[(gx*7+gy*11)%len(fl_colors)]
            # Oil stain patterns
            if rng.random() < 0.08:
                c = darken(c, 0.7)
            iso_floor(draw, gx, gy, OX, OY, c, TW, TH)

    # Danger stripe on floor (yellow/black)
    for gx in range(3, 5):
        for gy in range(3, 5):
            pt = [s(gx,gy), s(gx+1,gy), s(gx+1,gy+1), s(gx,gy+1)]
            col = (40,35,5) if (gx+gy)%2==0 else (20,15,3)
            draw.polygon(pt, fill=col)
            draw.polygon(pt, outline=(80,70,10,100), width=1)

    # Metal walls
    wc = (35, 25, 18)
    for gx in range(8): wall_seg_left(draw, gx, 0, 1, 3.5, OX, OY, wc, TW, TH, HS)
    for gy in range(6): wall_seg_right(draw, gy, 7, 8, 3.5, OX, OY, wc, TW, TH, HS)

    # Blueprint posters on walls
    for bpx, bpy in [(1.0, 0.05), (3.5, 0.05), (5.5, 0.05)]:
        bpos = s(bpx, 0, 2.5)
        draw.rectangle([bpos[0]-15, bpos[1]-22, bpos[0]+15, bpos[1]+8], fill=(15,25,60,200))
        draw.rectangle([bpos[0]-15, bpos[1]-22, bpos[0]+15, bpos[1]+8], outline=(60,100,180,150), width=1)
        # Blueprint grid lines
        for li in range(4):
            draw.line([(bpos[0]-12, bpos[1]-18+li*7), (bpos[0]+12, bpos[1]-18+li*7)], fill=(80,130,220,100), width=1)
            draw.line([(bpos[0]-12+li*8, bpos[1]-18), (bpos[0]-12+li*8, bpos[1]+5)], fill=(80,130,220,100), width=1)
        # Circuit diagram symbols
        draw.ellipse([bpos[0]-5, bpos[1]-10, bpos[0]+5, bpos[1]], fill=(0,0,0,0), outline=(100,160,255,150), width=1)

    # Main workbench (L-shaped)
    iso_box(draw, 0.2, 0.5, 3.5, 1.2, 0.75, OX, OY, (45, 32, 20), TW, TH, HS)
    iso_box(draw, 0.2, 0.5, 0.6, 3.5, 0.65, OX, OY, (42, 30, 18), TW, TH, HS)

    # Tools on bench
    tool_positions = [(0.4, 0.6, 0.77), (0.7, 0.7, 0.77), (1.0, 0.8, 0.77),
                      (1.5, 0.6, 0.77), (2.0, 0.7, 0.77), (2.5, 0.6, 0.77)]
    tool_colors = [(160,120,80), (180,100,50), (120,130,140), (150,150,160),
                   (200,160,80), (130,110,100)]
    for i, (tx, ty, tz) in enumerate(tool_positions):
        tc = tool_colors[i%len(tool_colors)]
        tp = s(tx, ty, tz)
        # Tool body
        draw.rectangle([tp[0]-2, tp[1]-12, tp[0]+2, tp[1]], fill=tc)
        # Tool head
        draw.ellipse([tp[0]-4, tp[1]-14, tp[0]+4, tp[1]-8], fill=lighten(tc,20))

    # Circuit board on bench
    iso_box(draw, 1.2, 1.0, 1.5, 0.9, 0.78, OX, OY, (8, 45, 18), TW, TH, HS)
    cb_top = s(1.95, 1.45, 0.8)
    # Circuit traces
    for ci in range(5):
        cp_s = (cb_top[0]-18+ci*8, cb_top[1]+3)
        cp_e = (cb_top[0]-18+ci*8, cb_top[1]-12)
        draw.line([cp_s, cp_e], fill=(0,200,100,150), width=1)
    for ri in range(3):
        draw.line([(cb_top[0]-18, cb_top[1]-3+ri*6), (cb_top[0]+22, cb_top[1]-3+ri*6)],
                  fill=(0,180,80,120), width=1)
    # Component dots
    for cx3, cy3 in [(cb_top[0]-10, cb_top[1]-6), (cb_top[0]+5, cb_top[1]-10),
                     (cb_top[0]+12, cb_top[1]-2), (cb_top[0]-3, cb_top[1]+2)]:
        draw.ellipse([cx3-3, cy3-3, cx3+3, cy3+3], fill=(255,200,0,200))
        for r in range(6,0,-1):
            a = int(50*(1-r/6))
            draw.ellipse([cx3-r, cy3-r, cx3+r, cy3+r], fill=(255,200,0,a))

    # Welding arc (bright spark)
    wa = s(2.8, 0.9, 0.8)
    # Spark glow
    for r in range(18, 0, -2):
        a = int(180*(1-r/18))
        draw.ellipse([wa[0]-r, wa[1]-r, wa[0]+r, wa[1]+r], fill=(200,200,255,a))
    draw.ellipse([wa[0]-3, wa[1]-3, wa[0]+3, wa[1]+3], fill=(255,255,255,255))
    # Spark trails
    rng2 = random.Random(99)
    for _ in range(12):
        angle = rng2.uniform(0, 2*math.pi)
        length = rng2.randint(5, 20)
        ex2 = int(wa[0] + length*math.cos(angle))
        ey2 = int(wa[1] + length*math.sin(angle) * 0.5)
        sc2 = (255, rng2.randint(150,255), rng2.randint(0,100))
        draw.line([wa, (ex2, ey2)], fill=sc2+(rng2.randint(100,200),), width=1)

    # Mechanical parts bins (shelves on right wall)
    iso_box(draw, 7.2, 0.3, 0.5, 2.0, 2.5, OX, OY, (38, 28, 18), TW, TH, HS)
    for si in range(3):
        sp2 = s(7.25, 0.5+si*0.65, 0.4+si*0.7)
        # Bin of parts
        draw.ellipse([sp2[0]-8, sp2[1]-4, sp2[0]+8, sp2[1]+4], fill=(50,40,30,180))
        # Parts inside
        for pi in range(4):
            angle = pi * math.pi/2
            ppx = int(sp2[0] + 4*math.cos(angle))
            ppy = int(sp2[1] + 2*math.sin(angle))
            draw.ellipse([ppx-2, ppy-2, ppx+2, ppy+2], fill=(140,120,90,200))

    # Central assembly — half-built machine
    iso_box(draw, 3.5, 2.5, 2, 2, 1.2, OX, OY, (55, 40, 25), TW, TH, HS)
    # Machine glowing core
    mc3 = s(4.5, 3.5, 1.4)
    glow_circle(draw, mc3[0], mc3[1], (255, 120, 0), 20, 200)
    draw.ellipse([mc3[0]-5, mc3[1]-5, mc3[0]+5, mc3[1]+5], fill=(255,220,100,255))
    # Mechanical pipes
    for angle in [0, 90, 180, 270]:
        rad = math.radians(angle)
        end_x = int(mc3[0] + 25*math.cos(rad))
        end_y = int(mc3[1] + 14*math.sin(rad))
        draw.line([(mc3[0], mc3[1]), (end_x, end_y)], fill=(100,80,50,180), width=3)
        draw.ellipse([end_x-3, end_y-3, end_x+3, end_y+3], fill=(130,100,60,200))

    # Sparks/ember particles
    rng3 = random.Random(88)
    for _ in range(25):
        px3, py3 = rng3.randint(30, W-30), rng3.randint(30, H-80)
        cc3 = rng3.choice([(255,180,50),(255,120,30),(255,240,100),(200,100,20)])
        r3 = rng3.randint(1,3)
        draw.ellipse([px3-r3, py3-r3, px3+r3, py3+r3], fill=cc3+(rng3.randint(60,180),))

    # Overhead light fixture
    lp = s(3.5, 2, 3.5)
    draw.rectangle([lp[0]-15, lp[1]-4, lp[0]+15, lp[1]+2], fill=(60,50,40,220))
    for r in range(35, 0, -4):
        a = int(50*(1-r/35))
        draw.ellipse([lp[0]-r*1.5, lp[1]-r, lp[0]+r*1.5, lp[1]+r], fill=(255,230,150,a))

    img = img.filter(ImageFilter.GaussianBlur(0.4))
    return img


# ─────────────────────────────────────────────────────────────────────────────
# AGNES'S STUDIO — easels, paint, color palettes, inspiration boards, chaos
# ─────────────────────────────────────────────────────────────────────────────
def make_agnes():
    img = Image.new("RGBA", (W, H))
    draw = ImageDraw.Draw(img, "RGBA")
    gradient_bg(draw, (18, 5, 20), (8, 3, 12))

    # Colorful creative glow spots
    rng = random.Random(7)
    glow_data = [((200,50,200), W//3, H//3), ((50,200,150), 2*W//3, H//2), ((200,200,50), W//2, 2*H//3)]
    for gc_col, cx, cy in glow_data:
        for r in range(80, 0, -8):
            a = int(10*(1-r/80))
            draw.ellipse([cx-r, cy-int(r*0.6), cx+r, cy+int(r*0.6)], fill=gc_col+(a,))

    OX, OY = W//2, H//2 - 10
    TW, TH, HS = 44, 22, 26

    def s(x, y, z=0): return iso_pt(x, y, z, OX, OY, TW, TH, HS)

    # Colorful messy floor — paint splashes
    fl_base = [(22, 15, 28), (20, 12, 25), (25, 17, 32), (18, 12, 22)]
    paint_splash_colors = [(200,50,80), (50,180,200), (200,200,50), (180,50,200), (50,200,100)]
    for gx in range(8):
        for gy in range(6):
            c = fl_base[(gx*3+gy*7)%len(fl_base)]
            iso_floor(draw, gx, gy, OX, OY, c, TW, TH)
    # Paint splash marks
    rng2 = random.Random(44)
    for _ in range(20):
        sp_x = rng2.uniform(0.5, 7.5)
        sp_y = rng2.uniform(0.5, 5.5)
        pc = paint_splash_colors[rng2.randint(0,len(paint_splash_colors)-1)]
        pp = s(sp_x, sp_y, 0.01)
        for r in range(7, 0, -2):
            a = int(80*(1-r/7))
            draw.ellipse([pp[0]-r*1.5, pp[1]-r, pp[0]+r*1.5, pp[1]+r], fill=pc+(a,))

    # Walls — warm purple
    wc = (30, 18, 42)
    for gx in range(8): wall_seg_left(draw, gx, 0, 1, 3.5, OX, OY, wc, TW, TH, HS)
    for gy in range(6): wall_seg_right(draw, gy, 7, 8, 3.5, OX, OY, wc, TW, TH, HS)

    # Inspiration board on back wall
    for ibx, iby in [(1.5, 0.05), (4.5, 0.05)]:
        ibpos = s(ibx, 0, 2.8)
        draw.rectangle([ibpos[0]-20, ibpos[1]-28, ibpos[0]+20, ibpos[1]+8], fill=(15,10,25,200))
        draw.rectangle([ibpos[0]-20, ibpos[1]-28, ibpos[0]+20, ibpos[1]+8], outline=(200,80,200,120), width=1)
        # Pinned sketches/photos
        sketch_colors = [(200,50,80,150), (50,180,200,150), (200,200,50,150), (180,50,200,150)]
        for sk, (skc) in enumerate(sketch_colors):
            skx = ibpos[0] - 16 + (sk%2)*20
            sky = ibpos[1] - 24 + (sk//2)*18
            draw.rectangle([skx, sky, skx+16, sky+14], fill=skc)
            draw.rectangle([skx, sky, skx+16, sky+14], outline=(255,255,255,60), width=1)
        # Pin dots
        for pkx in [ibpos[0]-10, ibpos[0]+10]:
            draw.ellipse([pkx-2, ibpos[1]-26, pkx+2, ibpos[1]-22], fill=(255,60,60,220))

    # Easel 1 (main canvas — left)
    ea_pos = s(1.5, 2, 0)
    # Easel legs
    draw.line([ea_pos, (ea_pos[0]-15, ea_pos[1]+30)], fill=(80,55,30,200), width=2)
    draw.line([ea_pos, (ea_pos[0]+15, ea_pos[1]+30)], fill=(80,55,30,200), width=2)
    draw.line([(ea_pos[0]-8, ea_pos[1]+20), (ea_pos[0]+12, ea_pos[1]+20)], fill=(80,55,30,150), width=1)
    # Canvas
    draw.rectangle([ea_pos[0]-16, ea_pos[1]-30, ea_pos[0]+16, ea_pos[1]+2], fill=(230,220,200,230))
    draw.rectangle([ea_pos[0]-16, ea_pos[1]-30, ea_pos[0]+16, ea_pos[1]+2], outline=(120,90,50,200), width=2)
    # Painted swirls on canvas
    for ang in range(0, 360, 40):
        rad = math.radians(ang)
        r3 = 8 + ang//40 * 2
        cx3 = ea_pos[0] + int(r3*0.5*math.cos(rad))
        cy3 = ea_pos[1]-14 + int(r3*0.4*math.sin(rad))
        pc3 = paint_splash_colors[ang//60 % len(paint_splash_colors)]
        draw.ellipse([cx3-3, cy3-3, cx3+3, cy3+3], fill=pc3+(180,))

    # Easel 2 (second canvas — center)
    ea2 = s(3, 1.5, 0)
    draw.line([ea2, (ea2[0]-15, ea2[1]+30)], fill=(80,55,30,200), width=2)
    draw.line([ea2, (ea2[0]+15, ea2[1]+30)], fill=(80,55,30,200), width=2)
    draw.rectangle([ea2[0]-16, ea2[1]-28, ea2[0]+16, ea2[1]+4], fill=(220,215,205,220))
    draw.rectangle([ea2[0]-16, ea2[1]-28, ea2[0]+16, ea2[1]+4], outline=(110,85,45,200), width=2)
    # Abstract art strokes
    for stroke_i in range(5):
        sc3 = paint_splash_colors[stroke_i]
        sx2 = ea2[0] - 12 + stroke_i * 5
        draw.line([(sx2, ea2[1]-24), (sx2+8, ea2[1]-8)], fill=sc3+(180,), width=2)

    # Paint supply table
    iso_box(draw, 4.5, 2.5, 3, 2, 0.65, OX, OY, (35, 25, 45), TW, TH, HS)

    # Paint tubes on table
    tube_colors = [(220,50,80),(60,180,220),(230,230,60),(170,60,220),(60,220,110),(230,130,60)]
    for ti, tc in enumerate(tube_colors):
        tx3 = 4.6 + (ti%3)*0.9
        ty3 = 2.6 + (ti//3)*0.85
        tp3 = s(tx3, ty3, 0.67)
        draw.ellipse([tp3[0]-4, tp3[1]-10, tp3[0]+4, tp3[1]+2], fill=tc+(220,))
        draw.line([(tp3[0], tp3[1]-10), (tp3[0]+3, tp3[1]-14)], fill=lighten(tc,30)+(180,), width=2)

    # Color palette (round)
    pal_pos = s(5, 3.5, 0.67)
    draw.ellipse([pal_pos[0]-14, pal_pos[1]-8, pal_pos[0]+14, pal_pos[1]+8], fill=(200,190,175,230))
    draw.ellipse([pal_pos[0]-14, pal_pos[1]-8, pal_pos[0]+14, pal_pos[1]+8], outline=(100,80,55,180), width=1)
    # Paint blobs on palette
    for bi, bc in enumerate([(220,50,80),(60,200,220),(240,240,60),(180,60,220),(60,220,100)]):
        angle = bi * 2*math.pi/5
        bpx = int(pal_pos[0] + 8*math.cos(angle))
        bpy = int(pal_pos[1] + 5*math.sin(angle))
        draw.ellipse([bpx-3, bpy-2, bpx+3, bpy+2], fill=bc+(210,))

    orb_data = [(s(6.5, 1, 1.5), (255,80,150)), (s(7, 4, 1.2), (80,200,255)), (s(0.5, 5, 0.8), (200,255,80))]
    for (ox3, oy3), oc3 in orb_data:
        glow_circle(draw, ox3, oy3, oc3, 16, 180)
        draw.ellipse([ox3-5, oy3-5, ox3+5, oy3+5], fill=oc3+(220,))

    # Scattered brushes on floor
    brush_colors = [(100,70,40), (80,60,30), (120,85,50)]
    for bi2 in range(4):
        bp = s(1.5+bi2*0.6, 4.5, 0.01)
        bc2 = brush_colors[bi2%len(brush_colors)]
        draw.line([(bp[0]-1, bp[1]-15), (bp[0]+1, bp[1]+5)], fill=bc2+(200,), width=2)
        draw.ellipse([bp[0]-4, bp[1]-18, bp[0]+4, bp[1]-12], fill=paint_splash_colors[bi2]+(180,))

    # Creative sparkles
    rng3 = random.Random(33)
    for _ in range(22):
        px3, py3 = rng3.randint(30, W-30), rng3.randint(30, H-70)
        c3 = rng3.choice(paint_splash_colors)
        r3 = rng3.randint(1,3)
        draw.ellipse([px3-r3, py3-r3, px3+r3, py3+r3], fill=c3+(rng3.randint(60,180),))

    img = img.filter(ImageFilter.GaussianBlur(0.4))
    return img


# ─────────────────────────────────────────────────────────────────────────────
# TREASURY — gold coins, chests, gem displays, vault door, monitors
# ─────────────────────────────────────────────────────────────────────────────
def make_treasury():
    img = Image.new("RGBA", (W, H))
    draw = ImageDraw.Draw(img, "RGBA")
    gradient_bg(draw, (18, 14, 3), (6, 5, 1))

    # Gold glow spots
    rng = random.Random(9)
    for _ in range(5):
        cx, cy = rng.randint(80, W-80), rng.randint(40, H-80)
        for r in range(90, 0, -9):
            a = int(14*(1-r/90))
            draw.ellipse([cx-r, cy-r*0.6, cx+r, cy+r*0.6], fill=(200,160,10,a))

    OX, OY = W//2 + 5, H//2 - 12
    TW, TH, HS = 44, 22, 28

    def s(x, y, z=0): return iso_pt(x, y, z, OX, OY, TW, TH, HS)

    # Gold-stone floor
    gold_colors = [(38, 28, 5), (42, 32, 7), (35, 26, 4), (46, 35, 8)]
    for gx in range(8):
        for gy in range(5):
            c = gold_colors[(gx*5+gy*9)%len(gold_colors)]
            # Shiny inlays
            if (gx+gy) % 3 == 0:
                c = lighten(c, 10)
            iso_floor(draw, gx, gy, OX, OY, c, TW, TH)

    # Gold inlay pattern
    center = s(4, 2.5, 0.01)
    for r in range(35, 0, -5):
        a = int(40*(1-r/35))
        draw.ellipse([center[0]-r*2.2, center[1]-r, center[0]+r*2.2, center[1]+r],
                     outline=(220,180,30,a), width=1)

    # Walls — stone vault
    wc = (30, 22, 8)
    for gx in range(8): wall_seg_left(draw, gx, 0, 1, 3.5, OX, OY, wc, TW, TH, HS)
    for gy in range(5): wall_seg_right(draw, gy, 7, 8, 3.5, OX, OY, wc, TW, TH, HS)

    # VAULT DOOR — huge circular
    vd_pos = s(3.5, 0, 1.5)
    # Door frame
    draw.ellipse([vd_pos[0]-45, vd_pos[1]-38, vd_pos[0]+45, vd_pos[1]+38],
                 fill=(50, 38, 15, 240))
    draw.ellipse([vd_pos[0]-45, vd_pos[1]-38, vd_pos[0]+45, vd_pos[1]+38],
                 outline=(200,160,30,200), width=3)
    # Vault rings
    for r in [38, 32, 26, 20]:
        draw.ellipse([vd_pos[0]-r, vd_pos[1]-r*0.85, vd_pos[0]+r, vd_pos[1]+r*0.85],
                     outline=(180,140,20,120), width=1)
    # Vault spokes
    for ang in range(0, 360, 45):
        rad = math.radians(ang)
        vx1 = int(vd_pos[0] + 20*math.cos(rad))
        vy1 = int(vd_pos[1] + 17*math.sin(rad))
        vx2 = int(vd_pos[0] + 38*math.cos(rad))
        vy2 = int(vd_pos[1] + 32*math.sin(rad))
        draw.line([(vx1,vy1),(vx2,vy2)], fill=(180,140,20,160), width=2)
    # Vault handle
    draw.ellipse([vd_pos[0]-6, vd_pos[1]-5, vd_pos[0]+6, vd_pos[1]+5],
                 fill=(220,180,30,240))
    draw.ellipse([vd_pos[0]-8, vd_pos[1]-7, vd_pos[0]+8, vd_pos[1]+7],
                 outline=(255,220,80,200), width=2)
    # Vault glow
    for r in range(55, 0, -5):
        a = int(25*(1-r/55))
        draw.ellipse([vd_pos[0]-r, vd_pos[1]-r*0.85, vd_pos[0]+r, vd_pos[1]+r*0.85],
                     fill=(220,180,30,a))

    # Treasure chests (3 big ones)
    chest_data = [(0.3, 1.5), (1.5, 3.5), (6, 1.5)]
    for cx4, cy4 in chest_data:
        # Chest body
        iso_box(draw, cx4, cy4, 1.2, 0.9, 0.8, OX, OY, (80, 50, 15), TW, TH, HS)
        # Chest lid
        ct = s(cx4+0.6, cy4+0.45, 0.82)
        draw.ellipse([ct[0]-18, ct[1]-10, ct[0]+18, ct[1]+10], fill=(100,65,20,220))
        draw.ellipse([ct[0]-18, ct[1]-10, ct[0]+18, ct[1]+10], outline=(200,160,30,180), width=2)
        # Lock
        draw.rectangle([ct[0]-4, ct[1]-4, ct[0]+4, ct[1]+4], fill=(200,160,30,230))
        draw.ellipse([ct[0]-3, ct[1]-3, ct[0]+3, ct[1]+3], fill=(220,190,50,255))
        # Gold glow from chest
        glow_circle(draw, ct[0], ct[1], (220,180,30), 25, 100)
        # Overflow gold coins
        for ci in range(5):
            angle = ci * 2*math.pi/5 - math.pi/2
            coin_p = (int(ct[0] + 12*math.cos(angle)), int(ct[1] + 7*math.sin(angle)))
            draw.ellipse([coin_p[0]-3, coin_p[1]-2, coin_p[0]+3, coin_p[1]+2], fill=(220,190,40,220))

    # Gold coin piles
    for pile_x, pile_y in [(2.5, 1.5), (3.5, 3.5), (5, 2.5), (6.5, 3)]:
        pp = s(pile_x, pile_y, 0.01)
        # Pile base
        for r in range(18, 0, -3):
            a = int(120*(1-r/18))
            draw.ellipse([pp[0]-r*2, pp[1]-r, pp[0]+r*2, pp[1]+r], fill=(200,160,20,a))
        # Individual coins
        rng3 = random.Random(int(pile_x*10+pile_y*100))
        for _ in range(8):
            cx5 = pp[0] + rng3.randint(-14, 14)
            cy5 = pp[1] + rng3.randint(-6, 6)
            draw.ellipse([cx5-4, cy5-2, cx5+4, cy5+2], fill=(220,190,40,200))
            draw.ellipse([cx5-4, cy5-2, cx5+4, cy5+2], outline=(240,210,60,150), width=1)

    # Gem display cases
    gem_data = [
        (5.5, 0.4, (255,50,80), "ruby"),    # red gem
        (6.5, 0.4, (80,150,255), "sapphire"), # blue gem
        (7.2, 1, (80,255,150), "emerald"),   # green gem
    ]
    for gx6, gy6, gc6, _ in gem_data:
        iso_box(draw, gx6, gy6, 0.7, 0.7, 0.9, OX, OY, (20,15,5), TW, TH, HS)
        gp = s(gx6+0.35, gy6+0.35, 1.1)
        # Gem facets
        draw.polygon([(gp[0], gp[1]-12), (gp[0]-8, gp[1]-3), (gp[0], gp[1]+8), (gp[0]+8, gp[1]-3)],
                     fill=gc6+(200,))
        draw.polygon([(gp[0], gp[1]-12), (gp[0]-8, gp[1]-3), (gp[0]+8, gp[1]-3)],
                     fill=lighten(gc6, 60)+(220,))
        # Gem glow
        for r in range(15, 0, -2):
            a = int(60*(1-r/15))
            draw.ellipse([gp[0]-r, gp[1]-r, gp[0]+r, gp[1]+r], fill=gc6+(a,))
        # Sparkle
        for ang in [0, 90, 180, 270]:
            rad = math.radians(ang)
            draw.line([(gp[0], gp[1]), (gp[0]+int(8*math.cos(rad)), gp[1]+int(5*math.sin(rad)))],
                      fill=(255,255,255,120), width=1)

    # Financial monitors (accounting screens)
    for mx, my, mc2 in [(0.3, 0.1, (0,255,150)), (1.5, 0.1, (255,200,0))]:
        iso_box(draw, mx, my, 1.0, 0.1, 1.6, OX, OY, (20,15,5), TW, TH, HS)
        msp = s(mx+0.5, my+0.05, 1.6)
        for r in range(15, 0, -2):
            a = int(60*(1-r/15))
            draw.ellipse([msp[0]-r*1.5, msp[1]-r, msp[0]+r*1.5, msp[1]+r], fill=mc2+(a,))
        # Chart lines on screen
        prev_p = None
        for li in range(8):
            chart_x = msp[0] - 12 + li*4
            chart_y = msp[1] - 8 + int(5*math.sin(li*0.8))
            p3 = (chart_x, chart_y)
            if prev_p:
                draw.line([prev_p, p3], fill=mc2+(160,), width=1)
            draw.ellipse([chart_x-1, chart_y-1, chart_x+1, chart_y+1], fill=mc2+(220,))
            prev_p = p3

    # Floating gold coins (ambient)
    rng4 = random.Random(55)
    for _ in range(18):
        px4, py4 = rng4.randint(40, W-40), rng4.randint(30, H-70)
        r4 = rng4.randint(2,5)
        a4 = rng4.randint(60,160)
        draw.ellipse([px4-r4, py4-r4*0.6, px4+r4, py4+r4*0.6], fill=(220,180,30,a4))

    # Gold ambient glow (overall)
    for r in range(60, 0, -6):
        a = int(18*(1-r/60))
        draw.ellipse([W//2-r*2.5, H//2-r, W//2+r*2.5, H//2+r], fill=(200,160,20,a))

    img = img.filter(ImageFilter.GaussianBlur(0.4))
    return img


# ─────────────────────────────────────────────────────────────────────────────
# Main — generate all rooms
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("Generating Grim's Chamber...")
    grim = make_grim()
    grim.save(f"{OUT_DIR}/grim-chamber.png")
    print(f"  Saved grim-chamber.png ({W}x{H})")

    print("Generating Bob's Library...")
    bob = make_bob()
    bob.save(f"{OUT_DIR}/bob-library.png")
    print(f"  Saved bob-library.png ({W}x{H})")

    print("Generating Kevin's Workshop...")
    kevin = make_kevin()
    kevin.save(f"{OUT_DIR}/kevin-workshop.png")
    print(f"  Saved kevin-workshop.png ({W}x{H})")

    print("Generating Agnes's Studio...")
    agnes = make_agnes()
    agnes.save(f"{OUT_DIR}/agnes-studio.png")
    print(f"  Saved agnes-studio.png ({W}x{H})")

    print("Generating Treasury...")
    treasury = make_treasury()
    treasury.save(f"{OUT_DIR}/treasury.png")
    print(f"  Saved treasury.png ({W}x{H})")

    print("\n✅ All 5 room backgrounds generated!")
