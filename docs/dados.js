/* Configuração do site: é só aqui que se mexe em preço, produto e ponto de retirada.
   ATENÇÃO: site de demonstração. Preços vieram da Jhulia (30/10/2026); dias,
   horário e ingredientes são EXEMPLO. Fotos marcadas com `ilustrativa` são fictícias. */
export const DEMO = true;
export const WHATSAPP = "554884227982";
export const NOME = "Jhulia";

// Categorias na ordem em que aparecem no cardápio.
export const CATEGORIAS = [
  { id: "paes",          nome: "Pães" },
  { id: "acompanhar",    nome: "Pra acompanhar" }
];

// preco em reais. foto: arquivo em img/ (padrão: <id>.webp).
const P = { cat: "paes", preco: 25, medida: "unidade" };
export const PRODUTOS = [
  { ...P, id: "tradicional", nome: "Pão tradicional", preco: 20, tipo: "Casquinha crocante e miolo macio",
    ing: "Farinha de trigo, água, fermento, sal e azeite.", selo: "O clássico" },
  { ...P, id: "azeitona", foto: "azeitona.svg", ilustrativa: true, nome: "Pão de azeitona", tipo: "Recheado de azeitona",
    ing: "Massa do tradicional com azeitonas." },
  { ...P, id: "calabresa", foto: "calabresa.svg", ilustrativa: true, nome: "Pão de calabresa", tipo: "Recheado de calabresa",
    ing: "Massa do tradicional com calabresa." },
  { ...P, id: "parmesao", nome: "Pão de parmesão", tipo: "Casquinha gratinada de queijo",
    ing: "Massa do tradicional com parmesão por cima." },

  { cat: "acompanhar", preco: 18, medida: "pote 145 ml", id: "pesto", foto: "pesto.svg", ilustrativa: true,
    nome: "Molho pesto", tipo: "Pra passar no pão quentinho",
    ing: "Manjericão, azeite, alho, castanha e queijo." },
  { cat: "acompanhar", preco: 15, medida: "pote 145 ml", id: "geleia", foto: "geleia.svg", ilustrativa: true,
    nome: "Geleia de frutas", tipo: "Caseira, feita com fruta de verdade",
    ing: "Frutas e açúcar." }
];

// Onde pegar (EXEMPLO de dias e horário). dias: 0 = domingo ... 6 = sábado.
export const PONTOS = [
  { nome: "Escola Praia do Riso", bairro: "Abraão, Florianópolis", dias: [1, 2, 3, 4, 5],
    janela: "na entrada e na saída das aulas" }
];

export const NOMES_DIA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
export const DIAS_A_FRENTE = 14;      // datas oferecidas no pedido
export const ANTECEDENCIA_H = 24;     // pedido com pelo menos 1 dia de antecedência

/* ---------- funções puras ---------- */

export const brl = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const fotoDe = p => p.foto || `${p.id}.webp`;

export function totalDe(carrinho) {
  let itens = 0, valor = 0;
  for (const p of PRODUTOS) {
    const q = carrinho[p.id] || 0;
    itens += q; valor += q * p.preco;
  }
  return { itens, valor };
}

// Próximas datas com retirada, a partir de `agora` respeitando a antecedência.
export function proximasDatas(agora = new Date()) {
  const limite = new Date(agora.getTime() + ANTECEDENCIA_H * 3600e3);
  const out = [];
  for (let i = 0; i <= DIAS_A_FRENTE; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() + i);
    const fimDoDia = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59);
    for (const ponto of PONTOS) {
      if (ponto.dias.includes(d.getDay()) && fimDoDia >= limite) out.push({ data: d, ponto });
    }
  }
  return out;
}

export function dataCurta(d) {
  return `${NOMES_DIA[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// "seg a sex" para dias seguidos; senão lista os nomes.
export function diasTexto(dias) {
  const curto = dias.map(d => NOMES_DIA[d].slice(0, 3));
  const seguidos = dias.every((d, i) => i === 0 || d === dias[i - 1] + 1);
  return seguidos && dias.length > 2 ? `${NOMES_DIA[dias[0]]} a ${NOMES_DIA[dias.at(-1)]}` : curto.join(", ");
}

export function mensagemPedido({ carrinho, nome, quando, obs }) {
  const linhas = [];
  if (DEMO) linhas.push("*[TESTE: site de demonstração]*", "");
  linhas.push(`Oi, ${NOME}! Quero fazer uma encomenda 🍞`, "");
  for (const p of PRODUTOS) {
    const q = carrinho[p.id] || 0;
    if (q) linhas.push(`• ${q}× ${p.nome}${p.medida === "unidade" ? "" : ` (${p.medida})`} · ${brl(q * p.preco)}`);
  }
  const t = totalDe(carrinho);
  linhas.push("", `*Total: ${brl(t.valor)}* (${t.itens} ${t.itens > 1 ? "itens" : "item"})`);
  if (quando) linhas.push(`Retirada: ${quando}`);
  if (nome) linhas.push(`Nome: ${nome}`);
  if (obs) linhas.push(`Obs.: ${obs}`);
  return linhas.join("\n");
}
