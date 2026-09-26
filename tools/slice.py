import sys, json, os
from PIL import Image
import numpy as np
from scipy import ndimage
NAMES = ['idle', 'walk', 'jump', 'crouch', 'block', 'light', 'heavy', 'special', 'hit', 'ko', 'win', 'ult']

def slice_sheet(fid, path, outdir='/Users/alexander/tokken/assets/sprites'):
  a = np.array(Image.open(path).convert('RGBA'))
  H, W = a.shape[:2]
  a[:, :, 3] = np.where(a[:, :, 3] < 40, 0, a[:, :, 3])  # kill faint haze
  cw, ch = W / 4, H / 3
  os.makedirs(f'{outdir}/{fid}', exist_ok=True); meta = {}
  for c in range(12):
    col, row = c % 4, c // 4
    M = 70
    cx0, cx1, cy0, cy1 = int(col * cw), int((col + 1) * cw), int(row * ch), int((row + 1) * ch)
    x0, x1, y0, y1 = max(0, cx0 - M), min(W, cx1 + M), max(0, cy0 - M), min(H, cy1 + M)
    cell = a[y0:y1, x0:x1]; mask = cell[:, :, 3] > 0
    lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=3))
    if n == 0: print('empty', fid, NAMES[c]); continue
    objs = ndimage.find_objects(lab)
    core = lambda sl: cx0 - x0 <= (sl[1].start + sl[1].stop) / 2 < cx1 - x0 and cy0 - y0 <= (sl[0].start + sl[0].stop) / 2 < cy1 - y0
    areas = ndimage.sum(mask, lab, range(1, n + 1)) * np.array([1 if core(o) else 0 for o in objs])
    main = int(np.argmax(areas)) + 1; ms = objs[main - 1]; g = 45; keep = []
    for k in range(1, n + 1):
      sl = objs[k - 1]
      if k == main or (areas[k - 1] > 30 and core(sl) and sl[0].start < ms[0].stop + g and sl[0].stop > ms[0].start - g and sl[1].start < ms[1].stop + g and sl[1].stop > ms[1].start - g):
        keep.append(k)
    m = np.isin(lab, keep) & mask
    ys, xs = np.where(m); by0, by1, bx0, bx1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = cell[by0:by1, bx0:bx1].copy(); crop[:, :, 3] = np.where(m[by0:by1, bx0:bx1], crop[:, :, 3], 0)
    Image.fromarray(crop).save(f'{outdir}/{fid}/{NAMES[c]}.png')
    mk = (lab[by0:by1, bx0:bx1] == main) & m[by0:by1, bx0:bx1]; mys, mxs = np.where(mk)
    # [w, h, footY, centerX(mass), topY of main body]
    if bx0 == 0 or by0 == 0 or bx1 == x1 - x0 or by1 == y1 - y0: print('  touches edge:', fid, NAMES[c])
    meta[NAMES[c]] = [int(bx1 - bx0), int(by1 - by0), int(mys.max() + 1), int(mxs.mean()), int(mys.min())]
  json.dump(meta, open(f'{outdir}/{fid}/meta.json', 'w')); print(fid, len(meta), 'poses')

if __name__ == '__main__':
  for f in sys.argv[1:]: slice_sheet(f, f'/Users/alexander/tokken/assets/gen/{f}_sheet.png')
