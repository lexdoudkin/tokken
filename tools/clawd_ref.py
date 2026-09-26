from PIL import Image
# Official Claude Code welcome-screen Clawd, from the terminal quadrant-block art
lines=[' ▐▛███▜▌',
       '▝▜█████▛▘',
       '  ▘▘ ▝▝']
Q={' ':'', '█':'TL TR BL BR','▐':'TR BR','▌':'TL BL','▛':'TL TR BL','▜':'TL TR BR','▝':'TR','▘':'TL','▙':'TL BL BR','▟':'TR BL BR'}
W=max(len(l) for l in lines)*2;H=len(lines)*2
im=Image.new('RGBA',(W,H),(0,0,0,0))
for r,l in enumerate(lines):
  for c,ch in enumerate(l):
    for q in Q[ch].split():
      x=c*2+(1 if q[1]=='R' else 0); y=r*2+(1 if q[0]=='B' else 0)
      im.putpixel((x,y),(215,119,87,255))
s=48
im.resize((W*s,H*s),Image.NEAREST).save('/Users/alexander/tokken/assets/refs/claude.png')
print(W,H)
