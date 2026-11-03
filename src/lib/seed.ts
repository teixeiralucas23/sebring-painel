import type { Dados } from "./types";

/** Dados iniciais — os mesmos do painel publicado no Netlify (premissas de 27/jul/2026). */
export const SEED: Dados = {
  projeto: {
    titulo: "OPD Development LLC — Sebring, Florida",
    descricao: "Duas casas populares para venda · Painel financeiro do projeto",
    construtora: "AE Pro Builder LLC",
    rodape:
      "Preparado para Lucas · OPD Development LLC. Este material é uma ilustração financeira baseada nas premissas informadas e não constitui aconselhamento financeiro, contábil ou jurídico. Os resultados reais dependerão das condições de mercado, do desempenho da obra e dos termos finais do financiamento.",
  },
  socios: [
    { nome: "Axis Capital", percentual: 25 },
    { nome: "Motti Holdings", percentual: 25 },
    { nome: "Orvexa LLC", percentual: 25 },
    { nome: "Solidground Group LLC", percentual: 25 },
  ],
  premissas: {
    casas: 2,
    aberturaEmpresa: 900,
    lote: 20000,
    construcao: 202900,
    areaSqft: 2029,
    gestao: 12500,
    taxasEmprestimo: 15000,
    jurosAnual: 10,
    closing: 6,
    precoVenda: 305000,
    precoLista: 308000,
    dataListagem: "2026-11-10",
    diasMercado: 90,
    statusVenda: "programado",
  },
  lancamentos: [
    { id: "l1", data: "2026-04-10", descricao: "Abertura da OPD Development LLC", status: "realizado", aporte: 900, emprestimo: 0, saidas: 900 },
    { id: "l2", data: "2026-04-20", descricao: "Compra dos 2 lotes", status: "realizado", aporte: 40000, emprestimo: 0, saidas: 40000 },
    { id: "l3", data: "2026-04-30", descricao: "Contrato + projeto ($15k/casa)", status: "realizado", aporte: 30000, emprestimo: 0, saidas: 30000 },
    { id: "l4", data: "2026-05-20", descricao: "Gestão da obra ($12,5k/casa)", status: "realizado", aporte: 25000, emprestimo: 0, saidas: 25000 },
    { id: "l5", data: "2026-08-01", descricao: "Aporte de construção #2 ($10k/casa)", status: "proximo", aporte: 20000, emprestimo: 0, saidas: 20000 },
    { id: "l6", data: "2026-08-15", descricao: "Aporte de construção #3 ($15k/casa)", status: "programado", aporte: 30000, emprestimo: 0, saidas: 30000 },
    { id: "l7", data: "2026-08-25", descricao: "Aporte de construção #4 ($15k/casa)", status: "programado", aporte: 30000, emprestimo: 0, saidas: 30000 },
    { id: "l8", data: "2026-09-01", descricao: "1º funding — taxas $30k + $80k ao construtor", status: "programado", aporte: 0, emprestimo: 110000, saidas: 110000 },
    { id: "l9", data: "2026-09-21", descricao: "2º funding → construtor", status: "programado", aporte: 0, emprestimo: 110000, saidas: 110000 },
    { id: "l10", data: "2026-10-10", descricao: "3º funding → saldo do contrato", status: "programado", aporte: 0, emprestimo: 110000, saidas: 105800 },
    { id: "l11", data: "2026-11-15", descricao: "Certificate of Occupancy emitido", status: "marco", aporte: 0, emprestimo: 0, saidas: 0 },
  ],
  cenarios: [
    { nome: "Estresse", descricao: "venda lenta e preço baixo", preco: 289000, dias: 180 },
    { nome: "Pior caso", descricao: "piso de preço, venda lenta", preco: 295000, dias: 150 },
    { nome: "Conservador", descricao: "piso de preço, prazo previsto", preco: 295000, dias: 90 },
    { nome: "Otimista", descricao: "vende perto do preço de lista", preco: 308000, dias: 60 },
  ],
  sensibilidade: {
    precoMin: 280000,
    precoMax: 315000,
    passo: 5000,
    dias: [30, 60, 90, 120, 150, 180, 240],
  },
  riscos: [
    { titulo: "Tempo no mercado", texto: "Cada dia extra custa ~$90 em juros nas duas casas. Vender em 180 dias em vez de 90 reduz o lucro em ~$8.200." },
    { titulo: "Preço de venda", texto: "Cada $1.000 a menos no preço tira $1.880 do lucro total (preço líquido de 6% de closing, × 2 casas)." },
    { titulo: "Estouro de obra", texto: "O contrato de $202.900/casa é fixo, mas change orders saem direto do lucro. A reserva de caixa atual é de apenas $4.200." },
    { titulo: "Atraso no CO", texto: "Empurra a listagem e acumula juros sem receita — o efeito é o mesmo que ampliar o tempo no mercado." },
    { titulo: "Custo do capital", texto: "$15.000 de taxas por casa equivalem a ~9,1% do principal, além dos 10% a.a. de juros. O financiamento consome 7,7% do custo total." },
    { titulo: "Concentração", texto: "Duas casas idênticas, no mesmo mercado, listadas ao mesmo tempo. Elas competem entre si e o risco não está diversificado." },
  ],
};
