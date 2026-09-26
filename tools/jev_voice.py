# Jev speaks no human language: only JSON / booleans, read out by a flat machine voice. (display text, spoken text)
import requests,json,os,time,hashlib
from concurrent.futures import ThreadPoolExecutor
K=open('.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
OUT='/Users/alexander/tokken/assets/voice'; V=json.load(open('voices/char_voices.json'))['jev']
J={
 'v_jev_line':('{"fight": true}',"curly brace. fight: true. curly brace."),
 'v_jev_intro':('{"you": "lose", "confidence": 0.98}',"curly brace. you: lose. confidence: zero point nine eight. curly brace."),
 'v_jev_winq':('{"winner": true, "tokens_generated": 0}',"winner: true. tokens generated: zero."),
 'v_jev_winq1':('true',"true."),
 'v_jev_winq2':('{"gg": false}',"G G: false."),
 'v_jev_special':('true',"TRUE!"),
 'v_jev_ult':('{"latency_ms": 50}',"latency: fifty milliseconds. true!"),
 'v_jev_atk1':('true',"true!"), 'v_jev_atk2':('TRUE',"TRUE!"),
 'v_jev_hurt1':('false',"false."), 'v_jev_hurt2':('NaN',"N, a, N."), 'v_jev_ko':('null',"nuuuull."),
 'v_jev_taunt0':('{"your_chances": false}',"your chances: false."),
 'v_jev_taunt1':('[true, true, true]',"true. true. true."),
 'v_jev_taunt2':('{"thinking": false, "deciding": true}',"thinking: false. deciding: true."),
 'v_jev_pain0':('false',"false!"), 'v_jev_pain1':('undefined',"un. defined."),
 'v_jev_low0':('{"confidence": 0.02, "panic": true}',"confidence: zero point zero two. panic: true. true. TRUE."),
}
texts=json.load(open(f'{OUT}/texts.json'))
def tts(kv):
  k,(disp,say)=kv; t='[robotic] [monotone] '+say; h=hashlib.md5((V+t).encode()).hexdigest(); p=f'{OUT}/{k}.mp3'
  if texts.get(k)==h and os.path.exists(p): return k,'cached'
  for a in range(4):
    r=requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{V}?output_format=mp3_44100_128',headers=H,json={'text':t,'model_id':'eleven_v3','voice_settings':{'stability':0.5,'similarity_boost':0.8,'speed':1.15}},timeout=120)
    if r.ok: open(p,'wb').write(r.content); texts[k]=h; return k,'ok'
    time.sleep(3+a*3)
  return k,'ERR '+r.text[:150]
with ThreadPoolExecutor(3) as ex: res=list(ex.map(tts,J.items()))
json.dump(texts,open(f'{OUT}/texts.json','w'))
lines=json.load(open(f'{OUT}/lines.json')); lines.update({k:d for k,(d,_) in J.items()}); json.dump(lines,open(f'{OUT}/lines.json','w'),indent=0,ensure_ascii=False)
json.dump(sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3') and not f.startswith('music_')),open(f'{OUT}/manifest.json','w'))
print(res)
