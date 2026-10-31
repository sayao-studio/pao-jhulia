import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { PRODUTOS, CATEGORIAS, PONTOS, WHATSAPP } from "../../docs/dados.js";

// Relógio fixo: sexta, 30/10/2026 10h. Assim a lista de datas é previsível.
const AGORA = new Date("2026-10-30T10:00:00-03:00");

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(AGORA);
  // Captura o window.open do botão de WhatsApp em vez de abrir aba.
  await page.addInitScript(() => {
    window.__aberto = [];
    window.open = (url) => { window.__aberto.push(String(url)); return {}; };
  });
});

const erros = page => {
  const lista = [];
  page.on("pageerror", e => lista.push(e.message));
  page.on("console", m => { if (m.type() === "error") lista.push(m.text()); });
  return lista;
};

const card = (page, id) => page.locator(`.card[data-id="${id}"]`);
const adicionar = (page, id) => card(page, id).getByRole("button", { name: /^Adicionar/ });
const mais = (page, id) => card(page, id).getByRole("button", { name: /^Pôr mais um/ });
const menos = (page, id) => card(page, id).getByRole("button", { name: /^Tirar um/ });
const qtd = (page, id) => card(page, id).locator("output");
const p = id => PRODUTOS.find(x => x.id === id);
const enviar = page => page.getByRole("button", { name: "Enviar pelo WhatsApp" });

test("carrega sem erro no console e mostra o aviso de demonstração", async ({ page }) => {
  const e = erros(page);
  await page.goto("./");
  await expect(page.locator(".demo")).toContainText("demonstração");
  await expect(page.locator(".card")).toHaveCount(PRODUTOS.length);
  await expect(page.locator("[data-preco-min]")).toHaveText("R$ 20");
  expect(e).toEqual([]);
});

test("todas as imagens carregam", async ({ page }) => {
  await page.goto("./");
  for (let y = 0; y < 20; y++) await page.mouse.wheel(0, 1200);
  await page.waitForLoadState("networkidle");
  const quebradas = await page.$$eval("img", imgs =>
    imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute("src")));
  expect(quebradas).toEqual([]);
});

test("ilustrações fictícias vêm marcadas como ilustrativas", async ({ page }) => {
  await page.goto("./");
  for (const x of PRODUTOS) {
    const marca = card(page, x.id).locator(".ilustra");
    await expect(marca).toHaveCount(x.ilustrativa ? 1 : 0);
  }
});

test("filtros mostram só a categoria escolhida e mantêm o pedido", async ({ page }) => {
  await page.goto("./");
  await adicionar(page, "pesto").click();
  for (const c of CATEGORIAS) {
    await page.getByRole("button", { name: c.nome, exact: true }).click();
    await expect(page.getByRole("button", { name: c.nome, exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".card")).toHaveCount(PRODUTOS.filter(x => x.cat === c.id).length);
  }
  await page.getByRole("button", { name: "Todos", exact: true }).click();
  await expect(page.locator(".card")).toHaveCount(PRODUTOS.length);
  await expect(qtd(page, "pesto")).toHaveText("1");
  await expect(page.locator("#barraItens")).toHaveText("1 item");
});

test("Adicionar vira contador, e tirar o último volta pro Adicionar", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#barra")).not.toHaveClass(/ver/);
  await expect(page.locator("#contador")).toBeHidden();

  await adicionar(page, "tradicional").click();
  await expect(adicionar(page, "tradicional")).toHaveCount(0);
  await mais(page, "tradicional").click();
  await adicionar(page, "geleia").click();
  await expect(qtd(page, "tradicional")).toHaveText("2");
  await expect(card(page, "tradicional")).toHaveClass(/tem/);
  await expect(page.locator("#barra")).toHaveClass(/ver/);
  await expect(page.locator("#barraItens")).toHaveText("3 itens");
  await expect(page.locator("#contador")).toHaveText("3");
  await expect(page.locator("#barraValor")).toContainText("55,00");
  await expect(page.locator("#totalValor")).toContainText("55,00");
  await expect(page.locator("#resumo li")).toHaveCount(2);
  await expect(page.locator("#aviso")).toContainText("Geleia de frutas");

  await menos(page, "geleia").click();
  await expect(adicionar(page, "geleia")).toBeVisible();
  await expect(card(page, "geleia")).not.toHaveClass(/tem/);
  await expect(page.locator("#barraItens")).toHaveText("2 itens");
  await expect(page.locator("#resumo li")).toHaveCount(1);
});

test("botão do destaque no topo põe o pão de parmesão no pedido", async ({ page }) => {
  await page.goto("./");
  const b = page.locator("[data-add]");
  await b.click();
  await expect(b).toHaveText(/Adicionado/);
  await expect(qtd(page, "parmesao")).toHaveText("1");
  await b.click();
  await expect(qtd(page, "parmesao")).toHaveText("2");
  await expect(b).toHaveText("Adicionar", { timeout: 4000 });
});

