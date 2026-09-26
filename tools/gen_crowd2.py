import base64,requests
from gen_sheet import KEY
PEOPLE=["Jensen Huang in his black leather jacket","Sam Altman in a plain grey crewneck sweater","Elon Musk in a black t-shirt","Mark Zuckerberg in a grey t-shirt with short curly hair","Dario Amodei with curly hair and glasses","Demis Hassabis in a smart dark sweater"],["Satya Nadella in a navy quarter-zip","Sundar Pichai in a light sweater","Lisa Su in a red blazer","Andrej Karpathy in a black hoodie","Yann LeCun with glasses and a bowtie","Ilya Sutskever, bald, in a dark hoodie"]
def gen(i,people):
  P=f"""A sprite sheet of 6 chibi caricature SPECTATORS for a parody 2D fighting game crowd, crisp 16-bit arcade pixel art (1990s arcade quality), bold dark outlines, FULL BODY head to shoes, big heads.
Every figure is seen in THREE-QUARTER SIDE PROFILE facing RIGHT, watching a fight happening to the right (head and eyes turned right, face partially visible in profile).
Strict 6 columns x 2 rows grid. Each COLUMN is the same person: row 1 = watching intently (arms crossed or hands on hips), row 2 = same person cheering with arms raised and mouth open. Same size, same position, feet on the same baseline in every cell, generous empty space, nothing crossing cell edges.
Columns left to right: {'; '.join(f'({k+1}) {p}' for k,p in enumerate(people))}.
Fully transparent background, no text, no signs, no floor, no shadows."""
  r=requests.post('https://api.openai.com/v1/images/generations',headers={'Authorization':'Bearer '+KEY},json={'model':'gpt-image-2','prompt':P,'size':'1536x1024','quality':'high','background':'transparent','n':1},timeout=600)
  print(i,r.status_code,r.text[:200] if not r.ok else 'ok')
  if r.ok: open(f'/Users/alexander/tokken/assets/gen/crowd2_{i}.png','wb').write(base64.b64decode(r.json()['data'][0]['b64_json']))
from concurrent.futures import ThreadPoolExecutor
with ThreadPoolExecutor(2) as ex: list(ex.map(lambda a: gen(*a), enumerate(PEOPLE)))
