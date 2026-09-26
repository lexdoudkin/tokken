import os,sys,base64,json,subprocess,time,requests
env={}
for l in open('/Users/alexander/Repos/mindsai/webapp/.env'):
  if '=' in l and not l.startswith('#'):
    k,v=l.strip().split('=',1); env[k]=v.strip('"\'')
KEY=env['OPENAI_API_KEY']
POSES="""Row 1: (1) IDLE fighting stance, (2) WALKING forward mid-stride, (3) JUMPING airborne tucked, (4) CROUCHING low.
Row 2: (5) BLOCKING with guard up, (6) LIGHT ATTACK quick jab/punch extended forward, (7) HEAVY ATTACK big powerful strike or kick at full extension, (8) SPECIAL MOVE casting/throwing an energy projectile forward (projectile NOT drawn, just the throwing pose).
Row 3: (9) HIT reeling backwards in pain, (10) KNOCKED DOWN lying flat defeated with X eyes, (11) VICTORY triumphant pose, (12) ULTIMATE powered-up pose with glowing aura."""
def gen(fid, desc, refs, model='gpt-image-2', out=None):
  prompt=f"""Create a 2D fighting-game SPRITE SHEET of this exact character: {desc}
Preserve the character's official, recognizable mascot design, silhouette and colors from the reference image(s) EXACTLY — it must be instantly recognizable as the original mascot, just animated into a combat-ready fighter (it may gain small stubby arms/legs only if needed to fight).
Art style: crisp high-quality 16-bit arcade pixel art (Street Fighter Alpha / Metal Slug quality), bold dark outline, cel shading, consistent scale and proportions in every frame.
Layout: a strict 4 columns x 3 rows grid of 12 separate poses, each pose centered in its own equal cell with generous empty space between cells, never overlapping cell borders. ALL poses face RIGHT. Same character size in every cell, feet on the same baseline within each row.
{POSES}
IMPORTANT: every pose INCLUDING all auras, flames, motion trails and effects must fit entirely inside its own cell with at least 24px padding — nothing may touch or cross a cell edge; keep effects compact (especially the ULTIMATE aura).
Background: fully transparent (no floor, no shadows, no scenery, no text, no labels, no grid lines, no numbers)."""
  refs=refs+['/Users/alexander/tokken/assets/gen/gemini_sheet.png']
  prompt+="\nThe LAST reference image is an existing sprite sheet from this same game: match its exact art style, outline weight, pixel density, shading, character scale and grid layout (but NOT its character)."
  files=[('image[]',(os.path.basename(r),open(r,'rb'),'image/png')) for r in refs]
  data={'model':model,'prompt':prompt,'size':'1536x1024','background':'transparent','quality':'high','n':'1'}
  t=time.time()
  r=requests.post('https://api.openai.com/v1/images/edits',headers={'Authorization':'Bearer '+KEY},files=files,data=data,timeout=600)
  if r.status_code!=200:
    print(fid,'ERR',r.status_code,r.text[:500]); return None
  b=r.json()['data'][0]['b64_json']
  out=out or f'/Users/alexander/tokken/assets/gen/{fid}_sheet.png'
  os.makedirs(os.path.dirname(out),exist_ok=True)
  open(out,'wb').write(base64.b64decode(b)); print(fid,'ok',round(time.time()-t),'s',out); return out
if __name__=='__main__':
  spec=json.load(open(sys.argv[1]))
  fid=sys.argv[2]; s=spec[fid]
  gen(fid,s['desc'],s['refs'],s.get('model','gpt-image-2'),sys.argv[3] if len(sys.argv)>3 else None)
