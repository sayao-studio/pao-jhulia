# Pães da Jhulia

Site de encomendas dos pães caseiros da Jhulia, com retirada na Escola Praia do Riso
(Abraão, Florianópolis). Mesma base do site da Bolachas Cristiane.

> ⚠️ **Demonstração.** Os preços vieram da Jhulia em 30/10/2026. Dias e horário de
> retirada, ingredientes e as imagens marcadas como "ilustrativa" (azeitona, calabresa,
> pesto, geleia) são **exemplos** até ela confirmar e mandar fotos.

## Arquivos

| Caminho | O que é |
|---|---|
| `docs/` | O site (HTML/CSS/JS puro, sem build), servido pelo GitHub Pages |
| `docs/dados.js` | Produtos, preços, ponto de retirada, prazo, feriados (`SEM_RETIRADA`) e WhatsApp: é só aqui que se mexe |
| `docs/app.js` | Cardápio, carrinho e mensagem do pedido pro WhatsApp |
| `docs/img/` | Fotos recortadas (`.webp`) e ilustrações provisórias (`.svg`) |
| `ferramentas/preparar-fotos.py` | Gera os `.webp` e a `capa.jpg` a partir de `referencia/` (fora do git) |

## Rodar localmente

```bash
npm run serve        # http://127.0.0.1:8790
npm test             # testes de dados.js
npm run test:ui      # navegador: Chromium (desktop e celular) e Firefox, 4 workers
```

Pra trocar uma ilustração por foto de verdade: ponha a foto em `referencia/`, inclua o
recorte em `ferramentas/preparar-fotos.py` e tire `foto` e `ilustrativa` do produto em `docs/dados.js`.

## Direitos

© 2026 Sayão Studio. Todos os direitos reservados (ver `LICENSE`). Para tirar a marca d'água, apague o `<div class="marca-dagua">` do `index.html`.
