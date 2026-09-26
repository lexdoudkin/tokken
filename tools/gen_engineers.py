import base64,requests
from gen_sheet import KEY
G=[["a hoodie-wearing ML engineer clutching a laptop covered in stickers","a Patagonia-vest venture capitalist holding a phone","a sleep-deprived intern with an energy drink","a researcher with a conference lanyard and messy hair","a product manager holding sticky notes","a bearded Rust developer in a flannel shirt"],
   ["a gamer-girl ML engineer with a headset and cat-ear hoodie","a founder in all-black with Allbirds sneakers","a data labeler with headphones","a prompt engineer in a blazer and turtleneck","a GPU cluster sysadmin in cargo shorts holding a server blade","an AI safety researcher holding a clipboard, visibly worried"]]
def gen(i,people):
  P=f"""A sprite sheet of 6 chibi SPECTATORS for a parody 2D fighting game crowd, crisp 16-bit arcade pixel art (1990s arcade quality), bold dark outlines, FULL BODY head to shoes, big heads, varied skin tones and genders.
Every figure is in THREE-QUARTER SIDE PROFILE facing RIGHT, watching a fight happening to the right.
Strict 6 columns x 2 rows grid. Each COLUMN is the same person: row 1 = watching intently, row 2 = same person cheering with arms raised, mouth open. Same size and position, feet on the same baseline, generous empty space, nothing crossing cell edges.
Columns left to right: {'; '.join(f'({k+1}) {p}' for k,p in enumerate(people))}.
Fully transparent background, no text, no signs, no floor, no shadows."""
  r=requests.post('https://api.openai.com/v1/images/generations',headers={'Authorization':'Bearer '+KEY},json={'model':'gpt-image-2','prompt':P,'size':'1536x1024','quality':'high','background':'transparent','n':1},timeout=600)
  print(i,r.status_code,r.text[:200] if not r.ok else 'ok')
  if r.ok: open(f'/Users/alexander/tokken/assets/gen/eng_{i}.png','wb').write(base64.b64decode(r.json()['data'][0]['b64_json']))
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(2) as ex: list(ex.map(lambda a: gen(*a), enumerate(G)))
