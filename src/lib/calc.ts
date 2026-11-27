import type { Dados, Status } from "./types";

const DIA = 86_400_000;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const soma = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export const parseData = (s: string) => Date.parse(s + "T00:00:00Z");
export const isoData = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDias = (s: string, d: number) => isoData(parseData(s) + d * DIA);
export const diasEntre = (a: string, b: string) => Math.round((parseData(b) - parseData(a)) / DIA);

/** 10/abr/26 */
export function dataCurta(s: string) {
  const d = new Date(parseData(s));
  return `${String(d.getUTCDate()).padStart(2, "0")}/${MESES[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`;
}
/** 10 ABR 2026 */
export function dataLonga(s: string) {
  const d = new Date(parseData(s));
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MESES[d.getUTCMonth()].toUpperCase()} ${d.getUTCFullYear()}`;
}

/** "1 casa" / "2 casas" */
export const casas = (n: number) => `${n} ${n === 1 ? "casa" : "casas"}`;

export function fmt(n: number) {
  const v = Math.round(n);
  const s = "$" + Math.abs(v).toLocaleString("pt-BR");
  return v < 0 ? "−" + s : s;
}
export function pct(x: number, casas = 1) {
  return (x * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + "%";
}

/** Modelo financeiro: tudo é derivado das premissas e dos lançamentos. */
export function criarModelo(d: Dados) {
  const p = d.premissas;
  const N = p.casas;
  const taxa = p.jurosAnual / 100;
  const cc = p.closing / 100;
  const liberacoes = d.lancamentos.filter((l) => l.emprestimo > 0);
  const emprestimoTotal = soma(liberacoes.map((l) => l.emprestimo));
  const equityTotal = soma(d.lancamentos.map((l) => l.aporte));
  const fixo = p.aberturaEmpresa + N * (p.lote + p.construcao + p.gestao + p.taxasEmprestimo + p.outros);

  const quitacao = (dias: number) => addDias(p.dataListagem, dias);
  /** Juros simples diários sobre cada liberação, da data da liberação até a quitação (venda). */
  const juros = (dias: number) => {
    const q = quitacao(dias);
    return soma(liberacoes.map((l) => (l.emprestimo * taxa * Math.max(0, diasEntre(l.data, q))) / 365));
  };
  const custo = (preco: number, dias: number) => fixo + juros(dias) + N * preco * cc;
  const lucro = (preco: number, dias: number) => N * preco - custo(preco, dias);
  const breakeven = (dias: number) => (fixo + juros(dias)) / (N * (1 - cc));

  return { N, taxa, cc, fixo, emprestimoTotal, equityTotal, quitacao, juros, custo, lucro, breakeven };
}
export type Modelo = ReturnType<typeof criarModelo>;

export interface LinhaFluxo {
  id: string;
  data: string;
  descricao: string;
  status: Status;
  aporte: number;
  emprestimo: number;
  venda: number;
  saidas: number;
  caixa: number;
  equity: number;
  divida: number;
  auto: boolean;
}

/** Fluxo de caixa: lançamentos + listagem e venda (calculadas a partir das premissas). */
export function fluxo(d: Dados, m: Modelo): LinhaFluxo[] {
  const p = d.premissas;
  const receita = m.N * p.precoVenda;
  const base = [
    ...d.lancamentos.map((l) => ({ ...l, venda: 0, auto: false })),
    {
      id: "listagem", data: p.dataListagem, descricao: `Listagem no mercado a ${fmt(p.precoLista)}`,
      status: "marco" as Status, aporte: 0, emprestimo: 0, venda: 0, saidas: 0, auto: true,
    },
    {
      id: "venda", data: m.quitacao(p.diasMercado), descricao: m.N === 1 ? "Venda da casa — fechamento" : `Venda das ${m.N} casas — fechamento`,
      status: p.statusVenda, aporte: 0, emprestimo: 0, venda: receita,
      saidas: m.emprestimoTotal + m.juros(p.diasMercado) + receita * m.cc, auto: true,
    },
  ];
  // ordena por data mantendo a ordem original em empates
  const ordenado = base.map((l, i) => ({ l, i })).sort((a, b) => a.l.data.localeCompare(b.l.data) || a.i - b.i).map((x) => x.l);
  let caixa = 0, equity = 0, divida = 0;
  return ordenado.map((l) => {
    caixa += l.aporte + l.emprestimo + l.venda - l.saidas;
    equity += l.aporte;
    divida = l.id === "venda" ? 0 : divida + l.emprestimo;
    return { ...l, caixa, equity, divida };
  });
}

/** Indicadores do cenário base e checagens de consistência. */
export function resumo(d: Dados) {
  const m = criarModelo(d);
  const p = d.premissas;
  const linhas = fluxo(d, m);
  const receita = m.N * p.precoVenda;
  const juros = m.juros(p.diasMercado);
  const custo = m.custo(p.precoVenda, p.diasMercado);
  const lucro = receita - custo;
  const aportes = d.lancamentos.filter((l) => l.aporte > 0).sort((a, b) => a.data.localeCompare(b.data));
  const jaAportado = soma(aportes.filter((l) => l.status === "realizado").map((l) => l.aporte));
  const pendentes = aportes.filter((l) => l.status !== "realizado");
  const pctIgual = d.socios.length > 0 && d.socios.every((s) => s.percentual === d.socios[0].percentual);

  const avisos: string[] = [];
  const somaSocios = soma(d.socios.map((s) => s.percentual));
  if (Math.abs(somaSocios - 100) > 0.001) avisos.push(`Os percentuais dos sócios somam ${somaSocios}% (deveriam somar 100%).`);
  const saidasLancadas = soma(d.lancamentos.map((l) => l.saidas));
  if (Math.abs(saidasLancadas - m.fixo) > 1)
    avisos.push(
      `As saídas dos lançamentos somam ${fmt(saidasLancadas)}, mas os custos das premissas (abertura + lote + construção + gestão + taxas do empréstimo + outros) somam ${fmt(m.fixo)}. Diferença de ${fmt(saidasLancadas - m.fixo)} — o fluxo de caixa não vai bater com o lucro.`,
    );
  const negativo = linhas.find((l) => l.caixa < -0.5);
  if (negativo) avisos.push(`O caixa do projeto fica negativo em ${dataCurta(negativo.data)} (${fmt(negativo.caixa)}). Falta aporte ou empréstimo antes dessa data.`);

  return {
    m, linhas, receita, juros, custo, lucro,
    margem: receita ? lucro / receita : 0,
    roe: m.equityTotal ? lucro / m.equityTotal : 0,
    custoPorCasa: custo / m.N,
    custoSqft: p.areaSqft ? custo / m.N / p.areaSqft : 0,
    jaAportado,
    falta: m.equityTotal - jaAportado,
    proximoAporte: pendentes[0] ?? null,
    pendentes,
    pctIgual,
    caixaFinal: linhas.length ? linhas[linhas.length - 1].caixa : 0,
    avisos,
  };
}

/** Resumo dos outros ativos (bens fora do projeto das casas). */
export function resumoAtivos(d: Dados) {
  const total = soma(d.ativos.map((a) => a.valorAtual));
  const custo = soma(d.ativos.map((a) => a.custo));
  const mapa = new Map<string, { categoria: string; qtd: number; custo: number; valor: number }>();
  for (const a of d.ativos) {
    const g = mapa.get(a.categoria) ?? { categoria: a.categoria, qtd: 0, custo: 0, valor: 0 };
    g.qtd++; g.custo += a.custo; g.valor += a.valorAtual;
    mapa.set(a.categoria, g);
  }
  const porCategoria = [...mapa.values()].sort((a, b) => b.valor - a.valor);
  return { total, custo, valorizacao: total - custo, valorizacaoPct: custo ? (total - custo) / custo : 0, porCategoria };
}
