import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  PRODUTOS, CATEGORIAS, PONTOS, WHATSAPP, DEMO,
  fotoDe, totalDe, proximasDatas, dataCurta, diasTexto, mensagemPedido
} from "../../docs/dados.js";

const img = arq => new URL(`../../docs/img/${arq}`, import.meta.url);

test("cada produto tem id único, categoria válida, preço e foto", () => {
  const ids = new Set();
  const cats = new Set(CATEGORIAS.map(c => c.id));
  for (const p of PRODUTOS) {
    assert.ok(!ids.has(p.id), `id repetido: ${p.id}`);
    ids.add(p.id);
    assert.ok(cats.has(p.cat), `${p.id}: categoria ${p.cat} não existe`);
    assert.ok(p.preco > 0 && p.medida, `${p.id}: preço/medida inválido`);
    assert.ok(p.nome && p.tipo && p.ing, `${p.id}: falta nome, tipo ou ingredientes`);
    assert.ok(existsSync(img(fotoDe(p))), `${p.id}: falta docs/img/${fotoDe(p)}`);
  }
});

test("preços passados pela Jhulia em 30/10/2026", () => {
  const preco = Object.fromEntries(PRODUTOS.map(p => [p.id, p.preco]));
  assert.deepEqual(preco, { tradicional: 20, azeitona: 25, calabresa: 25, parmesao: 25, pesto: 18, geleia: 15 });
});

test("WhatsApp é só dígitos, com DDI 55 e DDD 48", () => {
  assert.match(WHATSAPP, /^5548\d{8,9}$/);
});

test("pontos usam dias da semana válidos", () => {
  for (const p of PONTOS) {
    assert.ok(p.dias.length && p.dias.every(d => d >= 0 && d <= 6));
    assert.ok(p.nome && p.bairro && p.janela);
  }
});

test("datas: só dias de retirada e com 1 dia de antecedência", () => {
  const sexta = new Date(2026, 9, 30, 12, 0);           // sexta, 30/10, meio-dia
  const datas = proximasDatas(sexta);
  assert.equal(dataCurta(datas[0].data), "segunda, 02/11");
  assert.ok(datas.every(({ data }) => data.getDay() >= 1 && data.getDay() <= 5));
  const quinta = new Date(2026, 9, 29, 10, 0);
  assert.equal(dataCurta(proximasDatas(quinta)[0].data), "sexta, 30/10");
});

test("diasTexto junta dias seguidos", () => {
  assert.equal(diasTexto([1, 2, 3, 4, 5]), "segunda a sexta");
  assert.equal(diasTexto([2, 4]), "ter, qui");
});

test("total e mensagem do pedido", () => {
  const carrinho = { tradicional: 2, pesto: 1 };
  assert.deepEqual(totalDe(carrinho), { itens: 3, valor: 58 });
  const msg = mensagemPedido({ carrinho, nome: "Ana", quando: "segunda, 02/11 · Escola Praia do Riso", obs: "" });
  if (DEMO) assert.match(msg, /^\*\[TESTE/);
  assert.match(msg, /Oi, Jhulia!/);
  assert.match(msg, /• 2× Pão tradicional · R\$\s40,00/);
  assert.match(msg, /• 1× Molho pesto \(pote 145 ml\) · R\$\s18,00/);
  assert.match(msg, /\*Total: R\$\s58,00\* \(3 itens\)/);
  assert.match(msg, /Retirada: segunda, 02\/11/);
  assert.doesNotMatch(msg, /Obs\./);
});
