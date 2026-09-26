import base64,requests,sys,time
from gen_sheet import KEY
A={
'distillation':"THE DISTILLATION LAB: a secret underground moonshine-style AI distillery lab, giant bubbling copper stills and glass pipes labeled 'FRONTIER MODEL' feeding into rows of small glowing bottles labeled '7B' and 'DISTILLED', flasks dripping glowing golden tokens, a whiteboard reading 'API OUTPUTS → PROFIT', a banner reading 'WE DEFINITELY DIDN'T USE YOUR API', Chinese lanterns and a red neon sign '蒸馏', hazmat suits hanging on the wall, steam clouds",

'graveyard':"THE AI GRAVEYARD: a foggy moonlit cemetery full of pixel tombstones engraved 'GOOGLE+', 'METAVERSE', 'NFTs', 'CLIPPY (TWICE)', 'CLOSED AS DUPLICATE', 'WEB3', 'MY SIDE PROJECT', ghostly glowing chatbots floating, a crooked iron gate, a full moon",
'demoday':"Y COMBINATOR DEMO DAY: a bright auditorium stage with a giant projector slide reading '$100M ARR (PROJECTED)' and a hockey-stick chart, rows of investors in Patagonia vests holding checkbooks, a nervous-founder spotlight, 'AI FOR X' banners",
'waitlist':"THE WAITLIST: an endless grey DMV-style government waiting hall with a queue of robots and humans stretching to the horizon, a giant red digital sign 'NOW SERVING #12 — YOU ARE #4,812,331', a 'GPT-6 ACCESS' window with a CLOSED sign, flickering fluorescent lights",
'burningman':"BURNING MAN AI CAMP: dusty desert playa at sunset, a giant effigy made of server racks on fire in the distance, a mutant art car shaped like a glowing GPU, tents with banners 'AGI CAMP' and 'VIBES ONLY', dust storms and neon lights",

'tesla':"TESLA HQ: a gleaming white Tesla gigafactory showroom stage, rows of Cybertrucks and Optimus humanoid robots standing on assembly lines in the background, giant red 'T' logo on the wall, a 'FULL SELF-DRIVING (NEXT YEAR)' banner, a Roadster floating in a space diorama",
'h100':"INSIDE THE H100: fighting on the surface of a colossal glowing NVIDIA-green GPU silicon die, towering HBM memory stacks like skyscrapers, rivers of light flowing through circuit traces, tensor cores as glowing tiles, a huge thermal fan spinning in the sky, a sticker saying 'H100 LOL'",
}
def gen(k):
  p=f"""Using the reference image ONLY as a STYLE guide (same crisp detailed 16-bit arcade pixel art, same palette richness, same side-view fighting-game stage composition, same camera height and floor placement), create a NEW stage background: {A[k]}.
The bottom 20% is an empty flat walkable floor spanning the full width; middle area relatively clear for two fighters. No characters in the foreground, no UI, no watermark."""
  files=[('image[]',('ref.png',open('/Users/alexander/tokken/assets/arenas/colosseum.png','rb'),'image/png'))]
  r=requests.post('https://api.openai.com/v1/images/edits',headers={'Authorization':'Bearer '+KEY},files=files,data={'model':'gpt-image-2','prompt':p,'size':'1536x1024','quality':'high'},timeout=600)
  print(k,r.status_code,r.text[:200] if not r.ok else 'ok')
  if r.ok: open(f'/Users/alexander/tokken/assets/arenas/{k}.png','wb').write(base64.b64decode(r.json()['data'][0]['b64_json']))
from concurrent.futures import ThreadPoolExecutor
import sys
with ThreadPoolExecutor(2) as ex: list(ex.map(gen,[k for k in A if k in sys.argv[1:]]))
