import sys, json, os
from PIL import Image
import numpy as np
from scipy import ndimage
NAMES = [f'walk{i}' for i in range(8)] + [f'idle{i}' for i in range(4)]
def cell_crop(a, c, W, H):
  cw, ch = W / 4, H / 3; col, row = c % 4, c // 4; M = 50
  cx0, cx1, cy0, cy1 = int(col * cw), int((col + 1) * cw), int(row * ch), int((row + 1) * ch)
  x0, x1, y0, y1 = max(0, cx0 - M), min(W, cx1 + M), max(0, cy0 - M), min(H, cy1 + M)
  cell = a[y0:y1, x0:x1]; mask = cell[:, :, 3] > 0
  lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=3))
  if not n: return None
  objs = ndimage.find_objects(lab)
  core = lambda sl: cx0 - x0 <= (sl[1].start + sl[1].stop) / 2 < cx1 - x0 and cy0 - y0 <= (sl[0].start + sl[0].stop) / 2 < cy1 - y0
  areas = ndimage.sum(mask, lab, range(1, n + 1)) * np.array([1 if core(o) else 0 for o in objs])
  main = int(np.argmax(areas)) + 1; m = (lab == main) & mask
  ys, xs = np.where(m); crop = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(); mm = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
  crop[:, :, 3] = np.where(mm, crop[:, :, 3], 0); return crop, mm
def run(fid):
  src = f'/Users/alexander/tokken/assets/gen/{fid}_motion.png'
  if not os.path.exists(src): print(fid, 'no sheet'); return
  a = np.array(Image.open(src).convert('RGBA')); H, W = a.shape[:2]; a[:, :, 3] = np.where(a[:, :, 3] < 40, 0, a[:, :, 3])
  out = f'/Users/alexander/tokken/assets/sprites/{fid}'; base = json.load(open(f'{out}/meta.json'))['idle']
  frames = [cell_crop(a, c, W, H) for c in range(12)]
  if any(f is None for f in frames): print(fid, 'empty cell'); return
  body = lambda mm: mm.shape[0]
  hi = np.median([body(frames[i][1]) for i in range(8, 12)])
  s = (base[2] - base[4]) / hi                      # match main idle body height
  meta = {}
  for name, (crop, mm) in zip(NAMES, frames):
    im = Image.fromarray(crop); w2, h2 = max(1, round(im.width * s)), max(1, round(im.height * s)); im = im.resize((w2, h2), Image.NEAREST)
    m2 = np.array(im)[:, :, 3] > 0; ys, xs = np.where(m2)
    top, foot = ys.min(), ys.max() + 1; upper = m2[top:top + int((foot - top) * 0.55)]; uy, ux = np.where(upper)
    im.save(f'{out}/{name}.png'); meta[name] = [w2, h2, int(foot), int(ux.mean()), int(top)]
  json.dump(meta, open(f'{out}/motion.json', 'w')); print(fid, 'ok', 'scale', round(s, 2))
for f in sys.argv[1:]: run(f)
