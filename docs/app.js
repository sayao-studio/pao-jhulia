import {
  PRODUTOS, CATEGORIAS, PONTOS, WHATSAPP, TELEFONE, NOME, NOMES_DIA, PRAZO_HORA,
  brl, fotoDe, totalDe, proximasDatas, dataCurta, diasTexto, mensagemPedido
} from "./dados.js";

const $ = s => document.querySelector(s);
const CHAVE = "paes-carrinho";
const CHAVE_NOME = "paes-nome";
const MAX = 30;

let carrinho = {};
try { carrinho = JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { carrinho = {}; }
if (typeof carrinho !== "object" || Array.isArray(carrinho)) carrinho = {};
for (const id of Object.keys(carrinho)) {
  const q = carrinho[id];
  const ok = PRODUTOS.some(p => p.id === id) && typeof q === "number" && Number.isInteger(q) && q >= 1 && q <= MAX;
  if (!ok) delete carrinho[id];
}
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(carrinho)); } catch {} };

const zap = texto => `https://wa.me/${WHATSAPP}${texto ? "?text=" + encodeURIComponent(texto) : ""}`;
const itens = n => `${n} ${n === 1 ? "item" : "itens"}`;
const reais = v => brl(v).replace(",00", "");   // "R$ 20" nos destaques

/* ---------- cardápio ---------- */
let filtro = "todos";

function desenhaFiltros() {
  const opcoes = [{ id: "todos", nome: "Todos" }, ...CATEGORIAS];
  $("#filtros").innerHTML = opcoes.map(c =>
    `<button class="filtro" type="button" data-cat="${c.id}" aria-pressed="${c.id === filtro}">${c.nome}</button>`).join("");
}
const marcaFiltros = () => document.querySelectorAll("#filtros [data-cat]")
  .forEach(b => b.setAttribute("aria-pressed", String(b.dataset.cat === filtro)));

// O botão "Adicionar" vira o contador (− n +) quando o item entra no pedido.
function acao(p) {
  const q = carrinho[p.id] || 0;
  if (!q) return `<button class="add" type="button" data-d="1" aria-label="Adicionar ${p.nome}">Adicionar</button>`;
  return `<div class="qtd">
      <button type="button" data-d="-1" aria-label="Tirar um ${p.nome}">−</button>
      <output aria-label="Quantidade de ${p.nome}">${q}</output>
      <button type="button" data-d="1" aria-label="Pôr mais um ${p.nome}" ${q >= MAX ? "disabled" : ""}>+</button>
    </div>`;
}

function card(p) {
  const q = carrinho[p.id] || 0;
  const alt = p.ilustrativa ? `Ilustração de ${p.nome.toLowerCase()}` : p.nome;
  return `<article class="card${q ? " tem" : ""}" data-id="${p.id}">
    <div class="foto"><img src="img/${fotoDe(p)}" alt="${alt}" loading="lazy" width="800" height="600">
      ${p.selo ? `<span class="etq">${p.selo}</span>` : ""}
      ${p.ilustrativa ? `<span class="ilustra">imagem ilustrativa</span>` : ""}</div>
    <div class="corpo">
      <div class="linha"><h3>${p.nome}</h3><span class="preco">${brl(p.preco)}</span></div>
      <p class="tipo">${p.tipo}${p.medida === "unidade" ? "" : ` <span>· ${p.medida}</span>`}</p>
      <div class="acao">${acao(p)}</div>
    </div>
  </article>`;
}

function desenhaGrade() {
  const lista = PRODUTOS.filter(p => filtro === "todos" || p.cat === filtro);
  $("#grade").innerHTML = lista.map(card).join("");
}

// Redesenha só a ação do card e devolve o foco a um botão equivalente,
// pra quem usa teclado não perder o lugar.
function atualizaCard(id, delta) {
  const el = document.querySelector(`.card[data-id="${id}"]`);
  if (!el) return;
  const p = PRODUTOS.find(x => x.id === id);
  const q = carrinho[id] || 0;
  const tinhaFoco = el.contains(document.activeElement);
  el.classList.toggle("tem", q > 0);
  el.querySelector(".acao").innerHTML = acao(p);
  if (tinhaFoco) {
    const alvo = el.querySelector(`[data-d="${delta}"]:not(:disabled)`) || el.querySelector(".acao button:not(:disabled)");
    alvo?.focus();
  }
}

