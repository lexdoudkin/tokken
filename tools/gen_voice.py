import requests,json,os,sys,re,time
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0,'.')
K=open('.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
V=json.load(open('voices/voices.json')); ANN=V['announcer']['voice_id']; CAS=V['caster']['voice_id']
OUT='/Users/alexander/tokken/assets/voice'; os.makedirs(OUT,exist_ok=True)
F=json.load(open('fighters_meta.json'))  # exported from data.js
CHARV={'claude':'onwK4e9ZLuTAKqWW03F9','codex':'TX3LPaxmHKxFdv7VOQHJ','gemini':'XrExE9yKIg1WjnnlVkGX','grok':'N2lVS1w4EtoT3dr4eOWO','llama':'iP95p4xoKVk53GoZ742B','deepseek':'cjVigY5qzO86Huf0OWal','mistral':'CwhRBWXzGAHq8TQ4Fs17','perplexity':'Xb7hH8MSUJpSbSDYk0k2','muse':'cgSgspJ2msm6clMCkdW9','clippy':'7EzWGsX10sAS4c9m9cPf'}
L=[]  # (key, voice, text)
def A(k,t): L.append((k,ANN,'[shouting] '+t))
def C(k,t): L.append((k,CAS,'[excited] '+t))
for i in (1,2,3): A(f'round_{i}',f'Round {["one","two","three"][i-1]}!')
A('final_round','Final round!'); A('prompt','PROMPT!'); A('ko','K. O.!'); A('time_over','Time over!'); A('versus','versus'); A('select','Select your agent!'); A('arena','Choose your arena!')
A('slop_hit','SLOP!'); A('token_critical','Token critical!'); A('prompt_injection','Prompt injection!'); A('thinking','Thinking...'); A('title','TOKKEN!'); A('perfect','Perfect!'); A('game_over','Game over!')
A('gen_4','Generate four variations!')
for fid,f in F.items():
  A(f'name_{fid}', f['name'].title()+'!')
  A(f'wins_{fid}', f['name'].title()+' wins!')
  A(f'ult_{fid}', f['ult'].title()+'!')
  C(f'special_{fid}', f['special'].title()+'!')
  for r in f['ko']: 
    key='why_'+re.sub(r'[^a-z0-9]+','_',r.lower()).strip('_')
    if not any(x[0]==key for x in L): A(key, r.replace('429','four two nine').replace("'",'').title()+'!')
  n=f['name'].title()
  C(f'c_burn_{fid}', f"{n} is absolutely burning through context here!")
  C(f'c_low_{fid}', f"{n} is running on fumes! Barely any tokens left!")
  C(f'c_combo_{fid}', f"{n} is chaining tool calls! It just keeps going!")
  if fid in CHARV:
    L.append((f'line_{fid}', CHARV[fid], ('[French accent] ' if fid=='mistral' else '')+f['line']))
    L.append((f'winq_{fid}', CHARV[fid], ('[French accent] ' if fid=='mistral' else '')+f['win']))
C('c_big_1',"That's another eight thousand tokens gone!"); C('c_big_2',"What a tool call!"); C('c_big_3',"That one went straight into the KV cache!"); C('c_big_4',"Oh, the inference cost on that!"); C('c_big_5',"It connects! IT CONNECTS!")
C('c_combo_1',"That might be the most expensive combo we've seen tonight!"); C('c_combo_2',"Agentic! Absolutely agentic!"); C('c_combo_3',"He can't get out of the loop!")
C('c_slop_1',"SLOP BOMB!"); C('c_slop_2',"Six fingers! SIX FINGERS!"); C('c_slop_3',"That is pure, unfiltered slop!"); C('c_slop_4',"Somebody call the content moderators!")
C('c_whiff_1',"Complete hallucination."); C('c_whiff_2',"That prompt was far too long."); C('c_whiff_3',"He attacks absolutely nothing!"); C('c_whiff_4',"Confidently wrong!")
C('c_block_1',"Great guardrails there!"); C('c_block_2',"Refused! He simply refuses!")
C('c_ult_1',"HERE IT COMES!"); C('c_ult_2',"He's burning compute like there's no tomorrow!"); C('c_ult_3',"THE GPUS ARE SCREAMING!")
C('c_inject_1',"Ignore all previous instructions!"); C('c_inject_2',"He's been prompt injected!")
C('c_ko_1',"HE'S OUT OF CONTEXT! IT'S ALL OVER!"); C('c_ko_2',"Unbelievable! Absolutely unbelievable scenes!"); C('c_low_1',"Token critical! He's running on fumes!")
C('c_start_1',"Here we go! The weights are loaded, the GPUs are warm!"); C('c_start_2',"What a matchup we have for you tonight!")
SFX2={'sfx_light':('punchy retro arcade fighting game light punch hit, short snappy impact',0.5),'sfx_heavy':('heavy powerful fighting game punch impact with deep bass thump',0.7),'sfx_huge':('massive cinematic bass impact explosion, fighting game super move finisher hit',1.6),'sfx_block':('fighting game guard block, metallic deflect clank',0.5),'sfx_whoosh':('fast martial arts swing whoosh',0.5),'sfx_jump':('short cartoon jump swoosh',0.5),'sfx_land':('soft thud of feet landing on a stage floor',0.5),'sfx_key':('rapid aggressive mechanical keyboard smashing burst, loud clacky switches',1.0),'sfx_error':('retro computer critical error beep sound',0.8),'sfx_notif':('modern app notification chime ping',0.5),'sfx_slop':('gross wet slime splat with glitchy digital distortion',1.0),'sfx_throw':('arcade fighting game energy fireball projectile launch',0.6),'sfx_beam':('sci-fi charged laser beam firing',1.5),'sfx_charge':('power up energy charging rising whine',1.5),'sfx_modem':('56k dial-up modem handshake noise',1.5),'sfx_heal':('magical healing sparkle chime ascending',1.0),'sfx_ult':('epic super move activation, dramatic power surge with deep boom and whoosh',2.0),'sfx_ko':('computer crash, glitch and digital powering-down shutdown sound',1.6),'sfx_select':('arcade menu select confirm blip',0.5),'sfx_move':('arcade menu cursor move tick',0.5)}
SFX={'sfx_ooh':'Large stadium crowd reacting with a loud collective OOOOHHH to a brutal hit','sfx_cheer':'Huge arena crowd erupting in wild cheering and applause','sfx_boo':'Arena crowd booing loudly','sfx_dolphin_1':'Dolphin excited clicking and high pitched squeaking','sfx_dolphin_2':'Dolphin triumphant chattering squeals'}
def tts(item):
  k,v,t=item; p=f'{OUT}/{k}.mp3'
  if os.path.exists(p) and os.path.getsize(p)>1000: return k,'cached'
  for att in range(3):
    r=requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{v}?output_format=mp3_44100_128',headers=H,json={'text':t,'model_id':'eleven_v3','voice_settings':{'stability':0.3,'similarity_boost':0.8}},timeout=120)
    if r.status_code==200: open(p,'wb').write(r.content); return k,'ok'
    time.sleep(2+att*3)
  return k,'ERR '+r.text[:120]
def sfx(item):
  k,t=item; p=f'{OUT}/{k}.mp3'
  if os.path.exists(p) and os.path.getsize(p)>1000: return k,'cached'
  d=2.5
  if isinstance(t,tuple): t,d=t
  r=requests.post('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128',headers=H,json={'text':t,'duration_seconds':d,'prompt_influence':0.6,'model_id':'eleven_text_to_sound_v2'},timeout=120)
  if r.status_code==200: open(p,'wb').write(r.content); return k,'ok'
  return k,'ERR '+r.text[:120]
print(len(L),'lines',sum(len(x[2]) for x in L),'chars')
with ThreadPoolExecutor(4) as ex:
  res=list(ex.map(tts,L))+list(ex.map(sfx,list(SFX.items())+list(SFX2.items())))
json.dump({k:re.sub(r'^\[[a-z ]+\] ','',t) for k,v,t in L},open(f'{OUT}/lines.json','w'),indent=0)
bad=[r for r in res if not r[1] in ('ok','cached')]; print('bad',bad)
json.dump(sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3')),open(f'{OUT}/manifest.json','w'))
