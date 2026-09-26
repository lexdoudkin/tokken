# usage: python3 recast.py ANN=cur|A2-1  P=cur|C1-0  N=N1-0  D=D1-0
import requests,json,os,re,sys,time
from concurrent.futures import ThreadPoolExecutor
from booth import B,FS,ARENA,MATCHUP
from script import CHAR
K=open('.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
OUT='/Users/alexander/tokken/assets/voice'; AUD='/Users/alexander/tokken/assets/audition'
V=json.load(open('voices/voices.json')); CV=json.load(open('voices/char_voices.json')); DES=json.load(open(f'{AUD}/designs.json'))
cast=json.load(open('voices/cast.json')) if os.path.exists('voices/cast.json') else {'ANN':V['announcer']['voice_id'],'P':V['caster']['voice_id'],'D':CV['deepseek']}
args=dict(a.split('=') for a in sys.argv[1:])
def resolve(role,code):
  if code=='cur': return cast.get(role)
  pre,i=code.split('-'); k=[k for k in DES if k.startswith(pre+'_')][0]; g=DES[k][int(i)]
  r=requests.post('https://api.elevenlabs.io/v1/text-to-voice',headers=H,json={'voice_name':f'TOKKEN {role} {code}','voice_description':g['desc'],'generated_voice_id':g['gid']},timeout=120)
  r.raise_for_status(); return r.json()['voice_id']
changed={}
for role,code in args.items():
  vid=resolve(role,code)
  if vid!=cast.get(role) or role not in cast: changed[role]=vid
  cast[role]=vid
json.dump(cast,open('voices/cast.json','w'),indent=1); print('cast',cast,'changed',list(changed))
lines=json.load(open(f'{OUT}/lines.json')); jobs=[]
NAME={'P':'BRAD','N':'NIGEL'}
def add(key,role,text,tag,sub=None,speed=1.0):
  if role=='N': tag,speed='[excited] [sarcastic]',1.12
  jobs.append((key,cast[role],(tag+' ' if tag else '')+text,sub if sub is not None else text,speed,role))
for ev,variants in B.items():
  for i,v in enumerate(variants):
    for j,(sp,t) in enumerate(v): add(f'b_{ev}_{i}_{j}',sp,t,'[excited]' if sp=='P' else '[dry]',f'{NAME[sp]}: {t}')
for fid,(s,u,k) in FS.items():
  add(f'f_{fid}_special','P',s,'[excited]',f'BRAD: {s}'); add(f'f_{fid}_ult','P',u,'[shouting]',f'BRAD: {u}'); add(f'f_{fid}_ko','N',k,'[dry]',f'NIGEL: {k}')
for a,t in ARENA.items(): add(f'a_{a}','P',t,'[excited]',f'BRAD: {t}')
for (a,b),v in MATCHUP.items():
  for j,(sp,t) in enumerate(v): add(f'm_{a}_{b}_{j}',sp,t,'[excited]' if sp=='P' else '[dry]',f'{NAME[sp]}: {t}')
if 'ANN' in changed:
  ann=[k for k in lines if re.match(r'^(round_|final_round|prompt$|ko$|time_over|versus|select$|arena$|slop_hit|token_critical|prompt_injection|thinking|title|perfect|game_over|gen_4|name_|wins_|ult_|why_)',k)]
  for k in ann: add(k,'ANN',re.sub(r'[^\x00-\x7f]+','',lines[k]).strip() or lines[k],'[shouting]',lines[k])
if 'D' in changed:
  c=CHAR['deepseek']
  for k,t in [('line',c['line']),('intro',c['intro']),('winq',c['win']),('special',c['special']),('ult',c['ult']),('atk1','哈！'),('atk2','喝啊！'),('hurt1','哎哟！'),('hurt2','啊！'),('ko','不——！')]:
    add(f'v_deepseek_{k}','D',t,'[excited]' if k in ('line','intro','winq') else '[shouting]',t,1.15)
texts=json.load(open(f'{OUT}/texts.json')) if os.path.exists(f'{OUT}/texts.json') else {}
import hashlib
def tts(j):
  k,v,t,sub,speed,role=j; h=hashlib.md5((v+t+str(speed)).encode()).hexdigest(); p=f'{OUT}/{k}.mp3'
  if texts.get(k)==h and os.path.exists(p): return k,'cached'
  vs={'stability':0.3,'similarity_boost':0.8}
  if speed!=1.0: vs['speed']=speed
  for a in range(4):
    r=requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{v}?output_format=mp3_44100_128',headers=H,json={'text':t,'model_id':'eleven_v3','voice_settings':vs},timeout=120)
    if r.ok: open(p,'wb').write(r.content); texts[k]=h; return k,'ok'
    time.sleep(3+a*3)
  return k,'ERR '+r.text[:150]
with ThreadPoolExecutor(3) as ex: res=list(ex.map(tts,jobs))
json.dump(texts,open(f'{OUT}/texts.json','w'))
for k,v,t,sub,sp,role in jobs: lines[k]=sub
json.dump(lines,open(f'{OUT}/lines.json','w'),indent=0,ensure_ascii=False)
json.dump(sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3') and not f.startswith('music_')),open(f'{OUT}/manifest.json','w'))
print('rendered',sum(r[1]=='ok' for r in res),'cached',sum(r[1]=='cached' for r in res),'bad',[r for r in res if r[1].startswith('ERR')])
