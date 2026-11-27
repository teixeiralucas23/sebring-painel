import type { Dados } from "./types";

/**
 * Projeto 2201 Sunrise Drive — dados da planilha "Viabilidade_financeira.xlsx".
 * Custos: lote $45.000 · construção $287.000 · adm da obra $12.000 · lender $20.000 · outros $4.000 = $368.000.
 * Estrutura: $150.000 de recursos próprios + $218.000 do lender.
 * Venda: otimista $489.000 · moderado $469.000 (base) · pessimista $439.000 · closing 6%.
 * O custo do lender ($20.000) já inclui a captação de 4% e 6 meses de juros a 10% a.a., como na planilha,
 * por isso os juros diários ficam em 0%. As datas não constavam na planilha: são estimativas para ajustar no editor.
 */
export const SEED_SUNRISE: Dados = {
  projeto: {
    titulo: "2201 Sunrise Drive — Sun 'n Lake, Sebring FL",
    descricao: "Casa nova para venda (spec home) · Painel financeiro do projeto",
    construtora: "A definir",
    rodape:
      "Este material é uma ilustração financeira baseada nas premissas informadas e não constitui aconselhamento financeiro, contábil ou jurídico. Os resultados reais dependerão das condições de mercado, do desempenho da obra e dos termos finais do financiamento.",
  },
  socios: [{ nome: "Recursos próprios", percentual: 100 }],
  premissas: {
    casas: 1,
    aberturaEmpresa: 0,
    lote: 45000,
    construcao: 287000,
    areaSqft: 0,
    gestao: 12000,
    taxasEmprestimo: 20000,
    outros: 4000,
    jurosAnual: 0,
    closing: 6,
    precoVenda: 469000,
    precoLista: 489000,
    dataListagem: "2027-06-20",
    diasMercado: 90,
    statusVenda: "programado",
  },
  lancamentos: [
    { id: "s1", data: "2026-12-15", descricao: "Aporte de recursos próprios", status: "programado", aporte: 150000, emprestimo: 0, saidas: 0 },
    { id: "s2", data: "2026-12-15", descricao: "Compra do lote", status: "programado", aporte: 0, emprestimo: 0, saidas: 45000 },
    { id: "s3", data: "2026-12-15", descricao: "Outros custos", status: "programado", aporte: 0, emprestimo: 0, saidas: 4000 },
    { id: "s4", data: "2027-01-05", descricao: "Liberação do lender + custos do lender (captação 4% e juros de 6 meses)", status: "programado", aporte: 0, emprestimo: 218000, saidas: 20000 },
    { id: "s5", data: "2027-01-10", descricao: "Administração da obra", status: "programado", aporte: 0, emprestimo: 0, saidas: 12000 },
    { id: "s6", data: "2027-01-10", descricao: "Construção — 1ª medição", status: "programado", aporte: 0, emprestimo: 0, saidas: 100000 },
    { id: "s7", data: "2027-03-10", descricao: "Construção — 2ª medição", status: "programado", aporte: 0, emprestimo: 0, saidas: 100000 },
    { id: "s8", data: "2027-05-10", descricao: "Construção — saldo do contrato", status: "programado", aporte: 0, emprestimo: 0, saidas: 87000 },
    { id: "s9", data: "2027-06-15", descricao: "Certificate of Occupancy", status: "marco", aporte: 0, emprestimo: 0, saidas: 0 },
  ],
  cenarios: [
    { nome: "Otimista", descricao: "melhor preço da planilha", preco: 489000, dias: 90 },
    { nome: "Pessimista", descricao: "pior preço da planilha", preco: 439000, dias: 90 },
  ],
  sensibilidade: { precoMin: 420000, precoMax: 500000, passo: 10000, dias: [90] },
  riscos: [
    { titulo: "Prazo do lender", texto: "Os $20.000 de custo do lender consideram 6 meses de saldo integral a 10% a.a. mais 4% de captação sobre $218.000. Cada mês além disso custa ~$1.800 em juros." },
    { titulo: "Preço de venda", texto: "A planilha trabalha entre $439.000 e $489.000. Cada $10.000 a menos no preço tira ~$9.400 do lucro (líquido de 6% de closing)." },
    { titulo: "Diferenciais de acabamento", texto: "O preço-alvo depende dos diferenciais listados abaixo. Cortá-los para economizar na obra pode reduzir o valor de venda." },
  ],
  ativos: [],
  destaques: [
    "Piso porcelanato ao invés de vinílico",
    "Piso da entrada dos veículos de paver ao invés de concreto",
    "Portas internas maiores, gerando valor agregado",
    "Iluminação externa, com lanternins",
    "Entrada/varanda com detalhes em madeira e forro em madeira",
    "Revestimento de parte dos pilares de madeira com pedra natural",
    "Endereço em uma das melhores localizações do Sun 'n Lake",
  ],
};
