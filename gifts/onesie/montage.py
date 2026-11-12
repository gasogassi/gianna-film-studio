"""Team montage of all onesie ideas — one shareable image."""
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

logo_png, src_dir, out = sys.argv[1], sys.argv[2], sys.argv[3]
import json
spec = json.load(open(sys.argv[4])) if len(sys.argv) > 4 else None
items = [
    ("01-mommy-wore.png", "Mommy wore — cream"),
    ("b1-mommy-wore-powderblue.png", "Mommy wore — powder blue"),
    ("b2-mommy-wore-navy.png", "Mommy wore — navy"),
    ("b3-mommy-wore-colorful.png", "Mommy wore — colourful"),
    ("b4-mommy-wore-red.png", "Mommy wore red"),
    ("b5-daddy-never-stood-a-chance.png", "Daddy never stood a chance"),
    ("b6-blame-it-on.png", "Blame it on…"),
    ("k1-kan-brought-to-you-by.png", "KAN — brought to you by"),
    ("k2-kan-limited-edition.png", "KAN — limited edition"),
    ("k3-kan-mommy-wore.png", "KAN — Mommy wore"),
]
if spec: items = [tuple(x) for x in spec["items"]]
COLS = spec.get("cols", 5) if spec else 5
CW, CH, GAP, PAD = 560, 747, 40, 90
BG, INK, MUTED = (247, 243, 238), (20, 20, 20), (120, 112, 104)
W = PAD * 2 + COLS * CW + (COLS - 1) * GAP
rows = (len(items) + COLS - 1) // COLS
HEAD, CAP = 330, 90
H = HEAD + rows * (CH + CAP + GAP) + PAD
canvas = Image.new("RGB", (W, H), BG)
d = ImageDraw.Draw(canvas)
avenir = "/System/Library/Fonts/Avenir Next.ttc"
f_cap = ImageFont.truetype(avenir, 30, index=0)
f_num = ImageFont.truetype(avenir, 30, index=2)
f_sub = ImageFont.truetype(avenir, 34, index=0)

logo = Image.open(logo_png).convert("RGBA")
bbox = logo.getbbox(); logo = logo.crop(bbox)
lw = spec.get("logoWidth", 1100) if spec else 1100; logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
canvas.paste(logo, ((W - lw) // 2, 95), logo)
sub = spec["subtitle"] if spec else "Baby onesie ideas for KAN  ·  gift from the Gianna Bellucci team"
tw = d.textlength(sub, font=f_sub)
d.text(((W - tw) / 2, 95 + logo.height + 45), sub, font=f_sub, fill=MUTED)

for i, (fn, label) in enumerate(items):
    r, c = divmod(i, COLS)
    x = PAD + c * (CW + GAP); y = HEAD + r * (CH + CAP + GAP)
    im = Image.open(os.path.join(src_dir, fn)).convert("RGB").resize((CW, CH), Image.LANCZOS)
    shadow = Image.new("RGBA", (CW + 40, CH + 40), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((20, 24, CW + 20, CH + 24), 22, fill=(0, 0, 0, 38))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    canvas.paste(shadow, (x - 20, y - 20), shadow)
    mask = Image.new("L", (CW, CH), 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, CW, CH), 22, fill=255)
    canvas.paste(im, (x, y), mask)
    num = f"{i + 1:02d}"
    d.text((x + 4, y + CH + 26), num, font=f_num, fill=INK)
    d.text((x + 4 + d.textlength(num + "  ", font=f_num), y + CH + 26), label, font=f_cap, fill=MUTED)
canvas.save(out, quality=92)
print(out, canvas.size)
