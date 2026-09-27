import requests,json,os,re,time,hashlib
from concurrent.futures import ThreadPoolExecutor
from script import CHAR,CASTER,PER
K=open('.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
OUT='/Users/alexander/tokken/assets/voice'; V=json.load(open('voices/voices.json')); CV=json.load(open('voices/char_voices.json'))
F=json.load(open('fighters_meta.json'))
# DeepSeek: redesign as a Mandarin-native voice
if 'deepseek_zh' not in CV:
  desc="Calm, deadpan Chinese male software engineer in his thirties, native Mandarin speaker who also speaks English with a light Chinese accent, understated, dry and quietly smug"
  txt="服务器繁忙，请稍后再试。 Server is busy. Please try again later. 我的训练成本比你的午饭还便宜。 I was trained for less than your lunch. 太便宜了！ Too cheap! Your entire company costs more than my GPUs."
  r=requests.post('https://api.elevenlabs.io/v1/text-to-voice/design',headers=H,json={'voice_description':desc,'text':txt,'model_id':'eleven_ttv_v3'},timeout=300); r.raise_for_status()
  g=r.json()['previews'][0]['generated_voice_id']
  r2=requests.post('https://api.elevenlabs.io/v1/text-to-voice',headers=H,json={'voice_name':'TOKKEN deepseek zh','voice_description':desc,'generated_voice_id':g},timeout=120)
  CV['deepseek_zh']=r2.json()['voice_id']; CV['deepseek']=CV['deepseek_zh']; json.dump(CV,open('voices/char_voices.json','w'),indent=1); print('deepseek voice',CV['deepseek'])
TAG={'mistral':'[French accent] ','midjourney':'[pirate voice] ','claude':'[playful] ','deepseek':'[excited] ','jev':'[fast] ','kimi':'[confident] '}
jobs=[]  # key, voice, text(with tags), subtitle
for k,t in CASTER.items(): jobs.append((k,V['caster']['voice_id'],'[excited] '+t,t))
for fid,f in F.items():
  n=f['name'].title()
  for k,t in PER.items(): tt=t.format(n=n); jobs.append((k.format(id=fid),V['caster']['voice_id'],'[excited] '+tt,tt))
  c=CHAR[fid]
  for r in c['ko']:
    key='why_'+re.sub(r'[^a-z0-9]+','_',r.lower()).strip('_'); spoken=re.sub(r'[^\x00-\x7f]+','',r).strip().replace('97','ninety seven').replace("'",'').title()+'!'
    jobs.append((key,V['announcer']['voice_id'],'[shouting] '+spoken,r))
  if fid in ('dolphin','codex','jev','manus','devin','kimi','alexa','midjourney','openclaw','hermes','seedance','sora'): continue  # see jev_voice.py / release_voices.py  # jev: jev_voice.py (JSON only)  # codex uses the OpenAI ChatGPT voice (codex_voice.py)
  for k in ('line','intro','win'):
    jobs.append((f'v_{fid}_{"winq" if k=="win" else k}',CV[fid],TAG.get(fid,'')+c[k],c[k]))
  if fid=='deepseek':
    jobs.append(('v_deepseek_special',CV[fid],'[shouting] '+c['special'],c['special'])); jobs.append(('v_deepseek_ult',CV[fid],'[shouting] '+c['ult'],c['ult']))
    for k,t in [('atk1','[grunts] 哈！'),('atk2','[shouting] 喝啊！'),('hurt1','[pained] 哎哟！'),('hurt2','[pained] 啊！'),('ko','[screams] 不——！')]: jobs.append((f'v_deepseek_{k}',CV[fid],t,t))
  else:
    pre=TAG.get(fid,'')
    for k,t in [('special','[shouting] '+f.get('say_special',f['special'].title())+'!'),('ult','[shouting] '+f.get('say_ult',f['ult'].title())+'!'),('atk1','[grunts] Hah!'),('atk2','[shouting] Hyaaah!'),('hurt1','[pained] Ugh!'),('hurt2','[pained] Argh!'),('ko','[screams] Noooooo!')]:
      key=f'v_{fid}_{k}'
      if os.path.exists(f'{OUT}/{key}.mp3'): continue   # already rendered with this fighter's voice
      jobs.append((key,CV[fid],pre+t,re.sub(r'^\[[a-z ]+\] ','',t)))
texts=json.load(open(f'{OUT}/texts.json')) if os.path.exists(f'{OUT}/texts.json') else {}
def tts(j):
  k,v,t,_=j; p=f'{OUT}/{k}.mp3'; spd=1.15 if k.startswith('v_deepseek') else 1.0; h=hashlib.md5((v+t+('' if spd==1.0 else str(spd))).encode()).hexdigest()
  if texts.get(k)==h and os.path.exists(p): return k,'cached'
  for a in range(3):
    r=requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{v}?output_format=mp3_44100_128',headers=H,json={'text':t,'model_id':'eleven_v3','voice_settings':{'stability':0.3,'similarity_boost':0.8,**({'speed':spd} if spd!=1.0 else {})}},timeout=120)
    if r.status_code==200: open(p,'wb').write(r.content); texts[k]=h; return k,'ok'
    time.sleep(3)
  return k,'ERR '+r.text[:120]
with ThreadPoolExecutor(3) as ex: res=list(ex.map(tts,jobs))
json.dump(texts,open(f'{OUT}/texts.json','w'))
print('rendered',sum(1 for r in res if r[1]=='ok'),'bad',[r for r in res if r[1].startswith('ERR')])
lines=json.load(open(f'{OUT}/lines.json'))
for k,v,t,sub in jobs: lines[k]=sub
json.dump(lines,open(f'{OUT}/lines.json','w'),indent=0,ensure_ascii=False)
json.dump(sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3') and not f.startswith('music_')),open(f'{OUT}/manifest.json','w'))
