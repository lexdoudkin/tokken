import sys,base64,requests,os,time
from gen_sheet import KEY
A={
'singularity':"THE SINGULARITY: a cosmic event-horizon arena where reality is dissolving into glowing data, a giant swirling black-hole galaxy of neon code and paperclips in the sky, floating broken server racks and GPUs being sucked into the vortex, fractal light, a floating obsidian platform as the floor",
'hearing':"THE SENATE HEARING: a grand wood-paneled US congressional hearing room, elderly senators on a raised dais squinting at printed-out tweets, 'AI SAFETY HEARING' banner, cameras flashing, a lonely witness table with microphones, American flags",
'boardroom':"THE BOARD MEETING, NOV 17: a sleek glass Silicon Valley boardroom at night, a long table littered with coffee cups, a wall screen showing a Google Meet call with blurred faces, a whiteboard reading 'WE NEED TO TALK', a knocked-over chair, city lights outside",
'leaderboard':"THE BENCHMARK: a colossal neon leaderboard stadium, giant scoreboard towers listing fake model names with scores like 99.9%, confetti cannons, '#1 ON EVERY BENCHMARK' banner, bar charts with suspiciously cropped y-axes",

'hackerhouse':"THE SF HACKER HOUSE: a Victorian San Francisco painted-lady house interior turned startup hacker house, bunk beds, whiteboards covered in 'AGI 2027' and pitch-deck scribbles, beanbags, standing desks with multiple monitors, Soylent and La Croix cases, a neon 'SHIP IT' sign, bay window showing SF hills and fog at golden hour",
'goldengate':"THE GOLDEN GATE BRIDGE: fighting on the roadway of the Golden Gate Bridge at sunset, the huge international-orange tower and suspension cables rising behind, Karl the Fog rolling in over the bay, stopped Waymo robotaxis in the far lanes, San Francisco skyline in the distance",
'_':'',
'colosseum':"THE GPU COLOSSEUM: a gigantic esports stadium arena at night, tiered stands packed with a crowd of tiny cute robot/AI-avatar spectators, giant jumbotron screens, stacks of glowing GPU server racks as pillars, NVIDIA-green and purple spotlights, lasers, confetti",
'datacenter':"THE DATA CENTER: an endless hall of server racks with blinking blue/green LEDs, huge cooling fans, cable trays overhead, cold blue lighting, holographic 'TOKENS/SEC' readouts, raised floor tiles",
'feed':"AI TWITTER: a surreal arena inside a giant social media feed, huge floating post cards with blurred avatars and like/retweet icons, 'AGI WHEN?' and 'SCALE IS ALL YOU NEED' banners, dark blue UI, notification bubbles floating",
'basement':"THE HACKER BASEMENT: a cramped basement lair with RGB-lit mechanical keyboards on walls, stacks of monitors with green terminal code, energy drink cans pyramid, neon signs, pizza boxes, a gaming chair",
}
def gen(k):
  p=f"""Side-view 2D fighting game STAGE BACKGROUND, wide landscape, crisp detailed 16-bit arcade pixel art (Street Fighter III / King of Fighters stage quality). {A[k]}.
Composition: the bottom 20% is an empty flat walkable floor spanning the full width; the middle area is kept relatively clear for two fighters; detail and depth in the background. No characters in the foreground, no text UI, no health bars, no logos, no watermark."""
  t=time.time()
  r=requests.post('https://api.openai.com/v1/images/generations',headers={'Authorization':'Bearer '+KEY},json={'model':'gpt-image-2','prompt':p,'size':'1536x1024','quality':'high','n':1},timeout=600)
  if r.status_code!=200: print(k,'ERR',r.text[:400]); return
  os.makedirs('/Users/alexander/tokken/assets/arenas',exist_ok=True)
  open(f'/Users/alexander/tokken/assets/arenas/{k}.png','wb').write(base64.b64decode(r.json()['data'][0]['b64_json'])); print(k,'ok',round(time.time()-t))
from concurrent.futures import ThreadPoolExecutor
import sys
with ThreadPoolExecutor(4) as ex: list(ex.map(gen,[k for k in A if k in sys.argv[1:]]))
