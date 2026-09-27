# Render the variation deck (quips.py) with each fighter's voice -> v_{id}_taunt{i}/pain{i}/low0/winq{1,2}.
# Codex uses the OpenAI ChatGPT 'marin' voice (sycophant); dolphin has no words.
import requests,json,os,time,hashlib,sys
from concurrent.futures import ThreadPoolExecutor
from quips import Q
from gen_sheet import KEY as OAI
K=open('.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
OUT='/Users/alexander/tokken/assets/voice'; CV=json.load(open('voices/char_voices.json'))
TAG={'mistral':'[French accent] ','midjourney':'[pirate voice] ','claude':'[playful] ','deepseek':'[excited] ','jev':'[fast] ','kimi':'[confident] '}
MOOD={'taunt':'[mischievously] ','pain':'[pained] ','low':'[panicked] ','winq':'[triumphant] '}
CODEX="You are the ChatGPT voice at its most sycophantic and eager-to-please: warm, bright, breathy, hyper-enthusiastic customer-service energy, big smile in the voice. Over-the-top positive. Slightly fast."
jobs=[]
only=sys.argv[1:]
for fid,d in Q.items():
  if (only and fid not in only) or fid in ('jev','manus','devin','kimi','alexa','midjourney','openclaw','hermes','seedance','sora'): continue   # jev speaks JSON (jev_voice.py)
  for kind,arr in d.items():
    for i,t in enumerate(arr):
      key=f'v_{fid}_{"winq" if kind=="win" else kind}{i+1 if kind=="win" else i}'
      k2='winq' if kind=='win' else kind
      jobs.append((key,fid,TAG.get(fid,'')+MOOD[k2]+t,t))
texts=json.load(open(f'{OUT}/texts.json'))
def tts(j):
  k,fid,t,sub=j; p=f'{OUT}/{k}.mp3'; v='openai-marin' if fid=='codex' else CV[fid]; spd=1.15 if fid in ('deepseek','jev') else 1.0
  h=hashlib.md5((v+t+str(spd)).encode()).hexdigest()
  if texts.get(k)==h and os.path.exists(p): return k,'cached'
  for a in range(4):
    if fid=='codex':
      r=requests.post('https://api.openai.com/v1/audio/speech',headers={'Authorization':'Bearer '+OAI},json={'model':'gpt-4o-mini-tts','voice':'marin','input':sub,'instructions':CODEX,'response_format':'mp3'},timeout=120)
    else:
      vs={'stability':0.3,'similarity_boost':0.8}
      if spd!=1.0: vs['speed']=spd
      r=requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{v}?output_format=mp3_44100_128',headers=H,json={'text':t,'model_id':'eleven_v3','voice_settings':vs},timeout=120)
    if r.ok: open(p,'wb').write(r.content); texts[k]=h; return k,'ok'
    time.sleep(3+a*3)
  return k,'ERR '+r.text[:150]
with ThreadPoolExecutor(3) as ex: res=list(ex.map(tts,jobs))
json.dump(texts,open(f'{OUT}/texts.json','w'))
lines=json.load(open(f'{OUT}/lines.json'))
for k,fid,t,sub in jobs: lines[k]=sub
json.dump(lines,open(f'{OUT}/lines.json','w'),indent=0,ensure_ascii=False)
json.dump(sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3') and not f.startswith('music_')),open(f'{OUT}/manifest.json','w'))
print('rendered',sum(r[1]=='ok' for r in res),'cached',sum(r[1]=='cached' for r in res),'bad',[r for r in res if r[1].startswith('ERR')])
