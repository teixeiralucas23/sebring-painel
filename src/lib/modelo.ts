import type { Dados } from "./types";
import { addDias } from "./calc";

/** Ponto de partida para um projeto novo "em branco": 1 casa, custos zerados, para preencher no editor. */
export function modeloEmBranco(nome: string, hoje = new Date().toISOString().slice(0, 10)): Dados {
  return {
    projeto: {
      titulo: nome,
      descricao: "Painel financeiro do projeto",
      construtora: "A definir",
      rodape:
        "Este material é uma ilustração financeira baseada nas premissas informadas e não constitui aconselhamento financeiro, contábil ou jurídico. Os resultados reais dependerão das condições de mercado, do desempenho da obra e dos termos finais do financiamento.",
    },
    socios: [{ nome: "Sócio 1", percentual: 100 }],
    premissas: {
      casas: 1, aberturaEmpresa: 0, lote: 0, construcao: 0, areaSqft: 0, gestao: 0, taxasEmprestimo: 0, outros: 0,
      jurosAnual: 10, closing: 6, precoVenda: 0, precoLista: 0,
      dataListagem: addDias(hoje, 180), diasMercado: 90, statusVenda: "programado",
    },
    lancamentos: [],
    cenarios: [],
    sensibilidade: { precoMin: 200000, precoMax: 400000, passo: 20000, dias: [60, 90, 120, 180] },
    riscos: [],
    ativos: [],
    destaques: [],
  };
}
