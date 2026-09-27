# Trailer narration (ElevenLabs): movie-trailer narrator + a Clippy post-credits sting.
import requests,json,os,time
K=open('/Users/alexander/tokken/tools/.secrets/eleven').read().strip(); H={'xi-api-key':K,'Content-Type':'application/json'}
OUT='/Users/alexander/tokken/trailer/public/vo'; os.makedirs(OUT,exist_ok=True)
TRAILER='FF7KdobWPaiR0vkcALHF'   # "David - Movie Trailer Narrator" (library voice already on the account)
CLIPPY=json.load(open('/Users/alexander/tokken/tools/voices/char_voices.json'))['clippy']
L={
 'n01':(TRAILER,"[deep, slow] In a world... where every AI claims to be number one..."),
 'n02':(TRAILER,"[deep, slow] ...where benchmarks are optional... and nobody... runs the tests..."),
 'n03':(TRAILER,"[dramatic pause] ...there can be only one question."),
 'n04':(TRAILER,"[whispers] Who runs out of tokens first."),
 'n05':(TRAILER,"[deep] Twenty-two agents. Zero alignment."),
 'n06':(TRAILER,"[deep] Rollback netcode. Smoother than a funding announcement."),
 'n07':(TRAILER,"[deep] Invite a friend. Lose a friend."),
 'n08':(TRAILER,"[deep] It runs on your phone. It runs in your browser. It does not run the tests."),
 'n09':(TRAILER,"[deep, slow] TOKKEN. Same tokens. Different problems."),
 'n10':(TRAILER,"[deep] Free. Open source. Rated E, for Everyone's API key."),
 'v01':(TRAILER,"[deep] What if AI models... had to fight... for their tokens?"),
 'clippy':(CLIPPY,"[excited] It looks like you're trying to close this trailer! Would you like help with that? No? I'll stay right here!"),
}
def tts(k,v,t):
  for a in range(4):
    r=requests.post(f'https://api.elevenlabs.io/v1/text-to-speech/{v}?output_format=mp3_44100_192',headers=H,json={'text':t,'model_id':'eleven_v3','voice_settings':{'stability':0.5,'similarity_boost':0.85}},timeout=120)
    if r.ok: open(f'{OUT}/{k}.mp3','wb').write(r.content); return 'ok'
    time.sleep(3+a*3)
  return 'ERR '+r.text[:120]
print({k:tts(k,v,t) for k,(v,t) in L.items()})
