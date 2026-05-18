#!/usr/bin/env python3
"""Generate detailed isometric room backgrounds - clean RGB version."""

from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math, random, os

W, H = 500, 400
OUT_DIR = "/home/ubuntu/.openclaw/workspace/dungeon-interface/public/assets/rooms"
os.makedirs(OUT_DIR, exist_ok=True)

def lerp(a, b, t): return a + (b - a) * t
def lerp_color(c1, c2, t): return tuple(int(lerp(c1[i], c2[i], t)) for i in range(len(c1)))
def darken(c, f=0.7): return tuple(max(0, int(x * f)) for x in c[:3])
def lighten(c, a=30): return tuple(min(255, x + a) for x in c[:3])

def gradient_bg(img, top, bot):
    d = ImageDraw.Draw(img)
    for y in range(H):
        c = lerp_color(top, bot, y / H)
        d.line([(0, y), (W, y)], fill=c)

def pt(x, y, z, ox, oy, tw=44, th=22, hs=28):
    return (ox + int((x-y)*tw/2), oy + int((x+y)*th/2) - int(z*hs))

def floor_tile(d, gx, gy, ox, oy, col, tw=44, th=22):
    tl=pt(gx,gy,0,ox,oy,tw,th); tr=pt(gx+1,gy,0,ox,oy,tw,th)
    br=pt(gx+1,gy+1,0,ox,oy,tw,th); bl=pt(gx,gy+1,0,ox,oy,tw,th)
    d.polygon([tl,tr,br,bl], fill=col)
    d.line([tl,tr], fill=lighten(col,18), width=1)
    d.line([tl,bl], fill=lighten(col,10), width=1)
    d.line([tr,br], fill=darken(col,0.7), width=1)
    d.line([bl,br], fill=darken(col,0.72), width=1)

def wall_l(d, gx, gy1, gy2, h, ox, oy, col, tw=44, th=22, hs=28):
    bl=pt(gx,gy2,0,ox,oy,tw,th,hs); tl=pt(gx,gy2,h,ox,oy,tw,th,hs)
    tr=pt(gx,gy1,h,ox,oy,tw,th,hs); br=pt(gx,gy1,0,ox,oy,tw,th,hs)
    d.polygon([bl,tl,tr,br], fill=darken(col,0.62))
    d.line([tl,tr], fill=lighten(col,25), width=1)

def wall_r(d, gy, gx1, gx2, h, ox, oy, col, tw=44, th=22, hs=28):
    bl=pt(gx1,gy,0,ox,oy,tw,th,hs); br=pt(gx2,gy,0,ox,oy,tw,th,hs)
    tr=pt(gx2,gy,h,ox,oy,tw,th,hs); tl=pt(gx1,gy,h,ox,oy,tw,th,hs)
    d.polygon([bl,br,tr,tl], fill=darken(col,0.78))
    d.line([tl,tr], fill=lighten(col,15), width=1)

def box(d, x, y, w, dep, h, ox, oy, tc, tw=44, th=22, hs=28):
    p = lambda ix,iy,iz: pt(ix,iy,iz,ox,oy,tw,th,hs)
    top = [p(x,y,h), p(x+w,y,h), p(x+w,y+dep,h), p(x,y+dep,h)]
    d.polygon(top, fill=tc); d.polygon(top, outline=darken(tc,0.5), width=1)
    lft = [p(x,y,0), p(x,y,h), p(x,y+dep,h), p(x,y+dep,0)]
    d.polygon(lft, fill=darken(tc,0.60)); d.polygon(lft, outline=darken(tc,0.42), width=1)
    frnt = [p(x,y,0), p(x+w,y,0), p(x+w,y,h), p(x,y,h)]
    d.polygon(frnt, fill=darken(tc,0.76)); d.polygon(frnt, outline=darken(tc,0.55), width=1)

def glow(img, cx, cy, color, radius=20, strength=0.35):
    """Screen-blend a soft glow onto the RGB image."""
    gl = Image.new("RGB", img.size, (0,0,0))
    gd = ImageDraw.Draw(gl)
    for r in range(radius, 0, -2):
        t = (1 - r/radius) ** 1.8
        gc = tuple(min(255, int(c * strength * t)) for c in color[:3])
        gd.ellipse([cx-r, cy-r, cx+r, cy+r], fill=gc)
    return ImageChops.screen(img, gl)