test("quantidade não passa de 30", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("paes-carrinho", JSON.stringify({ tradicional: 29 })));
  await page.goto("./");
  await mais(page, "tradicional").click();
  await expect(qtd(page, "tradicional")).toHaveText("30");
  await expect(mais(page, "tradicional")).toBeDisabled();
});

test("dá pra mexer na quantidade e limpar direto no resumo", async ({ page }) => {
  await page.goto("./");
  await adicionar(page, "tradicional").click();
  await adicionar(page, "pesto").click();
  const linha = page.locator('#resumo li[data-id="tradicional"]');
  await linha.getByRole("button", { name: /^Pôr mais um/ }).click();
  await expect(linha.locator("output")).toHaveText("2");
  await expect(qtd(page, "tradicional")).toHaveText("2");
  await expect(page.locator('#resumo li[data-id="pesto"]')).toContainText("pote 145 ml");

  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  await expect(page.locator("#resumo .vazio")).toBeVisible();
  await expect(adicionar(page, "tradicional")).toBeVisible();
  await expect(page.getByRole("button", { name: "Limpar", exact: true })).toBeHidden();
  await expect(page.locator("#contador")).toBeHidden();
});

test("pedido continua lá depois de recarregar a página", async ({ page }) => {
  await page.goto("./");
  await adicionar(page, "calabresa").click();
  await page.reload();
  await expect(qtd(page, "calabresa")).toHaveText("1");
  await expect(page.locator("#barraItens")).toHaveText("1 item");
});

test("carrinho salvo estragado não quebra o site", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("paes-carrinho",
    JSON.stringify({ "nao-existe": 3, tradicional: 1, pesto: "abc", geleia: -2, azeitona: 2.5, parmesao: 999, calabresa: true })));
  const e = erros(page);
  await page.goto("./");
  await expect(page.locator("#barraItens")).toHaveText("1 item");   // só o tradicional vale
  await expect(adicionar(page, "pesto")).toBeVisible();
  await expect(adicionar(page, "parmesao")).toBeVisible();
  await expect(adicionar(page, "azeitona")).toBeVisible();
  expect(e).toEqual([]);
});

test("carrinho salvo que não é objeto é ignorado", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("paes-carrinho", "[1,2,3]"));
  const e = erros(page);
  await page.goto("./");
  await expect(page.locator("#resumo .vazio")).toBeVisible();
  expect(e).toEqual([]);
});

test("datas do pedido: só dias de retirada, com 1 dia de antecedência", async ({ page }) => {
  await page.goto("./");
  const opcoes = await page.locator("#quando option").allTextContents();
  expect(opcoes[0]).toBe("Escolha uma data");
  expect(opcoes[1]).toContain("terça, 03/11");      // fim de semana não tem, segunda 02/11 é Finados
  expect(opcoes.at(-1)).toContain("combinar");
  const nomes = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const permitidos = PONTOS.flatMap(x => x.dias.map(d => nomes[d]));
  for (const o of opcoes.slice(1, -1)) expect(permitidos).toContain(o.split(",")[0]);
});

test("ponto de retirada aparece marcado como exemplo, com os dias", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#onde .exemplo")).toBeVisible();
  await expect(page.locator(".ponto")).toHaveCount(PONTOS.length);
  await expect(page.locator(".ponto")).toContainText("Escola Praia do Riso");
  await expect(page.locator(".dias")).toHaveAttribute("aria-label", "Retirada de segunda a sexta");
  await expect(page.locator(".dias span.on")).toHaveCount(5);
});

test("enviar sem item ou sem data mostra o erro e não abre o WhatsApp", async ({ page }) => {
  await page.goto("./");
  await enviar(page).click();
  await expect(page.locator("#erro")).toContainText("pelo menos um item");
  await adicionar(page, "tradicional").click();
  await enviar(page).click();
  await expect(page.locator("#erro")).toContainText("dia");
  await expect(page.locator("#quando")).toBeFocused();
  await page.locator("#quando").selectOption({ index: 1 });
  await expect(page.locator("#erro")).toHaveText("");
  expect(await page.evaluate(() => window.__aberto.length)).toBe(0);
});

