import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import {
  PRODUTOS, CATEGORIAS, PONTOS, WHATSAPP, TELEFONE, DEMO, SEM_RETIRADA,
  fotoDe, isoDia, totalDe, proximasDatas, dataCurta, diasTexto, mensagemPedido
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
  // o número exibido é o mesmo do link (com o 9 do celular)
  assert.equal(TELEFONE.replace(/\D/g, "").slice(-8), WHATSAPP.slice(-8));
  assert.match(TELEFONE, /^\(48\) 9\d{4}-\d{4}$/);
});

test("feriados estão no formato AAAA-MM-DD", () => {
  for (const d of SEM_RETIRADA) assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
});

test("pontos usam dias da semana válidos", () => {
  for (const p of PONTOS) {
    assert.ok(p.dias.length && p.dias.every(d => d >= 0 && d <= 6));
    assert.ok(p.nome && p.bairro && p.janela);
  }
});

test("datas: só dias de retirada, sem feriado, com prazo até as 20h da véspera", () => {
  const sexta = new Date(2026, 9, 30, 12, 0);           // sexta, 30/10, meio-dia
  const datas = proximasDatas(sexta);
  assert.equal(dataCurta(datas[0].data), "terça, 03/11");   // segunda 02/11 é Finados
  assert.ok(datas.every(({ data }) => data.getDay() >= 1 && data.getDay() <= 5));
  assert.ok(datas.every(({ data }) => !SEM_RETIRADA.includes(isoDia(data))));
  assert.ok(!datas.some(({ data }) => isoDia(data) === "2026-11-20"));

  const primeira = d => dataCurta(proximasDatas(d)[0].data);
  assert.equal(primeira(new Date(2026, 9, 29, 19, 59)), "sexta, 30/10");   // quinta antes das 20h: dá
  assert.equal(primeira(new Date(2026, 9, 29, 20, 0)), "terça, 03/11");    // quinta 20h em diante: não dá
  assert.equal(primeira(new Date(2026, 10, 1, 23, 30)), "terça, 03/11");   // domingo à noite
  // nunca oferece o próprio dia
  const hoje = new Date(2026, 10, 3, 6, 0);
  assert.ok(proximasDatas(hoje).every(({ data }) => data.getDate() !== 3));
});

test("datas atravessam a virada do ano sem erro", () => {
  const datas = proximasDatas(new Date(2026, 11, 28, 9, 0));
  assert.deepEqual(datas.slice(0, 3).map(({ data }) => isoDia(data)), ["2026-12-29", "2026-12-30", "2027-01-04"]);
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
