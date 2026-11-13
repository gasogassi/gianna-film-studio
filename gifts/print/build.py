"""Build vector print files (SVG + PDF) for the two chosen baby-onesie designs.

  Gianna Bellucci C05 — "I KNOW WHERE THE MILK IS." · navy + white ink · for a powder-blue onesie
  Larven L07         — "SEED ROUND: SUCCESSFUL." sprout doodle · charcoal + Larven blue · for a cream onesie

Everything is true vector: lettering set in Anton and converted to outlines, Gianna logo from the brand
SVG, illustrations and the Larven wordmark traced with potrace. Run with the venv python (cairosvg, pypdf,
fonttools, numpy, opencv, pillow).
"""
import os, re, subprocess, tempfile, io
import numpy as np, cv2
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
import cairosvg
from pypdf import PdfWriter, PdfReader

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)


# ---------------------------------------------------------------- helpers
def trace(mask, turd=4, alpha=1.0, opt=0.2):
    """Binary mask (True = ink) → (viewBox w, h, list of SVG path 'd' strings) via potrace."""
    h, w = mask.shape
    with tempfile.TemporaryDirectory() as td:
        pbm = os.path.join(td, "m.pbm")
        Image.fromarray(np.where(mask, 0, 255).astype(np.uint8)).convert("1").save(pbm)
        svg = os.path.join(td, "m.svg")
        subprocess.run(["potrace", pbm, "-s", "-o", svg, "-t", str(turd), "-a", str(alpha), "-O", str(opt), "--flat"], check=True)
        s = open(svg).read()
    # potrace emits one <g transform="translate(0,H) scale(0.1,-0.1)"> with paths in 10× units
    tr = re.search(r'<g transform="([^"]+)"', s).group(1)
    ds = re.findall(r' d="([^"]+)"', s)
    return w, h, tr, ds


def group(tr, ds, fill):
    return f'<g transform="{tr}" fill="{fill}" stroke="none">' + "".join(f'<path d="{d}"/>' for d in ds) + "</g>"


def place(inner_svg, vb_w, vb_h, x, y, w):
    """Nest content with its own viewBox, scaled to width w (mm) at (x, y)."""
    h = w * vb_h / vb_w
    return f'<svg x="{x:.3f}" y="{y:.3f}" width="{w:.3f}" height="{h:.3f}" viewBox="0 0 {vb_w} {vb_h}" overflow="visible">{inner_svg}</svg>', h


def crop_to_content(img, pad=8):
    ink = img.mean(2) < 245 if img.ndim == 3 else img < 245
    ys, xs = np.where(ink)
    return img[max(0, ys.min() - pad):ys.max() + pad, max(0, xs.min() - pad):xs.max() + pad]


def save(name, pages, size):
    """pages: list of (svg_body, background or None, caption). Writes <name>.svg (print page) and <name>.pdf."""
    W, H = size
    writer = PdfWriter()
    for i, (body, bg, caption) in enumerate(pages):
        bgrect = f'<rect width="{W}" height="{H}" fill="{bg}"/>' if bg else ""
        cap = (f'<text x="{W/2}" y="{H-6}" font-family="Helvetica" font-size="3.4" fill="#777" text-anchor="middle">{caption}</text>' if caption else "")
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">{bgrect}{body}{cap}</svg>'
        if i == 1:
            open(os.path.join(OUT, f"{name}.svg"), "w").write(
                f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}mm" height="{H}mm" viewBox="0 0 {W} {H}">{body}</svg>')
        writer.add_page(PdfReader(io.BytesIO(cairosvg.svg2pdf(bytestring=svg.encode()))).pages[0])
    with open(os.path.join(OUT, f"{name}.pdf"), "wb") as f:
        writer.write(f)


# ---------------------------------------------------------------- Gianna Bellucci C05
def text_path(font, text, cap_mm, x, baseline_y):
    """Outline a string in `font`; cap height = cap_mm. Returns (svg path markup inner d, width_mm)."""
    gs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font["head"].unitsPerEm
    cap_units = font["OS/2"].sCapHeight or 0.7 * upm
    k = cap_mm / cap_units
    pen_x, ds = 0, []
    for ch in text:
        g = cmap.get(ord(ch))
        if g is None: continue
        sp = SVGPathPen(gs); gs[g].draw(sp)
        d = sp.getCommands()
        if d: ds.append(f'<path transform="translate({x + pen_x * k:.3f},{baseline_y:.3f}) scale({k:.6f},{-k:.6f})" d="{d}"/>')
        pen_x += gs[g].width
    return "".join(ds), pen_x * k