test("enviar abre o WhatsApp dela com a mensagem completa e lembra o nome", async ({ page }) => {
  await page.goto("./");
  await adicionar(page, "parmesao").click();
  await mais(page, "parmesao").click();
  await adicionar(page, "pesto").click();
  await page.getByLabel("Seu nome").fill("Ana & Cia");
  await page.getByLabel("Dia da retirada").selectOption({ index: 1 });
  await page.getByLabel(/Observação/).fill("Turma 3ºB, #2");
  await enviar(page).click();

  const [url] = await page.evaluate(() => window.__aberto);
  expect(url.startsWith(`https://wa.me/${WHATSAPP}?text=`)).toBe(true);
  const msg = new URL(url).searchParams.get("text");
  expect(msg).toContain("[TESTE");
  expect(msg).toContain("Oi, Jhulia!");
  expect(msg).toContain("2× Pão de parmesão · R$ 50,00");
  expect(msg).toContain("1× Molho pesto (pote 145 ml)");
  expect(msg).toContain("*Total: R$ 68,00* (3 itens)");
  expect(msg).toContain("Retirada: terça, 03/11 · Escola Praia do Riso");
  expect(msg).toContain("Nome: Ana & Cia");
  expect(msg).toContain("Obs.: Turma 3ºB, #2");

  await page.reload();
  await expect(page.getByLabel("Seu nome")).toHaveValue("Ana & Cia");
});

test("links de contato apontam pro WhatsApp dela", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#zapRodape")).toHaveAttribute("href", `https://wa.me/${WHATSAPP}`);
  await expect(page.locator("#zapPonto")).toHaveAttribute("href", new RegExp(`^https://wa.me/${WHATSAPP}\\?text=`));
  await expect(page.locator("#zapRodape")).toHaveText("(48) 98422-7982");
});

test("barra do pedido some quando o formulário está na tela", async ({ page }) => {
  await page.goto("./");
  await adicionar(page, "tradicional").click();
  await expect(page.locator("#barra")).toBeVisible();
  await page.locator("#form").scrollIntoViewIfNeeded();
  await expect(page.locator("#barra")).toBeHidden();
});

test("teclado: monta o pedido e o foco não se perde ao trocar Adicionar pelo contador", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("celular"), "teclado não se aplica ao celular");
  await page.goto("./");
  const alvo = adicionar(page, "tradicional");
  for (let i = 0; i < 60 && !(await alvo.evaluate(el => el === document.activeElement)); i++) {
    await page.keyboard.press("Tab");
  }
  await expect(alvo).toBeFocused();
  expect(await alvo.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe("none");
  await page.keyboard.press("Enter");
  await expect(mais(page, "tradicional")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(qtd(page, "tradicional")).toHaveText("2");
  await page.keyboard.press("Shift+Tab");
  await expect(menos(page, "tradicional")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(adicionar(page, "tradicional")).toBeFocused();
});

for (const largura of [320, 360, 390, 768, 1024, 1440]) {
  test(`sem rolagem horizontal em ${largura}px, com pedido montado`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: 800 });
    await page.goto("./");
    await adicionar(page, "tradicional").click();
    await adicionar(page, "geleia").click();
    await page.locator("#form").scrollIntoViewIfNeeded();
    const larg = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(larg).toBeLessThanOrEqual(largura);
  });
}

test("botões de toque têm pelo menos 32px", async ({ page }) => {
  await page.goto("./");
  await adicionar(page, "tradicional").click();
  const pequenos = await page.$$eval(".qtd button, .filtro, .btn, .add", els =>
    els.filter(e => e.offsetParent).map(e => e.getBoundingClientRect())
      .filter(r => r.width < 32 || r.height < 30).length);
  expect(pequenos).toBe(0);
});

test("no celular os campos têm fonte ≥ 16px (o iPhone não dá zoom ao tocar)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  const pequenas = await page.$$eval("input, select, textarea", els =>
    els.map(e => parseFloat(getComputedStyle(e).fontSize)).filter(t => t < 16));
  expect(pequenas).toEqual([]);
});

test("acessibilidade: nenhum problema sério ou crítico no axe", async ({ page }) => {
  await page.goto("./");
  await adicionar(page, "tradicional").click();
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  const graves = r.violations.filter(v => ["serious", "critical"].includes(v.impact))
    .map(v => `${v.id}: ${v.nodes.slice(0, 3).map(n => n.target.join(" ")).join(" | ")}`);
  expect(graves).toEqual([]);
});

test("SEO básico: título, descrição, idioma e noindex enquanto for demo", async ({ page }) => {
  await page.goto("./");
  await expect(page).toHaveTitle(/Pães da Jhulia/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{50,}/);
  await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator("h1")).toHaveCount(1);
});

