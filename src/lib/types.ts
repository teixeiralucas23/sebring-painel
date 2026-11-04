export type Status = "realizado" | "proximo" | "programado" | "marco";

export const STATUS_LABEL: Record<Status, string> = {
  realizado: "Realizado",
  proximo: "Próximo",
  programado: "Programado",
  marco: "Marco",
};

/** Um lançamento do fluxo de caixa. Valores em USD, do projeto inteiro (todas as casas). */
export interface Lancamento {
  id: string;
  data: string; // AAAA-MM-DD
  descricao: string;
  status: Status;
  aporte: number; // entrada de capital dos sócios
  emprestimo: number; // liberação do hard money (juros correm a partir desta data)
  saidas: number; // pagamentos feitos
}

export interface Socio {
  nome: string;
  percentual: number; // ex.: 25 = 25%
}

export interface Cenario {
  nome: string;
  descricao: string;
  preco: number;
  dias: number;
}

export interface Risco {
  titulo: string;
  texto: string;
}

export const CATEGORIAS_ATIVO = [
  "Bolsas",
  "Joias",
  "Relógios",
  "Barcos",
  "Quadros de arte",
  "Peças de arte",
  "Barras de ouro",
  "Itens colecionáveis",
  "Outros",
] as const;
export type CategoriaAtivo = (typeof CATEGORIAS_ATIVO)[number];

/** Bem fora do projeto das casas (não entra no lucro do projeto). */
export interface Ativo {
  id: string;
  nome: string;
  categoria: CategoriaAtivo;
  dono: string; // sócio, empresa ou outro
  dataAquisicao: string; // AAAA-MM-DD ou ""
  custo: number; // valor pago
  valorAtual: number; // avaliação atual
  observacao: string; // nº de série, certificado, local de guarda etc.
}

export interface Premissas {
  casas: number;
  aberturaEmpresa: number; // total do projeto
  lote: number; // por casa
  construcao: number; // por casa
  areaSqft: number; // por casa
  gestao: number; // por casa
  taxasEmprestimo: number; // por casa
  jurosAnual: number; // % a.a.
  closing: number; // % sobre a venda
  precoVenda: number; // por casa
  precoLista: number; // por casa
  dataListagem: string; // AAAA-MM-DD
  diasMercado: number;
  statusVenda: Status;
}

export interface Dados {
  projeto: {
    titulo: string;
    descricao: string;
    construtora: string;
    rodape: string;
  };
  socios: Socio[];
  premissas: Premissas;
  lancamentos: Lancamento[];
  cenarios: Cenario[];
  sensibilidade: {
    precoMin: number;
    precoMax: number;
    passo: number;
    dias: number[];
  };
  riscos: Risco[];
  ativos: Ativo[];
}
