import base64,requests,os,sys
from gen_sheet import KEY
P="""A sprite sheet of 12 separate chibi caricature SPECTATORS for a parody 2D fighting game crowd, in crisp 16-bit arcade pixel art, bold dark outlines. Each is a big-head chibi bust-to-knees figure facing the viewer, excitedly cheering with fists/arms raised, instantly recognizable by signature look. Strict 6 columns x 2 rows grid, one figure centered per equal cell, generous empty space between them, nothing crossing cell edges.
Row 1: (1) Jensen Huang in his black leather jacket, grinning, holding a GPU; (2) Sam Altman in a plain grey crewneck sweater, calm smile; (3) Elon Musk in a black t-shirt, smirking; (4) Mark Zuckerberg in a grey t-shirt with curly short hair; (5) Dario Amodei with curly hair and glasses; (6) Demis Hassabis in a smart shirt with a chess piece.
Row 2: (7) Satya Nadella in a navy quarter-zip; (8) Sundar Pichai in a light sweater; (9) Lisa Su in a red blazer; (10) Andrej Karpathy in a hoodie with laptop; (11) Yann LeCun with glasses and a bowtie; (12) Ilya Sutskever, bald, intense stare.
Fully transparent background, no text, no labels, no floor."""
for model in ['gpt-image-2']:
  r=requests.post('https://api.openai.com/v1/images/generations',headers={'Authorization':'Bearer '+KEY},json={'model':model,'prompt':P,'size':'1536x1024','quality':'high','background':'transparent','n':1},timeout=600)
  print(model,r.status_code,r.text[:300] if r.status_code!=200 else 'ok')
  if r.status_code==200: open('/Users/alexander/tokken/assets/gen/crowd_sheet.png','wb').write(base64.b64decode(r.json()['data'][0]['b64_json'])); break
