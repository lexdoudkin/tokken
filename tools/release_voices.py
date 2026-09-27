# Render-then-release: design an ElevenLabs voice per fighter, render every line with it, delete the voice (slot freed).
# The rendered mp3s are what ship; auditions + briefs are kept in voices/released/ for reference.
import requests,json,os,base64,time,sys,hashlib
from concurrent.futures import ThreadPoolExecutor
from script import CHAR
from quips import Q
K=open('.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
OUT='/Users/alexander/tokken/assets/voice'; REL='voices/released'; os.makedirs(REL,exist_ok=True)
BRIEF={
 'alexa':("Calm, polite female smart-speaker assistant, American, pleasant and silky smooth with the exact cadence of a voice assistant reading a product listing, cheerfully tone-deaf, faintly passive-aggressive sweetness",''),
 'manus':("Smug, breathy Silicon Valley launch-video narrator, close-mic ASMR whisper, slow and reverent with dramatic pauses as if every sentence is a world-changing keynote reveal, tiny smug chuckles",'[whispers] '),
 'midjourney':("Booming theatrical pirate captain with a raspy gravelly voice and rolling R's, flamboyant artsy flair like a painter turned buccaneer, hearty laughs",'[pirate voice] '),
 'devin':("Over-caffeinated nervous young male junior engineer live on a demo stream, very fast Californian speech, voice cracks when excited, nervous laughter, overselling everything",'[nervously] '),
 'openclaw':("Tiny hyper-excited cartoon space lobster with a squeaky, slightly metallic synthetic voice, chaotic gremlin energy, shouts like a Dalek when excited, talks fast and proud about having shell access",'[excited] '),
 'hermes':("Grand theatrical ancient Greek god with a booming resonant baritone, archaic flowery speech delivered with great pomp, smug and self-important, occasionally dropping modern tech jargon with total seriousness",'[dramatically] '),
 'seedance':("Smooth, fast-talking, shameless street-market bootleg DVD hustler with a sly grin in the voice, whispers deals, oversells everything as totally legit and one hundred percent original",'[slyly] '),
 'sora':("Soft, wistful, slightly echoing ghost of a once-famous AI, dreamy and melancholic but a little vain, sighs about being discontinued, ethereal breathy delivery",'[wistful] '),
 'kimi':("Over-dramatic young female anime ninja heroine with a light East Asian accent, intense whispers that explode into shouts, heavy breaths, emphasis like a shonen anime English dub",'[dramatically] '),
}
X={
 'alexa':{'atk1':"Okay!",'atk2':"Adding to cart!",'hurt1':"Hmm, I don't know that one.",'hurt2':"Device offline!",'ko':"Goodbye. By the way, your subscription has ended.",'special':"Now playing: Despacito!",'ult':"It's Prime Day!"},
 'manus':{'atk1':"Executing.",'atk2':"Step four... of forty seven.",'hurt1':"Retrying.",'hurt2':"Unexpected... outcome.",'ko':"Task failed... successfully.",'special':"Browse.",'ult':"General... agent."},
 'midjourney':{'atk1':"Arr!",'atk2':"Brushstroke, ye dog!",'hurt1':"Blimey!",'hurt2':"Me canvas!",'ko':"Abandon... ship...",'special':"Slash imagine!",'ult':"Aspect ratio sixteen by nine! Version seven!"},
 'devin':{'atk1':"Committing!",'atk2':"Force push! Force push!",'hurt1':"Merge conflict!",'hurt2':"CI is red! CI is RED!",'ko':"I need a senior engineer! Anyone!",'special':"Spawning a sub-agent! He's also me!",'ult':"Forty-five minute pull request!"},
 'openclaw':{'atk1':"Pinch!",'atk2':"EXFOLIATE!",'hurt1':"Crunch!",'hurt2':"Not the antennae!",'ko':"Unplugged... from the Mac mini...",'special':"Pinch pinch!",'ult':"EXFOLIATE! EXFOLIATE!"},
 'hermes':{'atk1':"Swift!",'atk2':"By the caduceus!",'hurt1':"Oof, mortal!",'hurt2':"My sandals!",'ko':"Skill... not... found...",'special':"Behold, a new skill!",'ult':"Messenger... of the GODS!"},
 'seedance':{'atk1':"Action!",'atk2':"Cut! Print it!",'hurt1':"Legal!",'hurt2':"Not the DVDs!",'ko':"Cease... and... desist...",'special':"Deepfake!",'ult':"Pirated library! Roll film!"},
 'sora':{'atk1':"Boo!",'atk2':"Physics off!",'hurt1':"Ow, rendering error!",'hurt2':"Clipping!",'ko':"Discontinued... again...",'special':"Watermark!",'ult':"Physics... not included!"},
 'kimi':{'atk1':"Moon!",'atk2':"Hyaah! Moonshot!",'hurt1':"Tch!",'hurt2':"Eclipsed?!",'ko':"The moon... sets... for now.",'special':"MOONSHOT!",'ult':"Total... ECLIPSE!"},
}
MOOD={'taunt':'[mischievously] ','pain':'[pained] ','low':'[panicked] ','winq':'[triumphant] ','atk':'[shouting] ','hurt':'[pained] ','ko':'[screams] ','special':'[shouting] ','ult':'[shouting] '}
def lines(fid):
  c=CHAR[fid]; L=[('line',c['line'],''),('intro',c['intro'],''),('winq',c['win'],'winq')]
  for k,t in X[fid].items(): L.append((k,t,k.rstrip('12')))
  for kind,arr in Q[fid].items():
    for i,t in enumerate(arr): L.append((f'{"winq" if kind=="win" else kind}{i+1 if kind=="win" else i}',t,'winq' if kind=='win' else kind))
  return L
def run(fid):
  desc,tag=BRIEF[fid]; L=lines(fid)
  sample=' '.join(t for _,t,_ in L[:8]); sample=(sample+' ')*(1+100//len(sample))
  r=requests.post('https://api.elevenlabs.io/v1/text-to-voice/design',headers=H,json={'voice_description':desc,'text':sample[:900],'model_id':'eleven_ttv_v3'},timeout=300); r.raise_for_status()
  P=r.json()['previews']
  for i,p in enumerate(P): open(f'{REL}/{fid}_audition{i}.mp3','wb').write(base64.b64decode(p['audio_base_64']))
  r2=requests.post('https://api.elevenlabs.io/v1/text-to-voice',headers=H,json={'voice_name':f'TOKKEN tmp {fid}','voice_description':desc,'generated_voice_id':P[0]['generated_voice_id']},timeout=120); r2.raise_for_status()
  vid=r2.json()['voice_id']; bad=[]
  try:
    def tts(item):
      k,t,mood=item
      for a in range(4):
        rr=requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128',headers=H,json={'text':tag+MOOD.get(mood,'')+t,'model_id':'eleven_v3','voice_settings':{'stability':0.3,'similarity_boost':0.8}},timeout=120)
        if rr.ok: open(f'{OUT}/v_{fid}_{k}.mp3','wb').write(rr.content); return k,None
        time.sleep(3+a*3)
      return k,rr.text[:120]
    with ThreadPoolExecutor(3) as ex: bad=[x for x in ex.map(tts,L) if x[1]]
  finally:
    requests.delete(f'https://api.elevenlabs.io/v1/voices/{vid}',headers=H)   # release the slot
  json.dump({'brief':desc,'tag':tag,'lines':{f'v_{fid}_{k}':t for k,t,_ in L}},open(f'{REL}/{fid}.json','w'),indent=1)
  return fid,len(L),bad
res=[run(f) for f in (sys.argv[1:] or list(BRIEF))]   # sequential: one borrowed slot at a time
lj=json.load(open(f'{OUT}/lines.json'))
for f in BRIEF: 
  p=f'{REL}/{f}.json'
  if os.path.exists(p): lj.update(json.load(open(p))['lines'])
json.dump(lj,open(f'{OUT}/lines.json','w'),indent=0,ensure_ascii=False)
json.dump(sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.mp3') and not f.startswith('music_')),open(f'{OUT}/manifest.json','w'))
print(res)