# ── GRIM'S CHAMBER ────────────────────────────────────────────────────────────
def make_grim():
    img = Image.new("RGB", (W,H))
    gradient_bg(img, (10,4,22), (3,1,8))
    d = ImageDraw.Draw(img)
    OX,OY = W//2+20, H//2+10
    TW,TH,HS = 44,22,28
    s = lambda x,y,z=0: pt(x,y,z,OX,OY,TW,TH,HS)

    fl = [(22,14,36),(26,17,42),(18,12,30),(28,19,46)]
    for gx in range(8):
        for gy in range(6):
            c = fl[(gx*3+gy*7)%4]
            if gx in [3,4] and gy in [2,3]: c=(32,12,62)
            floor_tile(d,gx,gy,OX,OY,c,TW,TH)

    rp=[s(3,2),s(5,2),s(5,4),s(3,4)]
    d.polygon(rp, outline=(160,40,220), width=1)
    d.polygon([s(3.3,2.3),s(4.7,2.3),s(4.7,3.7),s(3.3,3.7)], outline=(140,30,200), width=1)
    rc=((rp[0][0]+rp[2][0])//2, (rp[0][1]+rp[2][1])//2)
    d.ellipse([rc[0]-20,rc[1]-10,rc[0]+20,rc[1]+10], outline=(150,40,210), width=1)

    wc=(32,20,58)
    for gx in range(8): wall_l(d,gx,0,1,3.5,OX,OY,wc,TW,TH,HS)
    for gy in range(6): wall_r(d,gy,7,8,3.5,OX,OY,wc,TW,TH,HS)

    mon_xs=[0.3,1.2,2.2,4.8,5.8]
    mon_cs=[(0,180,255),(220,40,90),(0,220,130),(180,80,240),(240,160,0)]
    for i,mx in enumerate(mon_xs):
        box(d,mx,0.05,0.7,0.08,1.8,OX,OY,(22,17,38),TW,TH,HS)
        mc=mon_cs[i]
        scr=[s(mx+0.05,0.05,0.25),s(mx+0.65,0.05,0.25),s(mx+0.65,0.05,1.75),s(mx+0.05,0.05,1.75)]
        d.polygon(scr, fill=darken(mc,0.18))
        for li in range(4):
            lz=0.35+li*0.35
            d.line([s(mx+0.08,0.05,lz),s(mx+0.62,0.05,lz)], fill=darken(mc,0.55), width=1)
        sp=s(mx+0.35,0.05,1.8)
        d.ellipse([sp[0]-3,sp[1]-3,sp[0]+3,sp[1]+3], fill=mc)
        img = glow(img,sp[0],sp[1],mc,14,0.5)

    box(d,3.1,0.15,1.8,1.3,2.6,OX,OY,(36,16,62),TW,TH,HS)
    box(d,3.0,0.25,0.22,1.1,2.9,OX,OY,(52,20,80),TW,TH,HS)
    box(d,4.68,0.25,0.22,1.1,2.9,OX,OY,(52,20,80),TW,TH,HS)
    tt=s(4,0.2,2.9)
    for i in range(5):
        sx=tt[0]+(i-2)*9
        d.polygon([(sx,tt[1]-14),(sx-4,tt[1]+2),(sx+4,tt[1]+2)], fill=(220,180,20))
    for ex in [tt[0]-11,tt[0]+11]:
        ey=tt[1]-18
        d.ellipse([ex-5,ey-3,ex+5,ey+3], fill=(180,15,15))
        d.ellipse([ex-2,ey-1,ex+2,ey+1], fill=(255,120,120))

    box(d,2.3,1.8,3.2,1.8,0.65,OX,OY,(42,24,70),TW,TH,HS)
    for i in range(5):
        t2=i/4
        d.line([s(2.7+t2*2.5,1.9,0.70),s(2.7+t2*2.5,3.5,0.70)], fill=(0,130,200), width=1)
        d.line([s(2.7,1.9+t2*1.6,0.70),s(5.2,1.9+t2*1.6,0.70)], fill=(0,130,200), width=1)
    for mx2,my2,mc2 in [(3.3,2.4,(220,40,40)),(4.2,2.0,(40,220,80)),(3.8,3.0,(220,190,0))]:
        mp=s(mx2,my2,0.75)
        d.ellipse([mp[0]-4,mp[1]-4,mp[0]+4,mp[1]+4], fill=mc2)

    box(d,7.2,1.2,0.5,0.5,1.1,OX,OY,(38,18,68),TW,TH,HS)
    op=s(7.45,1.45,1.35)
    d.ellipse([op[0]-10,op[1]-10,op[0]+10,op[1]+10], fill=(100,30,180))
    d.ellipse([op[0]-6,op[1]-6,op[0]+6,op[1]+6], fill=(150,60,230))
    d.ellipse([op[0]-3,op[1]-3,op[0]+3,op[1]+3], fill=(200,150,255))
    img = glow(img,op[0],op[1],(140,40,230),28,0.5)

    for cx2 in [1.5,6.5]:
        cp=s(cx2,0.8,3.5); cb=s(cx2,0.8,0.5)
        d.line([cp,cb], fill=(70,55,95), width=2)
        for ci in range(5):
            ch=s(cx2,0.8,3.5-ci*0.6)
            d.ellipse([ch[0]-3,ch[1]-2,ch[0]+3,ch[1]+2], outline=(90,70,120), width=1)

    for i,cc3 in enumerate([(160,0,50),(0,120,180),(100,0,180)]):
        p1=s(7.2,i*1.5+0.5,0.05); p2=s(2.0,i*1.5+1.0,0.05)
        d.line([p1,p2], fill=cc3, width=2)

    rng=random.Random(42)
    for _ in range(20):
        px2,py2=rng.randint(30,W-30),rng.randint(30,H-60)
        c2=rng.choice([(120,30,200),(180,30,80),(0,140,220)])
        d.ellipse([px2-1,py2-1,px2+1,py2+1], fill=c2)

    img = glow(img,s(4,0.9)[0],s(4,0.9)[1],(120,10,40),50,0.15)
    img = glow(img,rc[0],rc[1],(100,20,180),25,0.2)
    return img.filter(ImageFilter.GaussianBlur(0.5))


# ── BOB'S LIBRARY ─────────────────────────────────────────────────────────────
def make_bob():
    img = Image.new("RGB", (W,H))
    gradient_bg(img, (7,12,32), (3,5,16))
    d = ImageDraw.Draw(img)
    OX,OY = W//2-5, H//2
    TW,TH,HS = 44,22,26
    s = lambda x,y,z=0: pt(x,y,z,OX,OY,TW,TH,HS)

    wds=[(38,24,12),(32,20,9),(42,28,15),(30,18,7)]
    for gx in range(8):
        for gy in range(6):
            floor_tile(d,gx,gy,OX,OY,wds[(gx*5+gy*3)%4],TW,TH)

    rp=[s(2,2),s(5,2),s(5,4),s(2,4)]
    d.polygon(rp, fill=(50,25,70))
    d.polygon([s(2.2,2.2),s(4.8,2.2),s(4.8,3.8),s(2.2,3.8)], outline=(90,55,130), width=1)
    d.polygon([s(2.45,2.4),s(4.55,2.4),s(4.55,3.6),s(2.45,3.6)], outline=(120,80,160), width=1)

    wc=(24,18,44)
    for gx in range(8): wall_l(d,gx,0,1,3.8,OX,OY,wc,TW,TH,HS)
    for gy in range(6): wall_r(d,gy,7,8,3.8,OX,OY,wc,TW,TH,HS)

    bk=[(180,40,40),(200,150,30),(40,100,180),(30,140,60),(150,50,180),
        (200,100,40),(80,80,180),(180,60,120),(60,160,160),(220,80,40)]
    box(d,0.05,0.05,1.9,0.65,3.5,OX,OY,(44,29,15),TW,TH,HS)
    for bi in range(9):
        bx=0.1+bi*0.19
        if bx>1.85: break
        box(d,bx,0.08,0.16,0.52,0.9,OX,OY,bk[bi%len(bk)],TW,TH,HS)

    box(d,6.05,0.05,1.9,0.65,3.5,OX,OY,(40,25,12),TW,TH,HS)
    for bi in range(9):
        bx=6.1+bi*0.19
        if bx>7.9: break
        box(d,bx,0.08,0.16,0.52,0.9,OX,OY,bk[(bi+5)%len(bk)],TW,TH,HS)

    box(d,2.4,1.5,3.2,2.2,0.72,OX,OY,(50,32,16),TW,TH,HS)
    bp=s(3.5,2.7,0.74)
    d.polygon([(bp[0]-22,bp[1]+4),(bp[0],bp[1]-8),(bp[0]+2,bp[1]+6),(bp[0]-20,bp[1]+12)], fill=(230,225,200))
    d.polygon([(bp[0]+2,bp[1]+6),(bp[0],bp[1]-8),(bp[0]+24,bp[1]-4),(bp[0]+22,bp[1]+8)], fill=(218,212,190))
    for li in range(5):
        d.line([(bp[0]-18+li,bp[1]+li*2-2),(bp[0]-5+li,bp[1]+li*2-5)], fill=(80,62,42), width=1)

    for cx2,cy2 in [s(2.8,2.0,0.74),s(5.1,3.5,0.74)]:
        d.rectangle([cx2-2,cy2-14,cx2+2,cy2], fill=(200,200,180))
        d.ellipse([cx2-4,cy2-22,cx2+4,cy2-13], fill=(180,120,20))
        d.ellipse([cx2-2,cy2-18,cx2+2,cy2-14], fill=(255,240,120))
        img=glow(img,cx2,cy2-18,(220,160,20),18,0.4)

    crysts=[(s(4.5,1,2.2),(80,170,240)),(s(1.5,4.5,1.2),(170,110,230)),(s(5.5,4,1.5),(100,220,160))]
    for (cx3,cy3),cc3 in crysts:
        d.polygon([(cx3,cy3-16),(cx3-9,cy3),(cx3,cy3+10),(cx3+9,cy3)], fill=cc3)
        d.polygon([(cx3,cy3-16),(cx3-9,cy3),(cx3+9,cy3)], fill=lighten(cc3,50))
        d.polygon([(cx3,cy3-16),(cx3-9,cy3),(cx3,cy3+10),(cx3+9,cy3)], outline=lighten(cc3,80), width=1)
        d.ellipse([cx3-2,cy3-14,cx3+3,cy3-10], fill=(255,255,255))
        img=glow(img,cx3,cy3,cc3,20,0.35)

    hp=s(3.9,2.5,2.6)
    d.ellipse([hp[0]-18,hp[1]-12,hp[0]+18,hp[1]+12], fill=(15,60,130))
    d.ellipse([hp[0]-18,hp[1]-12,hp[0]+18,hp[1]+12], outline=(60,140,240), width=2)
    for ang in range(0,360,45):
        rad=math.radians(ang)
        d.line([hp,(int(hp[0]+16*math.cos(rad)),int(hp[1]+10*math.sin(rad)))], fill=(60,140,240), width=1)
    d.ellipse([hp[0]-3,hp[1]-3,hp[0]+3,hp[1]+3], fill=(180,230,255))
    img=glow(img,hp[0],hp[1],(30,100,220),35,0.4)

    box(d,7.25,2.2,0.5,2.8,1.8,OX,OY,(40,25,12),TW,TH,HS)
    for si in range(7):
        sp2=s(7.3,2.4+si*0.38,0.15+si*0.22)
        d.ellipse([sp2[0]-4,sp2[1]-7,sp2[0]+4,sp2[1]+7], fill=(195,185,155))

    rng2=random.Random(15)
    for _ in range(15):
        px2,py2=rng2.randint(40,W-40),rng2.randint(40,H-70)
        d.ellipse([px2-1,py2-1,px2+1,py2+1], fill=rng2.choice([(80,160,240),(190,170,80),(120,220,170)]))

    return img.filter(ImageFilter.GaussianBlur(0.4))


# ── KEVIN'S WORKSHOP ──────────────────────────────────────────────────────────
def make_kevin():
    img = Image.new("RGB", (W,H))
    gradient_bg(img, (18,8,3), (6,3,1))
    d = ImageDraw.Draw(img)
    OX,OY = W//2+10, H//2
    TW,TH,HS = 44,22,28
    s = lambda x,y,z=0: pt(x,y,z,OX,OY,TW,TH,HS)
    rng=random.Random(3)

    fl=[(30,23,18),(24,18,13),(34,27,21),(26,20,15)]
    for gx in range(8):
        for gy in range(6):
            c=fl[(gx*7+gy*11)%4]
            if rng.random()<0.07: c=darken(c,0.72)
            floor_tile(d,gx,gy,OX,OY,c,TW,TH)

    for gx in range(3,5):
        for gy in range(3,5):
            pt2=[s(gx,gy),s(gx+1,gy),s(gx+1,gy+1),s(gx,gy+1)]
            col=(42,36,5) if (gx+gy)%2==0 else (18,14,2)
            d.polygon(pt2, fill=col); d.polygon(pt2, outline=(72,62,10), width=1)

    wc=(38,27,18)
    for gx in range(8): wall_l(d,gx,0,1,3.5,OX,OY,wc,TW,TH,HS)
    for gy in range(6): wall_r(d,gy,7,8,3.5,OX,OY,wc,TW,TH,HS)

    for bpx,bpy in [(1.0,0.05),(3.5,0.05),(5.5,0.05)]:
        bpos=s(bpx,0,2.5)
        d.rectangle([bpos[0]-16,bpos[1]-24,bpos[0]+16,bpos[1]+6], fill=(15,25,60))
        d.rectangle([bpos[0]-16,bpos[1]-24,bpos[0]+16,bpos[1]+6], outline=(60,100,180), width=1)
        for li in range(4):
            d.line([(bpos[0]-13,bpos[1]-20+li*7),(bpos[0]+13,bpos[1]-20+li*7)], fill=(60,110,200), width=1)
            if li < 3:
                d.line([(bpos[0]-13+li*9,bpos[1]-20),(bpos[0]-13+li*9,bpos[1]+4)], fill=(60,110,200), width=1)
        d.ellipse([bpos[0]-5,bpos[1]-12,bpos[0]+5,bpos[1]-2], outline=(100,160,255), width=1)

    box(d,0.2,0.5,3.5,1.2,0.75,OX,OY,(45,32,20),TW,TH,HS)
    box(d,0.2,0.5,0.6,3.5,0.65,OX,OY,(42,30,18),TW,TH,HS)

    tool_c=[(160,120,80),(180,100,50),(120,130,140),(150,150,160),(200,160,80),(130,110,100)]
    for i,(tx,ty,tz) in enumerate([(0.4,0.6,0.77),(0.7,0.7,0.77),(1.0,0.8,0.77),
                                    (1.5,0.6,0.77),(2.0,0.7,0.77),(2.5,0.6,0.77)]):
        tc=tool_c[i%len(tool_c)]
        tp=s(tx,ty,tz)
        d.rectangle([tp[0]-2,tp[1]-12,tp[0]+2,tp[1]], fill=tc)
        d.ellipse([tp[0]-4,tp[1]-14,tp[0]+4,tp[1]-8], fill=lighten(tc,20))

    box(d,1.2,1.0,1.5,0.9,0.78,OX,OY,(8,45,18),TW,TH,HS)
    cb=s(1.95,1.45,0.8)
    for ci in range(5):
        d.line([(cb[0]-18+ci*9,cb[1]+3),(cb[0]-18+ci*9,cb[1]-12)], fill=(0,200,100), width=1)
    for ri in range(3):
        d.line([(cb[0]-18,cb[1]-3+ri*6),(cb[0]+22,cb[1]-3+ri*6)], fill=(0,180,80), width=1)
    for cx3,cy3 in [(cb[0]-10,cb[1]-6),(cb[0]+5,cb[1]-10),(cb[0]+12,cb[1]-2),(cb[0]-3,cb[1]+2)]:
        d.ellipse([cx3-3,cy3-3,cx3+3,cy3+3], fill=(220,180,0))
        img=glow(img,cx3,cy3,(220,180,0),8,0.4)

    wa=s(2.8,0.9,0.8)
    d.ellipse([wa[0]-5,wa[1]-5,wa[0]+5,wa[1]+5], fill=(255,255,220))
    img=glow(img,wa[0],wa[1],(200,200,255),20,0.6)
    rng2=random.Random(99)
    for _ in range(14):
        ang=rng2.uniform(0,2*math.pi); length=rng2.randint(5,22)
        ex2=int(wa[0]+length*math.cos(ang)); ey2=int(wa[1]+length*math.sin(ang)*0.5)
        sc2=(255,rng2.randint(150,255),rng2.randint(0,80))
        d.line([wa,(ex2,ey2)], fill=sc2, width=1)

    box(d,7.2,0.3,0.5,2.0,2.5,OX,OY,(38,28,18),TW,TH,HS)
    for si in range(3):
        sp2=s(7.25,0.5+si*0.65,0.4+si*0.7)
        d.ellipse([sp2[0]-8,sp2[1]-4,sp2[0]+8,sp2[1]+4], fill=(50,40,30))
        for pi in range(4):
            ang=pi*math.pi/2
            ppx=int(sp2[0]+4*math.cos(ang)); ppy=int(sp2[1]+2*math.sin(ang))
            d.ellipse([ppx-2,ppy-2,ppx+2,ppy+2], fill=(140,120,90))

    box(d,3.5,2.5,2,2,1.2,OX,OY,(55,40,25),TW,TH,HS)
    mc3=s(4.5,3.5,1.4)
    d.ellipse([mc3[0]-8,mc3[1]-8,mc3[0]+8,mc3[1]+8], fill=(200,100,10))
    d.ellipse([mc3[0]-4,mc3[1]-4,mc3[0]+4,mc3[1]+4], fill=(255,200,80))
    d.ellipse([mc3[0]-1,mc3[1]-1,mc3[0]+1,mc3[1]+1], fill=(255,255,200))
    img=glow(img,mc3[0],mc3[1],(255,140,0),30,0.5)
    for ang in [0,90,180,270]:
        rad=math.radians(ang)
        ex2=int(mc3[0]+28*math.cos(rad)); ey2=int(mc3[1]+16*math.sin(rad))
        d.line([(mc3[0],mc3[1]),(ex2,ey2)], fill=(100,80,50), width=3)
        d.ellipse([ex2-3,ey2-3,ex2+3,ey2+3], fill=(130,100,60))

    lp=s(3.5,2,3.5)
    d.rectangle([lp[0]-15,lp[1]-4,lp[0]+15,lp[1]+2], fill=(60,50,40))
    img=glow(img,lp[0],lp[1]+5,(220,200,130),40,0.3)

    rng3=random.Random(88)
    for _ in range(22):
        px3,py3=rng3.randint(30,W-30),rng3.randint(30,H-80)
        cc3=rng3.choice([(220,160,40),(255,120,20),(255,230,80)])
        d.ellipse([px3-1,py3-1,px3+1,py3+1], fill=cc3)

    return img.filter(ImageFilter.GaussianBlur(0.4))


# ── AGNES'S STUDIO ────────────────────────────────────────────────────────────
def make_agnes():
    img = Image.new("RGB", (W,H))
    gradient_bg(img, (18,5,20), (8,3,12))
    d = ImageDraw.Draw(img)
    OX,OY = W//2, H//2
    TW,TH,HS = 44,22,26
    s = lambda x,y,z=0: pt(x,y,z,OX,OY,TW,TH,HS)
    rng=random.Random(7)

    fl=[(22,15,28),(20,12,25),(25,17,32),(18,12,22)]
    for gx in range(8):
        for gy in range(6):
            floor_tile(d,gx,gy,OX,OY,fl[(gx*3+gy*7)%4],TW,TH)

    paint_c=[(200,50,80),(50,180,200),(200,200,50),(180,50,200),(50,200,100)]
    rng2=random.Random(44)
    for _ in range(18):
        spx=rng2.uniform(0.5,7.5); spy=rng2.uniform(0.5,5.5)
        pc=paint_c[rng2.randint(0,4)]
        pp=s(spx,spy,0.01)
        for r in [6,4,2]:
            dark_pc=darken(pc,0.4+r*0.1)
            d.ellipse([pp[0]-r,pp[1]-r//2,pp[0]+r,pp[1]+r//2], fill=dark_pc)

    wc=(30,18,42)
    for gx in range(8): wall_l(d,gx,0,1,3.5,OX,OY,wc,TW,TH,HS)
    for gy in range(6): wall_r(d,gy,7,8,3.5,OX,OY,wc,TW,TH,HS)

    for ibx,iby in [(1.5,0.05),(4.5,0.05)]:
        ibpos=s(ibx,0,2.8)
        d.rectangle([ibpos[0]-20,ibpos[1]-28,ibpos[0]+20,ibpos[1]+8], fill=(15,10,25))
        d.rectangle([ibpos[0]-20,ibpos[1]-28,ibpos[0]+20,ibpos[1]+8], outline=(160,60,160), width=1)
        sks=[(200,50,80),(50,180,200),(200,200,50),(180,50,200)]
        for sk,(skc) in enumerate(sks):
            skx=ibpos[0]-17+(sk%2)*19; sky=ibpos[1]-24+(sk//2)*17
            d.rectangle([skx,sky,skx+16,sky+14], fill=darken(skc,0.6))
            d.rectangle([skx,sky,skx+16,sky+14], outline=lighten(skc,20), width=1)
        for pkx in [ibpos[0]-10,ibpos[0]+10]:
            d.ellipse([pkx-2,ibpos[1]-26,pkx+2,ibpos[1]-22], fill=(220,50,50))

    for ea_x,ea_y,c_idx in [(1.5,2,0),(3.0,1.5,1),(5.5,1.2,2)]:
        ea=s(ea_x,ea_y,0)
        d.line([ea,(ea[0]-15,ea[1]+30)], fill=(80,55,30), width=2)
        d.line([ea,(ea[0]+15,ea[1]+30)], fill=(80,55,30), width=2)
        d.line([(ea[0]-8,ea[1]+20),(ea[0]+12,ea[1]+20)], fill=(80,55,30), width=1)
        d.rectangle([ea[0]-16,ea[1]-28,ea[0]+16,ea[1]+4], fill=(220,215,200))
        d.rectangle([ea[0]-16,ea[1]-28,ea[0]+16,ea[1]+4], outline=(110,85,45), width=2)
        for stroke in range(4):
            sc2=paint_c[(stroke+c_idx)%5]
            sx2=ea[0]-12+stroke*6
            d.line([(sx2,ea[1]-22),(sx2+8,ea[1]-8)], fill=sc2, width=2)

    box(d,4.5,2.5,3,2,0.65,OX,OY,(35,25,45),TW,TH,HS)

    tube_c=[(220,50,80),(60,180,220),(230,230,60),(170,60,220),(60,220,110),(230,130,60)]
    for ti,tc in enumerate(tube_c):
        tx3=4.6+(ti%3)*0.9; ty3=2.6+(ti//3)*0.85
        tp=s(tx3,ty3,0.67)
        d.ellipse([tp[0]-4,tp[1]-10,tp[0]+4,tp[1]+2], fill=tc)
        d.line([(tp[0],tp[1]-10),(tp[0]+3,tp[1]-14)], fill=lighten(tc,40), width=2)

    pal=s(5,3.5,0.67)
    d.ellipse([pal[0]-14,pal[1]-8,pal[0]+14,pal[1]+8], fill=(200,190,175))
    d.ellipse([pal[0]-14,pal[1]-8,pal[0]+14,pal[1]+8], outline=(100,80,55), width=1)
    for bi,bc in enumerate([(220,50,80),(60,200,220),(240,240,60),(180,60,220),(60,220,100)]):
        ang=bi*2*math.pi/5
        d.ellipse([int(pal[0]+8*math.cos(ang))-3,int(pal[1]+5*math.sin(ang))-2,
                   int(pal[0]+8*math.cos(ang))+3,int(pal[1]+5*math.sin(ang))+2], fill=bc)

    for orb_data in [(s(6.5,1,1.5),(255,80,150)),(s(0.5,5,0.8),(80,200,255)),(s(7,4,1.2),(200,255,80))]:
        (ox3,oy3),oc3=orb_data
        d.ellipse([ox3-8,oy3-8,ox3+8,oy3+8], fill=darken(oc3,0.5))
        d.ellipse([ox3-5,oy3-5,ox3+5,oy3+5], fill=oc3)
        d.ellipse([ox3-2,oy3-2,ox3+2,oy3+2], fill=lighten(oc3,80))
        img=glow(img,ox3,oy3,oc3,20,0.4)

    rng3=random.Random(33)
    for _ in range(22):
        px3,py3=rng3.randint(30,W-30),rng3.randint(30,H-70)
        c3=rng3.choice(paint_c)
        d.ellipse([px3-1,py3-1,px3+1,py3+1], fill=c3)

    return img.filter(ImageFilter.GaussianBlur(0.4))


# ── TREASURY ──────────────────────────────────────────────────────────────────
def make_treasury():
    img = Image.new("RGB", (W,H))
    gradient_bg(img, (18,14,3), (6,5,1))
    d = ImageDraw.Draw(img)
    OX,OY = W//2+5, H//2-5
    TW,TH,HS = 44,22,28
    s = lambda x,y,z=0: pt(x,y,z,OX,OY,TW,TH,HS)

    gc=[(38,28,5),(42,32,7),(35,26,4),(46,35,8)]
    for gx in range(8):
        for gy in range(5):
            c=gc[(gx*5+gy*9)%4]
            if (gx+gy)%3==0: c=lighten(c,10)
            floor_tile(d,gx,gy,OX,OY,c,TW,TH)

    ct=s(4,2.5,0.01)
    for r in range(35,0,-5):
        d.ellipse([ct[0]-r*2,ct[1]-r,ct[0]+r*2,ct[1]+r], outline=(200,160,25), width=1)

    wc=(30,22,8)
    for gx in range(8): wall_l(d,gx,0,1,3.5,OX,OY,wc,TW,TH,HS)
    for gy in range(5): wall_r(d,gy,7,8,3.5,OX,OY,wc,TW,TH,HS)

    vd=s(3.5,0,1.5)
    d.ellipse([vd[0]-45,vd[1]-38,vd[0]+45,vd[1]+38], fill=(50,38,15))
    d.ellipse([vd[0]-45,vd[1]-38,vd[0]+45,vd[1]+38], outline=(200,160,30), width=3)
    for r in [38,32,26,20]:
        d.ellipse([vd[0]-r,vd[1]-int(r*0.85),vd[0]+r,vd[1]+int(r*0.85)], outline=(180,140,20), width=1)
    for ang in range(0,360,45):
        rad=math.radians(ang)
        d.line([(int(vd[0]+20*math.cos(rad)),int(vd[1]+17*math.sin(rad))),
                (int(vd[0]+38*math.cos(rad)),int(vd[1]+32*math.sin(rad)))], fill=(180,140,20), width=2)
    d.ellipse([vd[0]-8,vd[1]-7,vd[0]+8,vd[1]+7], fill=(0,0,0))
    d.ellipse([vd[0]-8,vd[1]-7,vd[0]+8,vd[1]+7], outline=(255,220,80), width=2)
    d.ellipse([vd[0]-4,vd[1]-3,vd[0]+4,vd[1]+3], fill=(220,180,30))
    img=glow(img,vd[0],vd[1],(200,160,20),60,0.25)

    for cx4,cy4 in [(0.3,1.5),(1.5,3.5),(6,1.5)]:
        box(d,cx4,cy4,1.2,0.9,0.8,OX,OY,(80,50,15),TW,TH,HS)
        ct2=s(cx4+0.6,cy4+0.45,0.82)
        d.ellipse([ct2[0]-18,ct2[1]-10,ct2[0]+18,ct2[1]+10], fill=(100,65,20))
        d.ellipse([ct2[0]-18,ct2[1]-10,ct2[0]+18,ct2[1]+10], outline=(200,160,30), width=2)
        d.rectangle([ct2[0]-3,ct2[1]-3,ct2[0]+3,ct2[1]+3], fill=(200,160,30))
        d.ellipse([ct2[0]-2,ct2[1]-2,ct2[0]+2,ct2[1]+2], fill=(220,190,50))
        img=glow(img,ct2[0],ct2[1],(200,160,20),22,0.35)
        rng=random.Random(int(cx4*10))
        for ci in range(5):
            ang=ci*2*math.pi/5-math.pi/2
            coin_p=(int(ct2[0]+13*math.cos(ang)),int(ct2[1]+7*math.sin(ang)))
            d.ellipse([coin_p[0]-3,coin_p[1]-2,coin_p[0]+3,coin_p[1]+2], fill=(220,190,40))

    for px4,py4 in [(2.5,1.5),(3.5,3.5),(5,2.5),(6.5,3)]:
        pp=s(px4,py4,0.01)
        d.ellipse([pp[0]-24,pp[1]-12,pp[0]+24,pp[1]+12], fill=(90,70,8))
        rng2=random.Random(int(px4*10+py4*100))
        for _ in range(9):
            cx5=pp[0]+rng2.randint(-14,14); cy5=pp[1]+rng2.randint(-6,6)
            d.ellipse([cx5-4,cy5-2,cx5+4,cy5+2], fill=(220,190,40))
        img=glow(img,pp[0],pp[1],(200,160,20),25,0.2)

    for gx6,gy6,gc6 in [(5.5,0.4,(220,40,60)),(6.5,0.4,(60,120,240)),(7.2,1,(50,200,120))]:
        box(d,gx6,gy6,0.7,0.7,0.9,OX,OY,(20,15,5),TW,TH,HS)
        gp=s(gx6+0.35,gy6+0.35,1.1)
        d.polygon([(gp[0],gp[1]-12),(gp[0]-8,gp[1]-3),(gp[0],gp[1]+8),(gp[0]+8,gp[1]-3)], fill=gc6)
        d.polygon([(gp[0],gp[1]-12),(gp[0]-8,gp[1]-3),(gp[0]+8,gp[1]-3)], fill=lighten(gc6,60))
        d.polygon([(gp[0],gp[1]-12),(gp[0]-8,gp[1]-3),(gp[0],gp[1]+8),(gp[0]+8,gp[1]-3)], outline=lighten(gc6,80), width=1)
        d.ellipse([gp[0]-2,gp[1]-12,gp[0]+2,gp[1]-8], fill=(255,255,255))
        for ang in [0,90,180,270]:
            rad=math.radians(ang)
            d.line([gp,(int(gp[0]+9*math.cos(rad)),int(gp[1]+5*math.sin(rad)))], fill=lighten(gc6,80), width=1)
        img=glow(img,gp[0],gp[1],gc6,18,0.4)

    for mx,my,mc2 in [(0.3,0.1,(0,220,130)),(1.5,0.1,(220,190,0))]:
        box(d,mx,my,1.0,0.1,1.6,OX,OY,(20,15,5),TW,TH,HS)
        msp=s(mx+0.5,my+0.05,1.6)
        scr=[s(mx+0.05,my,0.2),s(mx+0.95,my,0.2),s(mx+0.95,my,1.55),s(mx+0.05,my,1.55)]
        d.polygon(scr, fill=darken(mc2,0.18))
        prev_p=None
        for li in range(8):
            chart_x=msp[0]-12+li*4; chart_y=msp[1]-8+int(5*math.sin(li*0.8))
            p3=(chart_x,chart_y)
            if prev_p: d.line([prev_p,p3], fill=mc2, width=1)
            d.ellipse([chart_x-1,chart_y-1,chart_x+1,chart_y+1], fill=mc2)
            prev_p=p3
        img=glow(img,msp[0],msp[1],mc2,16,0.4)

    rng4=random.Random(55)
    for _ in range(18):
        px5,py5=rng4.randint(40,W-40),rng4.randint(30,H-70)
        d.ellipse([px5-2,py5-1,px5+2,py5+1], fill=(200,170,25))

    img=glow(img,W//2,H//2,(180,140,15),80,0.12)
    return img.filter(ImageFilter.GaussianBlur(0.4))


# ── MAIN ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    rooms = [
        ("grim-chamber.png", make_grim, "Grim's Chamber"),
        ("bob-library.png", make_bob, "Bob's Library"),
        ("kevin-workshop.png", make_kevin, "Kevin's Workshop"),
        ("agnes-studio.png", make_agnes, "Agnes's Studio"),
        ("treasury.png", make_treasury, "Treasury"),
    ]
    for fname, fn, label in rooms:
        print(f"Generating {label}...")
        img = fn()
        # Convert to RGBA for PNG with transparency support
        img_rgba = img.convert("RGBA")
        out = f"{OUT_DIR}/{fname}"
        img_rgba.save(out)
        print(f"  Saved {fname} ({W}x{H})")
    print("\n✅ All 5 room backgrounds generated!")

