import requests,base64,json,os
from concurrent.futures import ThreadPoolExecutor
K=open('.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
OUT='/Users/alexander/tokken/assets/audition'; os.makedirs(OUT,exist_ok=True)
ANN="Round one... PROMPT! Claude... versus... DeepSeek! K. O.! Context window exceeded! Final round! Token limit reached! Perfect!"
CAS="Oh my word, that's eight thousand tokens! Somebody's getting a call from finance! And he's stuck in the loop! Somebody press escape! UNBELIEVABLE SCENES!"
ANA="Well, Jim, he's burning compute like it's someone else's money. Because it is. Look, fundamentally, that was a hallucination. Textbook. I've seen better guardrails on a shopping cart."
D={
 'A1_classic':("Legendary 1990s arcade fighting game announcer, extremely deep booming gravelly male voice, bellowing every word with drawn-out vowels, huge and heroic",ANN),
 'A2_tekken':("Late 1990s Japanese arcade fighting game announcer speaking English, deep, crisp, dramatic, punchy staccato delivery with a slight Japanese accent, iconic and intense",ANN),
 'A3_kombat':("Menacing dark 1990s arcade tournament announcer, extremely deep, slightly distorted and demonic, slow, ominous and theatrical",ANN),
 'C1_uk_football':("Hyped British football commentator from the early 2000s, fast, hoarse from shouting, voice cracking with excitement at big moments",CAS),
 'C2_esports':("American esports shoutcaster at a major fighting game tournament finals, young, extremely hyped, screaming and laughing, rapid-fire",CAS),
 'C3_boxing':("Old-school American boxing and pro-wrestling play-by-play commentator, gravelly, loud, dramatic, theatrical outrage and excitement",CAS),
 'N1_dry_brit':("Dry, deadpan British former professional fighter turned color commentator, unimpressed, sardonic, understated wit, calm",ANA),
 'N2_tech_cynic':("Cynical American tech podcaster in his forties, sarcastic, world-weary, smug, dry comedic timing, calm and slow",ANA),
 'N3_old_pro':("Grizzled old American color commentator, slow, folksy, gravelly, deadpan jokes, sounds like he has seen it all",ANA),
}
def design(kv):
  k,(desc,txt)=kv
  r=requests.post('https://api.elevenlabs.io/v1/text-to-voice/design',headers=H,json={'voice_description':desc,'text':txt,'model_id':'eleven_ttv_v3'},timeout=300)
  if not r.ok: return k,'ERR '+r.text[:200]
  out=[]
  for i,p in enumerate(r.json()['previews']):
    open(f'{OUT}/{k}_{i}.mp3','wb').write(base64.b64decode(p['audio_base_64'])); out.append({'file':f'{k}_{i}.mp3','gid':p['generated_voice_id'],'desc':desc})
  return k,out
with ThreadPoolExecutor(3) as ex: res=dict(ex.map(design,D.items()))
bad={k:v for k,v in res.items() if isinstance(v,str)}; print('bad',bad)
json.dump(res,open(f'{OUT}/designs.json','w'),indent=1)
