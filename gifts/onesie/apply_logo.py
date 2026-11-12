"""Swap the AI-drawn "GIANNA BELLUCCI" line for the real brand logo (gb-logo.svg raster).
usage: python apply_logo.py logo.png out_dir img1.png img2.png ...
"""
import sys, os, numpy as np, cv2
from PIL import Image, ImageFilter

logo_path, out_dir, files = sys.argv[1], sys.argv[2], sys.argv[3:]
logo = Image.open(logo_path).convert("RGBA")
la = np.asarray(logo)[:, :, 3]
ys, xs = np.where(la > 10)
logo = logo.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

for f in files:
    im = cv2.imread(f)  # BGR
    h, w = im.shape[:2]
    fabric = np.median(im[int(h * .62):int(h * .70), int(w * .40):int(w * .60)].reshape(-1, 3), 0)
    dist = np.linalg.norm(im.astype(int) - fabric, axis=2)
    # Only consider pixels inside the garment: per row, between the first/last fabric-coloured pixel.
    fab = dist < 30
    inside = np.zeros_like(fab)
    for y in range(h):
        xs_ = np.where(fab[y])[0]
        if len(xs_) > 20: inside[y, xs_[0] + 12: xs_[-1] - 12] = True
    ink = (dist > 60) & inside
    band = ink[:, int(w * .18):int(w * .82)]
    rows = band.sum(1) > 3
    runs, i = [], 0
    while i < int(h * .62):
        if rows[i]:
            j = i
            while j < h and rows[j]: j += 1
            if j - i > 4: runs.append((i, j))
            i = j
        else: i += 1
    # layout: ... caption lines, brand line, bow tie  -> brand line is second-to-last run
    y0, y1 = runs[-2]
    cols = np.where(ink[y0:y1, int(w * .1):int(w * .9)].any(0))[0] + int(w * .1)
    x0, x1 = cols.min(), cols.max()
    box = ink[y0:y1, x0:x1 + 1]
    color = np.median(im[y0:y1, x0:x1 + 1][box].reshape(-1, 3), 0)  # BGR ink colour
    # erase: inpaint the ink pixels of the brand line
    m = np.zeros((h, w), np.uint8); m[y0:y1, x0:x1 + 1] = box.astype(np.uint8) * 255
    m = cv2.dilate(m, np.ones((5, 5), np.uint8), iterations=2)
    clean = cv2.inpaint(im, m, 7, cv2.INPAINT_TELEA)
    # paste logo: same width as the AI line, vertically centred on it, in the sampled ink colour
    tw = int(min(x1 - x0, 0.50 * w)); th = int(logo.height * tw / logo.width)  # cap: textured fabric can widen detection
    lg = logo.resize((tw, th), Image.LANCZOS)
    a = np.asarray(lg)[:, :, 3].astype(float) / 255.0
    a = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.5))).astype(float) / 255.0 * 0.96
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    px, py = cx - tw // 2, cy - th // 2
    roi = clean[py:py + th, px:px + tw].astype(float)
    ink_rgb = np.array(color, float)
    clean[py:py + th, px:px + tw] = (roi * (1 - a[..., None]) + ink_rgb * a[..., None]).astype(np.uint8)
    out = os.path.join(out_dir, os.path.basename(f))
    cv2.imwrite(out, clean)
    print(f"✓ {os.path.basename(f)}  brand line y{y0}-{y1} x{x0}-{x1}  ink BGR {color.astype(int).tolist()}")
