import sys,json,base64,requests,os,time
import numpy as np
from PIL import Image
from scipy import ndimage
from gen_sheet import KEY
PD={'ult':'ULTIMATE powered-up pose with a compact glowing aura around the body','special':'SPECIAL MOVE casting/throwing an energy projectile forward (projectile not drawn, just the throwing pose)','heavy':'HEAVY ATTACK big powerful strike at full extension'}
def gen(fid,pose):
  spec=json.load(open('fighters.json'))[fid]
  refs=[f'/Users/alexander/tokken/assets/sprites/{fid}/idle.png',f'/Users/alexander/tokken/assets/sprites/{fid}/{pose}.png']
  p=f"""Draw ONE single sprite of this exact character (same art style, pixel density, colors, outline and proportions as the reference sprites): {spec['desc']}
Pose: {PD[pose]}, facing RIGHT. Crisp 16-bit arcade pixel art. The whole character AND all effects must be fully inside the canvas, centered, with at least 120px of empty transparent margin on every side — nothing touches the edges. Transparent background, no text, no shadow, no floor."""
  files=[('image[]',(os.path.basename(r),open(r,'rb'),'image/png')) for r in refs]
  r=requests.post('https://api.openai.com/v1/images/edits',headers={'Authorization':'Bearer '+KEY},files=files,data={'model':'gpt-image-2','prompt':p,'size':'1024x1024','background':'transparent','quality':'high'},timeout=600)
  if r.status_code!=200: print(fid,pose,'ERR',r.text[:300]); return
  out=f'/Users/alexander/tokken/assets/gen/{fid}_{pose}.png'; open(out,'wb').write(base64.b64decode(r.json()['data'][0]['b64_json']))
  a=np.array(Image.open(out).convert('RGBA')); a[:,:,3]=np.where(a[:,:,3]<40,0,a[:,:,3]); mask=a[:,:,3]>0
  lab,n=ndimage.label(ndimage.binary_dilation(mask,iterations=3)); areas=ndimage.sum(mask,lab,range(1,n+1)); main=int(np.argmax(areas))+1
  objs=ndimage.find_objects(lab); ms=objs[main-1]; g=60
  keep=[k for k in range(1,n+1) if k==main or (areas[k-1]>30 and objs[k-1][0].start<ms[0].stop+g and objs[k-1][0].stop>ms[0].start-g and objs[k-1][1].start<ms[1].stop+g and objs[k-1][1].stop>ms[1].start-g)]
  m=np.isin(lab,keep)&mask; ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
  crop=a[y0:y1,x0:x1].copy(); crop[:,:,3]=np.where(m[y0:y1,x0:x1],crop[:,:,3],0)
  # scale so the body matches the sheet scale: match main-body height ratio vs idle
  meta=json.load(open(f'/Users/alexander/tokken/assets/sprites/{fid}/meta.json'))
  mk=(lab[y0:y1,x0:x1]==main)&m[y0:y1,x0:x1]; mys,mxs=np.where(mk)
  old=meta[pose]; scale=(old[2]-old[4])/max(1,(mys.max()+1-mys.min())) if pose!='ult' else meta['idle'][1]/max(1,(mys.max()+1-mys.min()))*1.05
  im=Image.fromarray(crop); W2,H2=max(1,int(im.width*scale)),max(1,int(im.height*scale)); im=im.resize((W2,H2),Image.NEAREST)
  im.save(f'/Users/alexander/tokken/assets/sprites/{fid}/{pose}.png')
  meta[pose]=[W2,H2,int((mys.max()+1)*scale),int(mxs.mean()*scale),int(mys.min()*scale)]
  json.dump(meta,open(f'/Users/alexander/tokken/assets/sprites/{fid}/meta.json','w')); print(fid,pose,'ok',meta[pose])
if __name__=='__main__': gen(sys.argv[1],sys.argv[2])