function filtrar(cat) {
  filtro = cat;
  marcaFiltros(); desenhaGrade();
}

$("#filtros").addEventListener("click", e => {
  const b = e.target.closest("[data-cat]");
  if (b) filtrar(b.dataset.cat);
});

function muda(id, delta) {
  const p = PRODUTOS.find(x => x.id === id);
  if (!p) return;
  const q = Math.max(0, Math.min(MAX, (carrinho[id] || 0) + delta));
  if (q) carrinho[id] = q; else delete carrinho[id];
  salvar(); atualizaCard(id, delta); atualizaTotais();
  $("#aviso").textContent = q ? `${q}× ${p.nome} no pedido` : `${p.nome} saiu do pedido`;
}

$("#grade").addEventListener("click", e => {
  const b = e.target.closest("[data-d]");
  if (b) muda(b.closest(".card").dataset.id, Number(b.dataset.d));
});

$("#resumo").addEventListener("click", e => {
  const b = e.target.closest("[data-d]");
  if (!b) return;
  const id = b.closest("[data-id]").dataset.id, d = b.dataset.d;
  const ordem = [...document.querySelectorAll("#resumo [data-id]")].map(li => li.dataset.id);
  muda(id, Number(d));
  const linha = document.querySelector(`#resumo [data-id="${id}"]`);
  const alvo = linha?.querySelector(`[data-d="${d}"]:not(:disabled)`) || linha?.querySelector("button:not(:disabled)")
    || document.querySelector(`#resumo [data-id="${ordem[ordem.indexOf(id) + 1] || ordem[ordem.indexOf(id) - 1]}"] button`)
    || $("#resumo .vazio a");
  alvo?.focus();
});

// Botão "Adicionar" do destaque no topo.
document.addEventListener("click", e => {
  const b = e.target.closest("[data-add]");
  if (!b) return;
  const cheio = (carrinho[b.dataset.add] || 0) >= MAX;
  if (!cheio) muda(b.dataset.add, 1);
  b.textContent = cheio ? "Limite do pedido" : "Adicionado ✓";
  clearTimeout(b._t);
  b._t = setTimeout(() => { b.textContent = "Adicionar"; }, 1600);
});

let desfazer = null;
$("#limpar").addEventListener("click", () => {
  const ids = Object.keys(carrinho);
  desfazer = { ...carrinho };
  carrinho = {};
  salvar(); ids.forEach(id => atualizaCard(id, 0)); atualizaTotais();
  $("#aviso").textContent = "Pedido limpo. Dá pra desfazer.";
  $("#desfazer")?.focus();
});
$("#resumo").addEventListener("click", e => {
  if (!e.target.closest("#desfazer") || !desfazer) return;
  carrinho = desfazer; desfazer = null;
  salvar(); Object.keys(carrinho).forEach(id => atualizaCard(id, 0)); atualizaTotais();
  $("#aviso").textContent = "Pedido de volta";
  $("#resumo button")?.focus();
});

/* ---------- totais, barra e resumo ---------- */
function atualizaTotais() {
  const t = totalDe(carrinho);
  $("#barraValor").textContent = brl(t.valor);
  $("#barraItens").textContent = itens(t.itens);
  $("#barra").classList.toggle("ver", t.itens > 0);
  $("#contador").textContent = t.itens || "";
  $("#contador").classList.toggle("ver", t.itens > 0);
  $("#totalValor").textContent = brl(t.valor);
  const linhas = PRODUTOS.filter(p => carrinho[p.id]).map(p => `<li data-id="${p.id}">
      <span class="item">${p.nome}${p.medida === "unidade" ? "" : ` <small>${p.medida}</small>`}</span>
      <span class="qtd">
        <button type="button" data-d="-1" aria-label="Tirar um ${p.nome}">−</button>
        <output aria-label="Quantidade de ${p.nome}">${carrinho[p.id]}</output>
        <button type="button" data-d="1" aria-label="Pôr mais um ${p.nome}" ${carrinho[p.id] >= MAX ? "disabled" : ""}>+</button>
      </span>
      <span class="val">${brl(carrinho[p.id] * p.preco)}</span></li>`);
  if (linhas.length) desfazer = null;
  $("#limpar").hidden = !linhas.length;
  $("#resumo").innerHTML = linhas.length ? linhas.join("")
    : desfazer ? `<li class="vazio">Pedido limpo.<button type="button" class="desfazer" id="desfazer">Desfazer</button></li>`
    : `<li class="vazio">Seu pedido está vazio.<a href="#cardapio">Escolher no cardápio</a></li>`;
  document.body.classList.toggle("com-barra", t.itens > 0);
}

