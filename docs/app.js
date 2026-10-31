import {
  PRODUTOS, CATEGORIAS, PONTOS, WHATSAPP, NOME,
  brl, fotoDe, totalDe, proximasDatas, dataCurta, diasTexto, mensagemPedido
} from "./dados.js";

const $ = s => document.querySelector(s);
const CHAVE = "paes-carrinho";
const CHAVE_NOME = "paes-nome";

let carrinho = {};
try { carrinho = JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { carrinho = {}; }
for (const id of Object.keys(carrinho)) {
  if (!PRODUTOS.some(p => p.id === id) || !(carrinho[id] > 0)) delete carrinho[id];
}
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(carrinho)); } catch {} };

const zap = texto => `https://wa.me/${WHATSAPP}${texto ? "?text=" + encodeURIComponent(texto) : ""}`;
const itens = n => `${n} ${n === 1 ? "item" : "itens"}`;

/* ---------- cardápio ---------- */
let filtro = "todos";

function desenhaFiltros() {
  const opcoes = [{ id: "todos", nome: "Todos" }, ...CATEGORIAS];
  $("#filtros").innerHTML = opcoes.map(c =>
    `<button class="filtro" type="button" data-cat="${c.id}" aria-pressed="${c.id === filtro}">${c.nome}</button>`).join("");
}

function card(p) {
  const q = carrinho[p.id] || 0;
  return `<article class="card${q ? " tem" : ""}" data-id="${p.id}">
    <div class="foto"><img src="img/${fotoDe(p)}" alt="${p.ilustrativa ? `Ilustração de ${p.nome.toLowerCase()}` : p.nome}" loading="lazy" width="800" height="600">
      ${p.selo ? `<span class="tag">${p.selo}</span>` : ""}
      ${p.ilustrativa ? `<span class="ilustra">imagem ilustrativa</span>` : ""}</div>
    <div class="corpo">
      <h3>${p.nome}</h3>
      <div class="tipo">${p.tipo}</div>
      <details><summary>Ingredientes</summary><p>${p.ing}</p></details>
      <div class="rodape">
        <div class="preco"><b>${brl(p.preco)}</b><small>${p.medida}</small></div>
        <div class="qtd">
          <button type="button" data-d="-1" aria-label="Tirar um ${p.nome}" ${q ? "" : "disabled"}>−</button>
          <output aria-label="Quantidade de ${p.nome}">${q}</output>
          <button type="button" data-d="1" aria-label="Pôr um ${p.nome}">+</button>
        </div>
      </div>
    </div>
  </article>`;
}

function desenhaGrade() {
  const lista = PRODUTOS.filter(p => filtro === "todos" || p.cat === filtro);
  $("#grade").innerHTML = lista.map(card).join("");
}

function atualizaCard(id) {
  const el = document.querySelector(`.card[data-id="${id}"]`);
  if (!el) return;
  const q = carrinho[id] || 0;
  el.classList.toggle("tem", q > 0);
  el.querySelector("output").textContent = q;
  el.querySelector('[data-d="-1"]').disabled = !q;
  el.querySelector('[data-d="1"]').disabled = q >= MAX;
}

$("#filtros").addEventListener("click", e => {
  const b = e.target.closest("[data-cat]");
  if (b) { filtro = b.dataset.cat; desenhaFiltros(); desenhaGrade(); }
});

const MAX = 30;
function muda(id, delta) {
  const q = Math.max(0, Math.min(MAX, (carrinho[id] || 0) + delta));
  if (q) carrinho[id] = q; else delete carrinho[id];
  salvar(); atualizaCard(id); atualizaTotais();
  const p = PRODUTOS.find(x => x.id === id);
  $("#aviso").textContent = q ? `${q}× ${p.nome} no pedido` : `${p.nome} saiu do pedido`;
}

$("#grade").addEventListener("click", e => {
  const b = e.target.closest("[data-d]");
  if (b) muda(b.closest(".card").dataset.id, Number(b.dataset.d));
});

$("#resumo").addEventListener("click", e => {
  const b = e.target.closest("[data-d]");
  if (b) muda(b.closest("[data-id]").dataset.id, Number(b.dataset.d));
});

