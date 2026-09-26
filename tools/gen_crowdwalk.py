import os, base64, time, requests
from gen_sheet import KEY
W = {0: "a hoodie-wearing ML engineer clutching a laptop covered in stickers", 2: "a sleep-deprived intern holding an energy drink",
     5: "a bearded Rust developer in a flannel shirt carrying a coffee mug", 7: "a founder in all-black with Allbirds sneakers holding a phone"}
def gen(n):
  out = f'/Users/alexander/tokken/assets/gen/eng{n}_walk4.png'
  if os.path.exists(out): return n, 'cached'
  refs = [f'/Users/alexander/tokken/assets/crowd/eng{n}_0.png', f'/Users/alexander/tokken/assets/gen/eng_{n // 6}.png']
  p = f"""Create a 4-frame WALK CYCLE strip of this exact chibi spectator ({W[n]}), matching the first reference sprite EXACTLY (same person, pixel art style, colors, outline, proportions). Strict 4 columns x 1 row, SIDE VIEW walking to the RIGHT, same size and baseline in every frame.
Frame 1: LEFT foot forward, right back (contact). Frame 2: passing, legs together, body raised. Frame 3: RIGHT foot forward, left back (contact). Frame 4: passing, legs together, body raised. Clearly different leg positions; the carried item bobs slightly.
Crisp 16-bit arcade pixel art, fully transparent background, no text, no shadow, no floor."""
  r = requests.post('https://api.openai.com/v1/images/edits', headers={'Authorization': 'Bearer ' + KEY}, files=[('image[]', (os.path.basename(x), open(x, 'rb'), 'image/png')) for x in refs],
                    data={'model': 'gpt-image-2', 'prompt': p, 'size': '1536x1024', 'background': 'transparent', 'quality': 'high'}, timeout=600)
  if r.ok: open(out, 'wb').write(base64.b64decode(r.json()['data'][0]['b64_json'])); return n, 'ok'
  return n, 'ERR ' + r.text[:200]
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(4) as ex:
  for r in ex.map(gen, W): print(r, flush=True)