def gianna():
    NAVY, WHITE, FABRIC = "#132E5B", "#FFFFFF", "#AFCDEA"
    font = TTFont(os.path.join(HERE, "fonts/Anton-Regular.ttf"))
    W, H = 200, 240                              # artboard (mm); artwork 150 mm wide, centred
    CAP, LEAD = 30, 36                           # cap height and line pitch (mm)
    x0, y0 = 25, 30
    lines = [("I KNOW", None), ("WHERE", None), ("THE ", "MILK"), ("IS.", None)]
    parts, widths = [], []
    for i, (a, b) in enumerate(lines):
        base = y0 + CAP + i * LEAD
        pa, wa = text_path(font, a, CAP, x0, base)
        parts.append(f'<g fill="{NAVY}">{pa}</g>')
        wb = 0
        if b:
            pb, wb = text_path(font, b, CAP, x0 + wa, base)
            parts.append(f'<g fill="{WHITE}">{pb}</g>')       # "MILK" in white ink
        widths.append(wa + wb)
    block_w = max(widths)
    # bra beside "IS." — baseline aligned, ~1.25× cap height tall, filling the rest of the line
    bra = cv2.imread(os.path.join(HERE, "src/gianna-bra-lineart.png"), cv2.IMREAD_GRAYSCALE)
    bra = crop_to_content(bra)
    bra = cv2.resize(bra, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    bw, bh, btr, bds = trace(bra < 128, turd=6)
    is_w = widths[3]
    gap = 4
    avail = block_w - is_w - gap
    bra_h = CAP * 1.25
    bra_w = min(avail, bra_h * bw / bh)
    bra_svg, real_h = place(group(btr, bds, NAVY), bw, bh, x0 + is_w + gap + (avail - bra_w) / 2, y0 + 3 * LEAD + CAP - bra_w * bh / bw, bra_w)
    parts.append(bra_svg)
    # Gianna Bellucci logo (brand vector), centred under the block
    logo = open(os.path.join(ROOT, "assets/brand/gb-logo.svg")).read()
    vb = re.search(r'viewBox="([\d.\s]+)"', logo).group(1).split()
    lw_, lh_ = float(vb[2]), float(vb[3])
    inner = re.sub(r"^<svg[^>]*>|</svg>\s*$", "", logo.strip())
    logo_w = block_w * 0.82
    logo_svg, _ = place(f'<g fill="{NAVY}">{inner}</g>'.replace('fill="#141414"', ""), lw_, lh_, x0 + (block_w - logo_w) / 2, y0 + 3 * LEAD + CAP + 12, logo_w)
    parts.append(logo_svg)
    # centre the whole artwork on the artboard
    dx = (W - block_w) / 2 - x0
    art = f'<g transform="translate({dx:.3f},20)">' + "".join(parts) + "</g>"
    seps = (f'<g transform="translate({dx:.3f},20)">' + "".join(parts).replace(f'fill="{WHITE}"', 'fill="#000"').replace(f'fill="{NAVY}"', 'fill="#000"') + "</g>")
    save("Gianna-Bellucci_I-know-where-the-milk-is_C05_vector", [
        (art, FABRIC, "Preview on powder-blue onesie  ·  Navy #132E5B + White ink  ·  artwork 150 mm wide (scale to print area)"),
        (art, None, "Print artwork, actual colours (\"MILK\" is WHITE ink, invisible on a white page)  ·  all text outlined, 100% vector"),
        (seps, None, "Single-colour separation / outline check (all inks shown in black)"),
    ], (W, H))
    print("✓ Gianna C05")


# ---------------------------------------------------------------- Larven L07
def larven():
    CHAR, BLUE, FABRIC = "#2B2B2B", "#2F5BFF", "#F2EDE3"
    img = cv2.imread(os.path.join(HERE, "src/larven-sprout-art.png"))
    img = crop_to_content(img, pad=12)
    img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
    b, g, r = [img[:, :, i].astype(int) for i in range(3)]
    blue = (b > 150) & (r < 120) & (b - r > 80)                     # Larven blue leaves
    dark = (img.mean(2) < 110) & ~blue                              # charcoal lines + lettering
    w, h, tr1, d1 = trace(dark, turd=8)
    _, _, tr2, d2 = trace(blue, turd=8)
    W, H = 200, 240
    art_w = 140
    art, art_h = place(group(tr2, d2, BLUE) + group(tr1, d1, CHAR), w, h, (W - art_w) / 2, 18, art_w)
    # Larven wordmark: trace the official logo PNG at 8× for clean geometry
    lg = Image.open(os.path.expanduser("~/Developer/larven-app/dashboard/public/img/larven-logo-light.png")).convert("RGBA")
    a = np.asarray(lg)[:, :, 3]
    ys, xs = np.where(a > 20); a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    a = cv2.resize(a, None, fx=8, fy=8, interpolation=cv2.INTER_CUBIC)
    lw, lh, tr3, d3 = trace(a > 128, turd=20)
    logo_w = art_w * 0.42
    logo, _ = place(group(tr3, d3, CHAR), lw, lh, (W - logo_w) / 2, 18 + art_h + 12, logo_w)
    body = art + logo
    seps = body.replace(f'fill="{BLUE}"', 'fill="#000"').replace(f'fill="{CHAR}"', 'fill="#000"')
    save("Larven_Seed-round-successful_L07_vector", [
        (body, FABRIC, "Preview on cream onesie  ·  Charcoal #2B2B2B + Larven blue #2F5BFF  ·  artwork 140 mm wide (scale to print area)"),
        (body, None, "Print artwork, actual colours  ·  100% vector"),
        (seps, None, "Single-colour separation / outline check (all inks shown in black)"),
    ], (W, H))
    print("✓ Larven L07")


if __name__ == "__main__":
    gianna()
    larven()