// A barra some quando o próprio formulário de pedido está na tela.
new IntersectionObserver(([e]) => {
  $("#barra").style.visibility = e.isIntersecting ? "hidden" : "";
}, { threshold: 0.15 }).observe($("#pedido"));

// Linha embaixo do topo só depois de rolar.
const marcaRolagem = () => $("#topo").classList.toggle("rolou", scrollY > 8);
addEventListener("scroll", marcaRolagem, { passive: true });
marcaRolagem();

/* ---------- onde pegar ---------- */
function desenhaPontos() {
  const semana = [1, 2, 3, 4, 5, 6, 0];
  $("#pontos").innerHTML = PONTOS.map(p => `<div class="ponto">
    <p class="olho">Onde pegar<span class="exemplo">exemplo</span></p>
    <h3>${p.nome}</h3>
    <p>${p.bairro}</p>
    <div class="dias" role="img" aria-label="Retirada de ${diasTexto(p.dias)}">${semana.map(d =>
      `<span class="${p.dias.includes(d) ? "on" : ""}">${NOMES_DIA[d].slice(0, 3)}</span>`).join("")}</div>
    <div class="hora">${p.janela[0].toUpperCase() + p.janela.slice(1)} · horário combinado no WhatsApp</div>
  </div>`).join("");

  desenhaDatas();
}

const OUTRO = "Outro dia ou lugar (combinar)";
// Refaz a lista mantendo a escolha, se ela ainda vale. Devolve false se a escolha caiu.
function desenhaDatas() {
  const antes = $("#quando").value;
  const datas = proximasDatas().map(({ data, ponto }) => `${dataCurta(data)} · ${ponto.nome}`);
  $("#quando").innerHTML = `<option value="">Escolha uma data</option>` +
    datas.map(t => `<option value="${t}">${t}</option>`).join("") + `<option value="${OUTRO}">${OUTRO}</option>`;
  const vale = !antes || antes === OUTRO || datas.includes(antes);
  if (vale) $("#quando").value = antes;
  return vale;
}
addEventListener("pageshow", e => { if (e.persisted) desenhaDatas(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden) desenhaDatas(); });

/* ---------- pedido ---------- */
function mostraErro(txt, foco) {
  const erro = $("#erro");
  erro.textContent = "";
  requestAnimationFrame(() => { erro.textContent = txt; });   // limpa antes pra ser lido de novo
  foco?.focus();
}

$("#form").addEventListener("submit", e => {
  e.preventDefault();
  if (!totalDe(carrinho).itens) return mostraErro("Escolha pelo menos um item no cardápio.", $("#grade .add, #grade button"));
  if (!desenhaDatas()) return mostraErro("Essa data não está mais disponível. Escolha outra.", $("#quando"));
  if (!$("#quando").value) return mostraErro("Escolha o dia em que quer pegar.", $("#quando"));
  $("#erro").textContent = "";
  const msg = mensagemPedido({
    carrinho, nome: $("#nome").value.trim(), quando: $("#quando").value, obs: $("#obs").value.trim()
  });
  try { localStorage.setItem(CHAVE_NOME, $("#nome").value.trim()); } catch {}
  const url = zap(msg);
  const aba = window.open(url, "_blank");
  if (aba) aba.opener = null;
  else location.href = url;     // navegador do Instagram/Facebook às vezes bloqueia aba nova
});
$("#quando").addEventListener("change", () => { if ($("#quando").value) $("#erro").textContent = ""; });

/* ---------- início ---------- */
$("#zapPonto").href = zap(`Oi, ${NOME}! Dá pra combinar outro lugar pra pegar o pão?`);
$("#zapRodape").href = zap();
$("#zapRodape span").textContent = TELEFONE;
$("#prazo").textContent = `Pedidos até as ${PRAZO_HORA}h do dia anterior à retirada.`;
$("[data-preco-min]").textContent = reais(Math.min(...PRODUTOS.filter(p => p.cat === "paes").map(p => p.preco)));

try { $("#nome").value = localStorage.getItem(CHAVE_NOME) || ""; } catch {}

desenhaFiltros(); desenhaGrade(); desenhaPontos(); atualizaTotais();