$("#limpar").addEventListener("click", () => {
  const ids = Object.keys(carrinho);
  carrinho = {};
  salvar(); ids.forEach(atualizaCard); atualizaTotais();
  $("#aviso").textContent = "Pedido limpo";
});

/* ---------- totais, barra e resumo ---------- */
function atualizaTotais() {
  const t = totalDe(carrinho);
  $("#barraValor").textContent = brl(t.valor);
  $("#barraItens").textContent = itens(t.itens);
  $("#barra").classList.toggle("ver", t.itens > 0);
  $("#totalValor").textContent = brl(t.valor);
  const linhas = PRODUTOS.filter(p => carrinho[p.id]).map(p => `<li data-id="${p.id}">
      <span class="item">${p.nome}${p.medida === "unidade" ? "" : ` <small>(${p.medida})</small>`}</span>
      <span class="qtd">
        <button type="button" data-d="-1" aria-label="Tirar um ${p.nome}">−</button>
        <output>${carrinho[p.id]}</output>
        <button type="button" data-d="1" aria-label="Pôr um ${p.nome}" ${carrinho[p.id] >= MAX ? "disabled" : ""}>+</button>
      </span>
      <span class="val">${brl(carrinho[p.id] * p.preco)}</span></li>`);
  $("#limpar").hidden = !linhas.length;
  $("#resumo").innerHTML = linhas.length ? linhas.join("")
    : `<li class="vazio">Nada no pedido ainda. <a href="#cardapio">&nbsp;Escolha no cardápio</a></li>`;
}

// A barra some quando o próprio formulário de pedido está na tela.
new IntersectionObserver(([e]) => {
  $("#barra").style.visibility = e.isIntersecting ? "hidden" : "";
}, { threshold: 0.15 }).observe($("#pedido"));

/* ---------- onde pegar ---------- */
function desenhaPontos() {
  $("#pontos").innerHTML = PONTOS.map(p => `<div class="ponto">
    <div class="nome">De ${diasTexto(p.dias)}</div>
    <h3>${p.nome}</h3>
    <p>${p.bairro}</p>
    <div class="hora">${p.janela[0].toUpperCase() + p.janela.slice(1)}</div>
  </div>`).join("");

  $("#quando").innerHTML = `<option value="">Escolha uma data</option>` +
    proximasDatas().map(({ data, ponto }) => {
      const txt = `${dataCurta(data)} · ${ponto.nome}`;
      return `<option value="${txt}">${txt}</option>`;
    }).join("") + `<option value="Outro dia ou lugar (combinar)">Outro dia ou lugar (combinar)</option>`;
}

/* ---------- pedido ---------- */
$("#form").addEventListener("submit", e => {
  e.preventDefault();
  const erro = $("#erro");
  if (!totalDe(carrinho).itens) { erro.textContent = "Escolha pelo menos um item no cardápio."; return; }
  if (!$("#quando").value) { erro.textContent = "Escolha o dia em que quer pegar."; $("#quando").focus(); return; }
  erro.textContent = "";
  const msg = mensagemPedido({
    carrinho, nome: $("#nome").value.trim(), quando: $("#quando").value, obs: $("#obs").value.trim()
  });
  try { localStorage.setItem(CHAVE_NOME, $("#nome").value.trim()); } catch {}
  window.open(zap(msg), "_blank", "noopener");
});

/* ---------- início ---------- */
$("#zapPonto").href = zap(`Oi, ${NOME}! Dá pra combinar outro lugar pra pegar o pão?`);
$("#zapRodape").href = zap();
$("#zapRodape span").textContent = `(48) ${WHATSAPP.slice(4, 8)}-${WHATSAPP.slice(8)}`;
$("[data-preco-min]").textContent = brl(Math.min(...PRODUTOS.filter(p => p.cat === "paes").map(p => p.preco)));

try { $("#nome").value = localStorage.getItem(CHAVE_NOME) || ""; } catch {}

desenhaFiltros(); desenhaGrade(); desenhaPontos(); atualizaTotais();
