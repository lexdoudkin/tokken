import requests,base64,json,os,re,time
from concurrent.futures import ThreadPoolExecutor
K=open('.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
OUT='/Users/alexander/tokken/assets/voice'; F=json.load(open('fighters_meta.json'))
D={
 'claude':"Calm, polite, slightly anxious genius, soft-spoken American-British young man, thoughtful and apologetic but capable of sudden intensity when fighting, warm clear voice",
 'codex':"Small cute robot with a bright, eager, slightly synthetic voice, fast-talking and chipper like an enthusiastic junior engineer, crisp and punchy",
 'gemini':"Bright, confident, sparkly young woman with a polished tech-presenter voice, upbeat and a little overeager",
 'grok':"Edgy, sarcastic, gravelly young man with a smug unhinged attitude, growling trash talk, raspy and cocky",
 'llama':"Friendly laid-back hippie surfer dude with a goofy relaxed drawl, big-hearted and chill but hits hard",
 'deepseek':"Calm, efficient, precise male voice, soft-spoken and understated, deadpan and quietly confident",
 'mistral':"Elegant, theatrical French fencing master with a strong French accent, dramatic and suave, a little arrogant",
 'perplexity':"Rapid-fire, nerdy, precise female research assistant voice, speaks fast like reading footnotes, clipped and matter-of-fact",
 'muse':"Extremely cute, fluffy, squeaky kawaii mascot voice, bubbly and adorable like a plush toy that talks, high pitched",
 'clippy':"Chirpy, nasal, overly helpful 1990s cartoon office assistant voice, relentlessly cheerful and slightly annoying, bouncy",
}
LINES=lambda f:{'intro':f['intro'],'special':f['special'].title()+'!','ult':f['ult'].title()+'!','atk1':'[grunts] Hah!','atk2':'[shouting] Hyaaah!','hurt1':'[pained] Ugh!','hurt2':'[pained] Argh!','ko':'[screams] Noooooo!','line':f['line'],'winq':f['win']}
INTRO={'claude':"I'll try to be helpful. Violently.",'codex':'Running tests... on your face.','gemini':'Let me help you with that. Loss.','grok':'Time to get spicy.','llama':'Open weights, open season.','deepseek':'I was trained for less than your lunch.','mistral':'En garde, mon ami!','perplexity':'According to three sources, you lose.','muse':'Hiii! Wanna fight? Hehe!','clippy':"It looks like you're trying to lose!"}
vmap=json.load(open('voices/char_voices.json')) if os.path.exists('voices/char_voices.json') else {}
def design(fid):
  if fid in vmap: return fid,vmap[fid]
  f=F[fid]; txt=f"{INTRO[fid]} {f['line']} {f['special']}! {f['ult']}! {f['win']}"
  txt=(txt+' ')*(1+ (100//len(txt)))
  r=requests.post('https://api.elevenlabs.io/v1/text-to-voice/design',headers=H,json={'voice_description':D[fid],'text':txt[:900],'model_id':'eleven_ttv_v3'},timeout=300)
  if r.status_code!=200: return fid,'ERR '+r.text[:200]
  g=r.json()['previews'][0]['generated_voice_id']
  r2=requests.post('https://api.elevenlabs.io/v1/text-to-voice',headers=H,json={'voice_name':f'TOKKEN {fid}','voice_description':D[fid],'generated_voice_id':g},timeout=120)
  return fid,r2.json().get('voice_id') or 'ERR '+r2.text[:200]
with ThreadPoolExecutor(5) as ex: res=dict(ex.map(design,D))
print(res); vmap.update({k:v for k,v in res.items() if not v.startswith('ERR')}); json.dump(vmap,open('voices/char_voices.json','w'),indent=1)
jobs=[]
for fid,vid in vmap.items():
  f=dict(F[fid]); f['intro']=INTRO[fid]
  for k,t in LINES(f).items(): jobs.append((f'v_{fid}_{k}',vid,t))
def tts(j):
  k,v,t=j; p=f'{OUT}/{k}.mp3'
  if os.path.exists(p): return k,'cached'
  for a in range(3):
    r=requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{v}?output_format=mp3_44100_128',headers=H,json={'text':t,'model_id':'eleven_v3','voice_settings':{'stability':0.35,'similarity_boost':0.8}},timeout=120)
    if r.status_code==200: open(p,'wb').write(r.content); return k,'ok'
    time.sleep(3)
  return k,'ERR '+r.text[:100]
with ThreadPoolExecutor(4) as ex: r=list(ex.map(tts,jobs))
print('bad',[x for x in r if x[1].startswith('ERR')])
# dolphin: all sfx
DS={'intro':'Dolphin loud excited chattering and squeaking, aggressive','special':'Dolphin shrill battle squeal','ult':'Dolphin ecstatic high pitched screaming squeals with echo','atk1':'Short dolphin click burst','atk2':'Short sharp dolphin squeak','hurt1':'Dolphin short distressed squeak','hurt2':'Dolphin pained whistle','ko':'Dolphin sad long descending whistle','line':'Dolphin friendly clicking and squeaking','winq':'Dolphin triumphant chattering squeals and splashing'}
def ds(kv):
  k,t=kv; p=f'{OUT}/v_dolphin_{k}.mp3'
  if os.path.exists(p): return
  r=requests.post('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',headers=H,json={'text':t,'duration_seconds':1.2 if k.startswith(('atk','hurt')) else 2.2,'prompt_influence':0.6},timeout=120)
  if r.status_code==200: open(p,'wb').write(r.content)
with ThreadPoolExecutor(4) as ex: list(ex.map(ds,DS.items()))
json.dump(sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3') and not f.startswith('music_')),open(f'{OUT}/manifest.json','w'))
lines=json.load(open(f'{OUT}/lines.json'))
for k,v,t in jobs: lines[k]=re.sub(r'^\[[a-z ]+\] ','',t)
json.dump(lines,open(f'{OUT}/lines.json','w'),indent=0); print('done')
