import os,sys,json,base64,time,requests
from gen_sheet import KEY
F=json.load(open('fighters.json'))
def gen(fid):
  out=f'/Users/alexander/tokken/assets/gen/{fid}_motion.png'
  if os.path.exists(out): return fid,'cached'
  sp=f'/Users/alexander/tokken/assets/sprites/{fid}'
  refs=[f'{sp}/idle.png',f'{sp}/walk.png',f'/Users/alexander/tokken/assets/gen/{fid}_sheet.png']
  p=f"""Create an ANIMATION SPRITE SHEET for this exact fighting-game character (the first two reference images are the character's idle and walk sprites, the third is its full pose sheet — match the character, art style, colors, outline weight and pixel density EXACTLY): {F[fid]['desc']}
Strict 4 columns x 3 rows grid, 12 frames, every frame the SAME character size and scale, feet on the same baseline, all facing RIGHT, each frame centered in its equal cell with generous empty space, nothing crossing cell edges.
Rows 1-2 (frames 1-8): a smooth, fluid 8-frame WALK CYCLE moving forward in fighting stance — contact, down, passing, up, contact (other leg), down, passing, up. Clear leg alternation and arm swing, subtle body bob, guard kept up. (If the character has no legs, show a hovering glide cycle with bobbing and floating hands.)
Row 3 (frames 9-12): a 4-frame IDLE FIGHT-STANCE loop — breathing, bouncing slightly on the toes, guard up, small secondary motion (hair/cloth/aura).
Crisp 16-bit arcade pixel art. Fully transparent background, no text, no shadows, no floor, no effects."""
  files=[('image[]',(os.path.basename(r),open(r,'rb'),'image/png')) for r in refs]
  for a in range(2):
    r=requests.post('https://api.openai.com/v1/images/edits',headers={'Authorization':'Bearer '+KEY},files=[('image[]',(os.path.basename(x),open(x,'rb'),'image/png')) for x in refs],data={'model':'gpt-image-2','prompt':p,'size':'1536x1024','background':'transparent','quality':'high'},timeout=600)
    if r.ok: open(out,'wb').write(base64.b64decode(r.json()['data'][0]['b64_json'])); return fid,'ok'
    time.sleep(5)
  return fid,'ERR '+r.text[:200]
from concurrent.futures import ThreadPoolExecutor
ids=sys.argv[1:] or [k for k in F]
with ThreadPoolExecutor(5) as ex:
  for r in ex.map(gen,ids): print(r,flush=True)
