"""Recorta as fotos que a Jhulia mandou (referencia/) e gera os .webp do site.

Rodar da raiz do repo: python3 -I ferramentas/preparar-fotos.py
Só existem duas fotos por enquanto. Os produtos sem foto usam as ilustrações
em docs/img/*.svg (fictícias), até ela mandar as de verdade.
"""
from pathlib import Path
from PIL import Image

REF = Path("referencia")
OUT = Path("docs/img")
OUT.mkdir(parents=True, exist_ok=True)

# (saída, arquivo de origem, caixa em pixels x0, y0, x1, y1, tamanho final)
FOTOS = [
    ("tradicional", "dois-paes.jpg", (0, 330, 600, 880), (800, 600)),
    ("parmesao", "dois-paes.jpg", (420, 40, 1080, 700), (800, 600)),
    ("hero", "pao-na-mao.jpg", (0, 330, 738, 1330), (720, 976)),
    ("cesta", "dois-paes.jpg", (0, 40, 1080, 879), (800, 600)),
]


def corta(im, caixa, tam):
    im = im.crop(caixa)
    w, h = im.size
    alvo = tam[0] / tam[1]
    if w / h > alvo:  # largo demais: corta as laterais
        nw = int(h * alvo)
        im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    else:  # alto demais: corta em cima e embaixo
        nh = int(w / alvo)
        im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return im.resize(tam, Image.LANCZOS)


for nome, origem, caixa, tam in FOTOS:
    im = Image.open(REF / origem).convert("RGB")
    corta(im, caixa, tam).save(OUT / f"{nome}.webp", quality=80)

# Capa da prévia do link (WhatsApp): 1200×630 a partir da foto dos dois pães.
im = Image.open(REF / "dois-paes.jpg").convert("RGB")
corta(im, (0, 40, 1080, 879), (1200, 630)).save(OUT / "capa.jpg", quality=82)
print(len(FOTOS) + 1, "imagens em", OUT)
