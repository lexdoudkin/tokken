import requests,base64,json,os,sys
K=open('.secrets/eleven').read().strip()
H={'xi-api-key':K,'Content-Type':'application/json'}
V={
 'announcer':("Legendary 1990s arcade fighting game announcer. Extremely deep, booming, gravelly male voice, larger than life, bellowing every word with maximum intensity and drawn-out vowels, like the classic Street Fighter and Mortal Kombat announcers. Studio quality.",
   "Round one... PROMPT! Claude... versus... Dolphin! K.O.! Context window exceeded! Token limit reached! Final round! Perfect!"),
 'caster':("Hyped British football commentator from the early 2000s, fast-talking, hoarse from shouting, voice cracking with excitement, screaming at big moments like a last-minute World Cup goal. Studio quality.",
   "Oh my word, that's another eight thousand tokens gone! Claude is absolutely burning through context here! What a tool call! Unbelievable, a complete hallucination! He's out of context!"),
}
os.makedirs('voices',exist_ok=True); res={}
for k,(desc,text) in V.items():
  r=requests.post('https://api.elevenlabs.io/v1/text-to-voice/design',headers=H,json={'voice_description':desc,'text':text,'model_id':'eleven_ttv_v3'},timeout=300)
  if r.status_code!=200: print(k,'ERR',r.status_code,r.text[:300]); continue
  pv=r.json()['previews']
  for i,p in enumerate(pv): open(f'voices/{k}_{i}.mp3','wb').write(base64.b64decode(p['audio_base_64']))
  g=pv[0]['generated_voice_id']
  r2=requests.post('https://api.elevenlabs.io/v1/text-to-voice',headers=H,json={'voice_name':f'TOKKEN {k}','voice_description':desc,'generated_voice_id':g},timeout=120)
  print(k, r2.status_code, r2.text[:200]); res[k]={'voice_id':r2.json().get('voice_id'),'previews':len(pv),'gids':[p['generated_voice_id'] for p in pv]}
json.dump(res,open('voices/voices.json','w'),indent=1)
