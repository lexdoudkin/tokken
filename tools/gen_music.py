import requests,json,sys
K=open('.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
T={'battle':("Instrumental 1990s arcade versus-fighting video game stage battle theme, driving 140 bpm, synthwave and hard rock hybrid: punchy drums, slap bass, screaming analog synth lead and electric guitar riffs, heroic minor-key melody, relentless energy, loopable",90000),
   'title':("Instrumental epic 1990s arcade fighting game title screen and character select theme, triumphant synth brass fanfare, heavy drums, retro FM synth, dramatic build, loopable",60000)}
for k,(p,ms) in T.items():
  if k!='battle': continue
  r=requests.post('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128',headers=H,json={'prompt':p,'music_length_ms':ms,'force_instrumental':True},timeout=600)
  print(k,r.status_code,len(r.content), r.text[:200] if r.status_code!=200 else '')
  if r.status_code==200: open(f'/Users/alexander/tokken/assets/voice/music_{k}.mp3','wb').write(r.content)
