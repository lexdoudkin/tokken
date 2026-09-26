import sys, json, os
from PIL import Image
import numpy as np
from scipy import ndimage
def frames4(src):
  a = np.array(Image.open(src).convert('RGBA')); H, W = a.shape[:2]; a[:, :, 3] = np.where(a[:, :, 3] < 40, 0, a[:, :, 3]); cw = W / 4; out = []
  for c in range(4):
    x0, x1 = int(c * cw), int((c + 1) * cw); cell = a[:, x0:x1]; m = cell[:, :, 3] > 0
    lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=3)); ar = ndimage.sum(m, lab, range(1, n + 1)); mm = (lab == np.argmax(ar) + 1) & m
    ys, xs = np.where(mm); crop = cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy(); crop[:, :, 3] = np.where(mm[ys.min():ys.max() + 1, xs.min():xs.max() + 1], crop[:, :, 3], 0)
    out.append(crop)
  return out
def place(frames, target_h, outdir, prefix):
  hs = sorted(f.shape[0] for f in frames); s = target_h / hs[1]; meta = {}
  for i, crop in enumerate(frames):
    im = Image.fromarray(crop); w2, h2 = max(1, round(im.width * s)), max(1, round(im.height * s)); im = im.resize((w2, h2), Image.NEAREST)
    m2 = np.array(im)[:, :, 3] > 0; ys, xs = np.where(m2); top, foot = ys.min(), ys.max() + 1; uy, ux = np.where(m2[top:top + int((foot - top) * 0.55)])
    im.save(f'{outdir}/{prefix}{i}.png'); im.save(f'{outdir}/{prefix}{i}.webp', 'WEBP', quality=92, exact=True)
    meta[f'{prefix}{i}'] = [w2, h2, int(foot), int(ux.mean()), int(top)]
  return meta
if __name__ == '__main__':
  for fid in sys.argv[1:]:
    src = f'/Users/alexander/tokken/assets/gen/{fid}_walk4.png'
    if not os.path.exists(src): print(fid, 'missing'); continue
    d = f'/Users/alexander/tokken/assets/sprites/{fid}'; base = json.load(open(f'{d}/meta.json'))['idle']
    mm = json.load(open(f'{d}/motion.json'))
    for k in [k for k in mm if k.startswith('walk')]:
      del mm[k]
      for ext in ('png', 'webp'):
        if os.path.exists(f'{d}/{k}.{ext}'): os.remove(f'{d}/{k}.{ext}')
    mm.update(place(frames4(src), base[2] - base[4], d, 'walk'))
    json.dump(mm, open(f'{d}/motion.json', 'w')); print(fid, 'ok', sorted(mm))
