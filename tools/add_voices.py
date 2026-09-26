# Design ElevenLabs voices for fighters missing from voices/char_voices.json
import requests,json,sys
from concurrent.futures import ThreadPoolExecutor
K=open('.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
F=json.load(open('fighters_meta.json')); CV=json.load(open('voices/char_voices.json'))
D={
 'jev':"Ultra-fast, clipped, precise synthetic male voice, stoic and emotionless like a hyper-efficient decision engine reading out probabilities, crisp consonants, tiny robotic edge, zero hesitation",
 'alexa':"Calm, pleasant, polished female smart-speaker assistant voice, American, even-toned and helpful, slightly too cheerful when saying something completely wrong",
 'manus':"Smooth, calm, confident young male startup-founder voice with a light international accent, soft-spoken and mysterious like a product launch video narrator",
 'midjourney':"Gruff, theatrical pirate captain with a hearty booming voice, rolling R's, flamboyant and artsy like a painter who became a sea captain",
 'devin':"Earnest, eager, slightly nervous young male intern software engineer, fast and overconfident, nerdy Californian voice that cracks a little when excited",
 'kimi':"Cool, focused young female ninja voice, crisp and confident with quiet intensity, light East Asian accent, sharp and calm like a martial arts master",
}
def design(fid):
  if fid in CV: return fid,CV[fid]
  f=F[fid]; txt=f"{f['intro']} {f['line']} {f['say_special']}! {f['say_ult']}! {f['win']}"
  txt=(txt+' ')*(1+100//len(txt))
  r=requests.post('https://api.elevenlabs.io/v1/text-to-voice/design',headers=H,json={'voice_description':D[fid],'text':txt[:900],'model_id':'eleven_ttv_v3'},timeout=300)
  if r.status_code!=200: return fid,'ERR '+r.text[:200]
  g=r.json()['previews'][0]['generated_voice_id']
  r2=requests.post('https://api.elevenlabs.io/v1/text-to-voice',headers=H,json={'voice_name':f'TOKKEN {fid}','voice_description':D[fid],'generated_voice_id':g},timeout=120)
  return fid,r2.json().get('voice_id') or 'ERR '+r2.text[:200]
with ThreadPoolExecutor(3) as ex: res=dict(ex.map(design,sys.argv[1:] or D))
print(res); CV.update({k:v for k,v in res.items() if not v.startswith('ERR')}); json.dump(CV,open('voices/char_voices.json','w'),indent=1)
