# Walking v3: edit ONLY the legs of each fighter's idle sprite, then composite the torso back pixel-for-pixel (zero body jitter).
import os, sys, json, base64, time, requests, io
import numpy as np
from PIL import Image
from scipy import ndimage
from gen_sheet import KEY
SP = '/Users/alexander/tokken/assets/sprites'; GEN = '/Users/alexander/tokken/assets/gen/legs'; os.makedirs(GEN, exist_ok=True)
POSES = [
  "LEFT leg stepped far FORWARD with the heel touching the ground, RIGHT leg extended far BEHIND on its toes — a wide walking stride",
  "legs close together: the RIGHT leg is passing forward and slightly bent with its foot lifted a little off the ground, the LEFT leg straight and planted",
  "RIGHT leg stepped far FORWARD with the heel touching the ground, LEFT leg extended far BEHIND on its toes — a wide walking stride (mirror of the first step)",
  "legs close together: the LEFT leg is passing forward and slightly bent with its foot lifted a little off the ground, the RIGHT leg straight and planted",
]
SPECIAL_POSES = {
  'muse': ["its tiny LEFT foot stepped forward out from under the fur, RIGHT foot back", "both tiny feet together under the fur, body slightly raised", "its tiny RIGHT foot stepped forward out from under the fur, LEFT foot back", "both tiny feet together under the fur, body slightly raised"],
  'deepseek': ["its curled tail fin COMPRESSED and bent under it, crouching to spring", "its tail fin STRETCHED straight, pushing off the ground, body springing up", "its tail fin curled forward, landing", "its tail fin flat on the ground, upright"],
}
HIP = {'muse': 0.8, 'deepseek': 0.58, 'claude': 0.55, 'clippy': 0.6, 'codex': 0.66, 'gemini': 0.6, 'grok': 0.6, 'llama': 0.62, 'dolphin': 0.6, 'mistral': 0.58, 'perplexity': 0.62, 'qwen': 0.62, 'cursor': 0.6}
def canvas(fid):
  im = Image.open(f'{SP}/{fid}/idle.png').convert('RGBA'); s = 720 / im.height; im = im.resize((int(im.width * s), int(im.height * s)), Image.NEAREST)
  c = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0)); x = (1024 - im.width) // 2; y = 960 - im.height; c.alpha_composite(im, (x, y)); return c, s
def edit(fid, k):
  out = f'{GEN}/{fid}_{k}.png'
  if os.path.exists(out): return out
  c, _ = canvas(fid); buf = io.BytesIO(); c.save(buf, 'PNG'); buf.seek(0)
  p = f"""Edit this pixel-art fighting-game sprite. Keep EVERYTHING above the hips (head, face, torso, arms, weapon/accessories) EXACTLY identical — same pixels, same position, same size. Redraw ONLY the legs and feet (or tail fin) in this walking pose: {SPECIAL_POSES.get(fid, POSES)[k]}. The legs must stay the same length, thickness, colors, shading and outline style as the original legs; the character still faces RIGHT and stands on the same ground line. Keep the transparent background. No other changes."""
  for a in range(3):
    r = requests.post('https://api.openai.com/v1/images/edits', headers={'Authorization': 'Bearer ' + KEY}, files=[('image[]', ('sprite.png', buf.getvalue(), 'image/png'))],
                      data={'model': 'gpt-image-2', 'prompt': p, 'size': '1024x1024', 'background': 'transparent', 'quality': 'high', 'input_fidelity': 'high'}, timeout=600)
    if r.ok: open(out, 'wb').write(base64.b64decode(r.json()['data'][0]['b64_json'])); return out
    if 'input_fidelity' in r.text: break
    time.sleep(4)
  # retry without input_fidelity if unsupported
  r = requests.post('https://api.openai.com/v1/images/edits', headers={'Authorization': 'Bearer ' + KEY}, files=[('image[]', ('sprite.png', buf.getvalue(), 'image/png'))],
                    data={'model': 'gpt-image-2', 'prompt': p, 'size': '1024x1024', 'background': 'transparent', 'quality': 'high'}, timeout=600)
  if r.ok: open(out, 'wb').write(base64.b64decode(r.json()['data'][0]['b64_json'])); return out
  print('ERR', fid, k, r.text[:200]); return None
def mainmask(a):
  m = a[:, :, 3] > 40; lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=2)); ar = ndimage.sum(m, lab, range(1, n + 1)); return (lab == np.argmax(ar) + 1) & m
def composite(fid):
  base, s = canvas(fid); B = np.array(base); bm = mainmask(B); ys, xs = np.where(bm); top, foot = ys.min(), ys.max() + 1
  hip = int(top + (foot - top) * HIP.get(fid, 0.6)); band = 14
  meta = json.load(open(f'{SP}/{fid}/meta.json'))['idle']; mm = json.load(open(f'{SP}/{fid}/motion.json'))
  for k in [k for k in mm if k.startswith('walk')]: del mm[k]
  for k in range(4):
    G = np.array(Image.open(f'{GEN}/{fid}_{k}.png').convert('RGBA')); G[:, :, 3] = np.where(G[:, :, 3] < 40, 0, G[:, :, 3]); gm = mainmask(G)
    # align generated frame to the base by the upper-body centroid + ground line
    gy, gx = np.where(gm[:hip]); by, bx = np.where(bm[:hip]); dx = int(round(bx.mean() - gx.mean())) if len(gx) else 0
    gys = np.where(gm)[0]; dy = foot - (gys.max() + 1) if len(gys) else 0
    G = np.roll(np.roll(G, dx, axis=1), dy, axis=0)
    out = np.zeros_like(B); w = np.clip((np.arange(1024)[:, None] - (hip - band)) / (2 * band), 0, 1)[..., None]   # 0 above hip, 1 below
    out = (B * (1 - w) + G * w).astype(np.uint8)
    im = Image.fromarray(out); bb = im.getbbox(); im = im.crop(bb)
    im = im.resize((max(1, round(im.width / s)), max(1, round(im.height / s))), Image.NEAREST)
    a = np.array(im)[:, :, 3] > 0; yy, xx = np.where(a); t2, f2 = yy.min(), yy.max() + 1; uy, ux = np.where(a[t2:t2 + int((f2 - t2) * 0.55)])
    im.save(f'{SP}/{fid}/walk{k}.png'); im.save(f'{SP}/{fid}/walk{k}.webp', 'WEBP', quality=92, exact=True)
    mm[f'walk{k}'] = [im.width, im.height, int(f2), int(ux.mean()), int(t2)]
  json.dump(mm, open(f'{SP}/{fid}/motion.json', 'w')); print(fid, 'composited')
if __name__ == '__main__':
  from concurrent.futures import ThreadPoolExecutor
  ids = sys.argv[1:]
  with ThreadPoolExecutor(8) as ex: list(ex.map(lambda t: edit(*t), [(f, k) for f in ids for k in range(4)]))
  for f in ids:
    if all(os.path.exists(f'{GEN}/{f}_{k}.png') for k in range(4)): composite(f)
    else: print(f, 'missing frames')
