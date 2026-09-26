# Manus / Devin / Kimi: comedic character voices via OpenAI gpt-4o-mini-tts (steerable acting), like Codex's sycophant.
import requests,json,os
from concurrent.futures import ThreadPoolExecutor
from gen_sheet import KEY
from quips import Q
OUT='/Users/alexander/tokken/assets/voice'; M=json.load(open('fighters_meta.json'))
CAST={
 'manus':('verse',"You are a smug Silicon Valley launch-video narrator doing breathy ASMR hype. Whisper-close to the mic, slow and reverent, with dramatic pauses, as if every sentence is a world-changing keynote reveal. Occasionally a tiny smug chuckle. Treat punching someone like announcing AGI."),
 'devin':('ash',"You are a massively over-caffeinated junior engineer intern live on a demo stream. Talk fast, oversell everything, voice cracks when excited, nervous laughter, suddenly panicking mid-sentence then pretending everything is fine. Very Californian, very eager, clearly out of your depth."),
 'kimi':('nova',"You are a ridiculously over-dramatic anime ninja heroine. Every line is a season-finale climax: intense whispers that explode into shouting, heavy breaths, dramatic emphasis on random words, like a shonen anime dub. Totally serious about something absurd."),
}
X={
 'manus':{'atk1':"Executing.",'atk2':"Step four... of forty seven.",'hurt1':"Retrying.",'hurt2':"Unexpected... outcome.",'ko':"Task failed... successfully.",'special':"Browse!",'ult':"General... agent."},
 'devin':{'atk1':"Committing!",'atk2':"Force push! Force push!",'hurt1':"Merge conflict!",'hurt2':"CI is red! CI is RED!",'ko':"I need a senior engineer! Anyone!",'special':"Spawning a sub-agent! He's also me!",'ult':"Forty-five minute pull request!"},
 'kimi':{'atk1':"Moon!",'atk2':"HYAAH! Moonshot!",'hurt1':"Tch!",'hurt2':"Eclipsed?!",'ko':"The moon... sets... for now.",'special':"MOONSHOT!",'ult':"Total... ECLIPSE!"},
}
C=json.load(open('script.py'.replace('.py','.json'))) if False else None
from script import CHAR
jobs=[]
for fid,(voice,instr) in CAST.items():
  c=CHAR[fid]; L={'line':c['line'],'intro':c['intro'],'winq':c['win'],**X[fid]}
  for k,t in L.items(): jobs.append((f'v_{fid}_{k}',t,voice,instr))
  for kind,arr in Q[fid].items():
    for i,t in enumerate(arr): jobs.append((f'v_{fid}_{"winq" if kind=="win" else kind}{i+1 if kind=="win" else i}',t,voice,instr))
def tts(j):
  k,t,voice,instr=j
  for a in range(3):
    r=requests.post('https://api.openai.com/v1/audio/speech',headers={'Authorization':'Bearer '+KEY},json={'model':'gpt-4o-mini-tts','voice':voice,'input':t,'instructions':instr,'response_format':'mp3'},timeout=120)
    if r.ok: open(f'{OUT}/{k}.mp3','wb').write(r.content); return k,'ok'
  return k,'ERR '+r.text[:120]
with ThreadPoolExecutor(6) as ex: res=list(ex.map(tts,jobs))
lines=json.load(open(f'{OUT}/lines.json')); lines.update({k:t for k,t,_,_ in jobs}); json.dump(lines,open(f'{OUT}/lines.json','w'),indent=0,ensure_ascii=False)
json.dump(sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3') and not f.startswith('music_')),open(f'{OUT}/manifest.json','w'))
print(len(res),'bad',[r for r in res if r[1]!='ok'])
