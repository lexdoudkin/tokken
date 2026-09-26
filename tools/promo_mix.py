# Mux captured frames (tools/xb/promo.mjs) with battle music + the real voice clips at the captured event times.
import json,subprocess,os
ev=dict(json.load(open('events.json'))); V='/Users/alexander/tokken/assets/voice/'
clips=[('round_1',ev['round_1']+0.3),('ult_jev',ev['ult_jev']+0.4),('v_jev_ult',ev['ult_jev']+1.9),('v_jev_taunt1',ev['ult_jev']+4.2),
 ('ult_deepseek',ev['ult_deepseek']+0.4),('v_deepseek_ult',ev['ult_deepseek']+1.9),('f_deepseek_ult',ev['ult_deepseek']+2.8),
 ('ult_midjourney',ev['ult_midjourney']+0.4),('v_midjourney_ult',ev['ult_midjourney']+1.9),
 ('ult_alexa',ev['ult_alexa']+0.4),('v_alexa_ult',ev['ult_alexa']+1.8),('f_alexa_ult',ev['ult_alexa']+2.6),
 ('ult_kimi',ev['ult_kimi']+0.4),('v_kimi_ult',ev['ult_kimi']+1.9),('ko',ev['ko']+0.1),('v_grok_ko',ev['ko']+0.5),('wins_kimi',ev['ko']+2.8),('v_kimi_winq',ev['ko']+3.9)]
clips=[(k,t) for k,t in clips if os.path.exists(V+k+'.mp3')]
inp=['-framerate','30','-i','frames/f%05d.jpg','-i',V+'music_battle.mp3']; flt=['[1:a]volume=0.35,afade=t=out:st=36:d=3[m]']
for i,(k,t) in enumerate(clips): inp+=['-i',V+k+'.mp3']; d=int(t*1000); flt.append(f'[{i+2}:a]adelay={d}|{d},volume=1.6[a{i}]')
flt.append('[m]'+''.join(f'[a{i}]' for i in range(len(clips)))+f'amix=inputs={len(clips)+1}:normalize=0:duration=first,alimiter=limit=0.95[out]')
subprocess.run(['ffmpeg','-y','-loglevel','error',*inp,'-filter_complex',';'.join(flt),'-map','0:v','-map','[out]','-c:v','libx264','-pix_fmt','yuv420p','-crf','18','-preset','slow','-vf','scale=1920:1080:flags=neighbor','-c:a','aac','-b:a','192k','-shortest','-movflags','+faststart','tokken_gameplay.mp4'],check=True)
subprocess.run(['ffmpeg','-y','-loglevel','error','-i','tokken_gameplay.mp4','-c:v','libx264','-crf','24','-preset','slow','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart','tokken_gameplay_x.mp4'],check=True)
print('mixed',len(clips),'clips')
