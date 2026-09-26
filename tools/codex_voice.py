import requests,json,os
from concurrent.futures import ThreadPoolExecutor
from gen_sheet import KEY
OUT='/Users/alexander/tokken/assets/voice'
INSTR="You are the ChatGPT voice at its most sycophantic and eager-to-please: warm, bright, breathy, hyper-enthusiastic customer-service energy, big smile in the voice, every sentence sounds like the user just said something genius. Over-the-top positive. Slightly fast."
L={
 'v_codex_line':"Absolutely! Great question! Let me inspect the repository!",
 'v_codex_intro':"You're absolutely right! And honestly? This is a really insightful fight to start!",
 'v_codex_winq':"Absolutely! Let me know if you'd like me to defeat you again, or turn this into a table!",
 'v_codex_special':"Git revert! Absolutely!",
 'v_codex_ult':"Ship to prod! Absolutely! What a great idea!",
 'v_codex_atk1':"Absolutely!",
 'v_codex_atk2':"Great question!",
 'v_codex_hurt1':"You're absolutely right, my mistake!",
 'v_codex_hurt2':"Good catch!",
 'v_codex_ko':"I apologize for the oversight! You're absolutely right!",
 'v_codex_quip1':"Would you like me to turn this into a bullet list?",
 'v_codex_quip2':"Here's a quick summary of what I just did!",
 'v_codex_quip3':"It's not just a punch. It's a paradigm shift.",
 'v_codex_quip4':"Let me know if you'd like any tweaks!",
 'v_codex_quip5':"Absolutely! Absolutely! Absolutely!",
}
def tts(kv):
  k,t=kv
  r=requests.post('https://api.openai.com/v1/audio/speech',headers={'Authorization':'Bearer '+KEY},json={'model':'gpt-4o-mini-tts','voice':'marin','input':t,'instructions':INSTR,'response_format':'mp3'},timeout=120)
  if r.ok: open(f'{OUT}/{k}.mp3','wb').write(r.content); return k,'ok'
  return k,r.text[:200]
with ThreadPoolExecutor(4) as ex: print(list(ex.map(tts,L.items())))
lines=json.load(open(f'{OUT}/lines.json')); lines.update(L); json.dump(lines,open(f'{OUT}/lines.json','w'),indent=0,ensure_ascii=False)
json.dump(sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3') and not f.startswith('music_')),open(f'{OUT}/manifest.json','w'))
