# 4-frame walk cycles (contact L / passing / contact R / passing) — clearer than 8 frames for generated pixel art.
import os, sys, json, base64, time, requests
from gen_sheet import KEY
F = json.load(open('fighters.json'))
EXTRA = {'muse': "Show two short stubby feet clearly poking out under the fur and taking real alternating steps; the fur body sways left-right with each step.",
         'clippy': "Clippy hops on the bottom of its bent wire like a pogo spring, alternating a lean forward/back; keep the exact same size in every frame.",
         'claude': "The four tiny stubby legs move in alternating pairs (front-left + back-right, then the other pair), like a little crab scuttle.",
         'deepseek': "It hops on its curled tail fin, body bobbing, flippers swinging."}
def gen(fid, desc, refs, out):
  if os.path.exists(out): return fid, 'cached'
  p = f"""Create a 4-frame WALK CYCLE animation strip for this exact fighting-game character (match the reference sprites EXACTLY: same character, pixel art style, colors, outline weight, pixel density and scale): {desc}
Strict 4 columns x 1 row, one frame per equal-width column, every frame the SAME size and scale, feet on the same baseline, all facing RIGHT, walking forward in a relaxed fighting stance:
Frame 1 = CONTACT: LEFT foot stepped far forward, right foot back, legs wide apart, body at its lowest.
Frame 2 = PASSING: legs together under the body (right leg passing forward), body raised highest.
Frame 3 = CONTACT: RIGHT foot stepped far forward, left foot back, legs wide apart, body lowest.
Frame 4 = PASSING: legs together (left leg passing forward), body raised highest.
Make the leg positions VERY clearly different between frames so left/right steps read at a glance; draw the far leg slightly darker than the near leg. Arms/hands swing opposite to the legs. {EXTRA.get(fid, '')}
Crisp 16-bit arcade pixel art. Fully transparent background, no text, no shadows, no floor, no motion lines, no effects."""
  files = [('image[]', (os.path.basename(r), open(r, 'rb'), 'image/png')) for r in refs]
  for a in range(2):
    r = requests.post('https://api.openai.com/v1/images/edits', headers={'Authorization': 'Bearer ' + KEY}, files=[('image[]', (os.path.basename(x), open(x, 'rb'), 'image/png')) for x in refs],
                      data={'model': 'gpt-image-2', 'prompt': p, 'size': '1536x1024', 'background': 'transparent', 'quality': 'high'}, timeout=600)
    if r.ok: open(out, 'wb').write(base64.b64decode(r.json()['data'][0]['b64_json'])); return fid, 'ok'
    time.sleep(5)
  return fid, 'ERR ' + r.text[:200]
if __name__ == '__main__':
  from concurrent.futures import ThreadPoolExecutor
  ids = sys.argv[1:]
  jobs = []
  for fid in ids:
    sp = f'/Users/alexander/tokken/assets/sprites/{fid}'
    jobs.append((fid, F[fid]['desc'], [f'{sp}/idle.png', f'{sp}/walk.png', f'/Users/alexander/tokken/assets/gen/{fid}_sheet.png'], f'/Users/alexander/tokken/assets/gen/{fid}_walk4.png'))
  with ThreadPoolExecutor(5) as ex:
    for r in ex.map(lambda j: gen(*j), jobs): print(r, flush=True)
