import requests,json,os,time
from concurrent.futures import ThreadPoolExecutor
K=open('.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
OUT='/Users/alexander/tokken/assets/voice'; ANN=json.load(open('voices/cast.json'))['ANN']; F=json.load(open('fighters_meta.json'))
jobs=[]
for fid,f in F.items():
  n=f['name'].title()
  for k,t,sub in [(f'name_{fid}',n+'!',f['name']),(f'wins_{fid}',n+' wins!',f['name']+' WINS'),(f'ult_{fid}',f['ult'].title().replace('*','')+'!',f['ult'])]:
    if not os.path.exists(f'{OUT}/{k}.mp3'): jobs.append((k,'[shouting] '+t,sub))
def tts(j):
  k,t,_=j
  for a in range(3):
    r=requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{ANN}?output_format=mp3_44100_128',headers=H,json={'text':t,'model_id':'eleven_v3','voice_settings':{'stability':0.3,'similarity_boost':0.8}},timeout=120)
    if r.ok: open(f'{OUT}/{k}.mp3','wb').write(r.content); return k,'ok'
    time.sleep(3)
  return k,'ERR '+r.text[:100]
with ThreadPoolExecutor(3) as ex: print(list(ex.map(tts,jobs)))
lines=json.load(open(f'{OUT}/lines.json')); lines.update({k:sub for k,_,sub in jobs}); json.dump(lines,open(f'{OUT}/lines.json','w'),indent=0,ensure_ascii=False)