test("prévia do link (WhatsApp) aponta pro endereço publicado e a imagem existe", async ({ page, request }) => {
  await page.goto("./");
  const og = x => page.locator(`meta[property="og:${x}"]`).getAttribute("content");
  expect(await og("url")).toBe("https://sayao-studio.github.io/pao-jhulia/");
  const img = await og("image");
  expect(img).toBe("https://sayao-studio.github.io/pao-jhulia/img/capa.jpg");
  const resp = await request.get(new URL(img).pathname.replace(/^\/pao-jhulia\//, "/"));
  expect(resp.ok()).toBe(true);
  expect(resp.headers()["content-type"]).toBe("image/jpeg");
  expect((await resp.body()).length).toBeLessThan(300 * 1024);
});

test("marca d'água não bloqueia clique e rodapé tem aviso de direitos", async ({ page }) => {
  await page.goto("./");
  const marca = page.locator(".marca-dagua");
  await expect(marca).toHaveAttribute("aria-hidden", "true");
  expect(await marca.evaluate(el => getComputedStyle(el).pointerEvents)).toBe("none");
  await expect(page.locator("footer .fim")).toContainText("Proibida a reprodução");
});

test("o site não expõe a vida pessoal dela", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("body")).not.toContainText(/solteira/i);
});

test("prazo do pedido aparece junto do formulário", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator("#prazo")).toHaveText("Pedidos até as 20h do dia anterior à retirada.");
  await expect(page.locator("#quando")).toHaveAttribute("aria-describedby", /prazo/);
});

test("data que venceu com a aba aberta é recusada no envio", async ({ page }) => {
  await page.goto("./");
  await adicionar(page, "tradicional").click();
  await page.locator("#quando").selectOption({ label: "terça, 03/11 · Escola Praia do Riso" });
  await page.clock.setFixedTime(new Date("2026-11-02T21:00:00-03:00"));   // passou do prazo de terça
  await enviar(page).click();
  await expect(page.locator("#erro")).toContainText("não está mais disponível");
  expect(await page.evaluate(() => window.__aberto.length)).toBe(0);
  const opcoes = await page.locator("#quando option").allTextContents();
  expect(opcoes[1]).toContain("quarta, 04/11");
});

test("se o navegador bloquear a aba nova, abre o WhatsApp na mesma aba", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(() => { window.open = () => null; });
  await page.route("https://wa.me/**", rota => rota.fulfill({ body: "ok whatsapp" }));
  await adicionar(page, "tradicional").click();
  await page.locator("#quando").selectOption({ index: 1 });
  await enviar(page).click();
  await page.waitForURL(/^https:\/\/wa\.me\//);
});

test("Limpar pode ser desfeito", async ({ page }) => {
  await page.goto("./");
  await adicionar(page, "tradicional").click();
  await adicionar(page, "pesto").click();
  await page.getByRole("button", { name: "Limpar", exact: true }).click();
  const desfazer = page.getByRole("button", { name: "Desfazer" });
  await expect(desfazer).toBeFocused();
  await desfazer.click();
  await expect(page.locator("#resumo li")).toHaveCount(2);
  await expect(qtd(page, "pesto")).toHaveText("1");
  await expect(page.locator("#barraItens")).toHaveText("2 itens");
});

test("teclado: filtros e resumo não jogam o foco pro topo", async ({ page }, info) => {
  test.skip(info.project.name.startsWith("celular"), "teclado não se aplica ao celular");
  await page.goto("./");
  const pra = page.getByRole("button", { name: "Pra acompanhar", exact: true });
  await pra.focus();
  await page.keyboard.press("Enter");
  await expect(pra).toBeFocused();
  await expect(pra).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Todos", exact: true }).click();

  await adicionar(page, "tradicional").click();
  await adicionar(page, "geleia").click();
  const linha = page.locator('#resumo li[data-id="tradicional"]');
  await linha.getByRole("button", { name: /^Pôr mais um/ }).focus();
  await page.keyboard.press("Enter");
  await expect(linha.getByRole("button", { name: /^Pôr mais um/ })).toBeFocused();
  // tirar até a linha sumir: o foco vai pra linha seguinte
  const menosLinha = linha.getByRole("button", { name: /^Tirar um/ });
  await menosLinha.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await expect(linha).toHaveCount(0);
  await expect(page.locator('#resumo li[data-id="geleia"] button').first()).toBeFocused();
});

test("destaque do topo avisa quando já está no limite", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("paes-carrinho", JSON.stringify({ parmesao: 30 })));
  await page.goto("./");
  await page.locator("[data-add]").click();
  await expect(page.locator("[data-add]")).toHaveText("Limite do pedido");
  await expect(qtd(page, "parmesao")).toHaveText("30");
});

test("barra do pedido não cobre o fim do rodapé", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 });
  await page.goto("./");
  await adicionar(page, "tradicional").click();
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(400);
  const barra = await page.locator("#barra").boundingBox();
  const fim = await page.locator("footer .fim").boundingBox();
  if (await page.locator("#barra").isVisible()) expect(fim.y + fim.height).toBeLessThanOrEqual(barra.y);
});
