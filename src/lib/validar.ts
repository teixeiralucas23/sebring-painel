import type { Dados, Status } from "./types";
import { SEED } from "./seed";

const STATUS: Status[] = ["realizado", "proximo", "programado", "marco"];

const num = (v: unknown, padrao = 0) => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN;
  return Number.isFinite(n) ? n : padrao;
};
const txt = (v: unknown, padrao = "", max = 2000) => (typeof v === "string" ? v.slice(0, max) : padrao);
const data = (v: unknown, padrao: string) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : padrao);
const status = (v: unknown, padrao: Status): Status => (STATUS.includes(v as Status) ? (v as Status) : padrao);
const lista = (v: unknown, max = 200) => (Array.isArray(v) ? v.slice(0, max) : []);
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/** Limpa e completa os dados (vindos do banco ou do formulário). Nunca confia na entrada. */
export function validar(entrada: unknown): Dados {
  const e = obj(entrada);
  const pr = obj(e.projeto), pm = obj(e.premissas), se = obj(e.sensibilidade);
  const P = SEED.premissas;

  const dias = lista(se.dias, 12).map((x) => Math.max(0, Math.round(num(x)))).filter((x) => x > 0);

  return {
    projeto: {
      titulo: txt(pr.titulo, SEED.projeto.titulo, 200),
      descricao: txt(pr.descricao, SEED.projeto.descricao, 300),
      construtora: txt(pr.construtora, SEED.projeto.construtora, 200),
      rodape: txt(pr.rodape, SEED.projeto.rodape),
    },
    socios: lista(e.socios, 20).map((s) => {
      const o = obj(s);
      return { nome: txt(o.nome, "", 120), percentual: num(o.percentual) };
    }),
    premissas: {
      casas: Math.max(1, Math.round(num(pm.casas, P.casas))),
      aberturaEmpresa: num(pm.aberturaEmpresa, P.aberturaEmpresa),
      lote: num(pm.lote, P.lote),
      construcao: num(pm.construcao, P.construcao),
      areaSqft: num(pm.areaSqft, P.areaSqft),
      gestao: num(pm.gestao, P.gestao),
      taxasEmprestimo: num(pm.taxasEmprestimo, P.taxasEmprestimo),
      jurosAnual: num(pm.jurosAnual, P.jurosAnual),
      closing: num(pm.closing, P.closing),
      precoVenda: num(pm.precoVenda, P.precoVenda),
      precoLista: num(pm.precoLista, P.precoLista),
      dataListagem: data(pm.dataListagem, P.dataListagem),
      diasMercado: Math.max(0, Math.round(num(pm.diasMercado, P.diasMercado))),
      statusVenda: status(pm.statusVenda, P.statusVenda),
    },
    lancamentos: lista(e.lancamentos).map((l, i) => {
      const o = obj(l);
      return {
        id: txt(o.id, "", 40) || `l${Date.now()}${i}`,
        data: data(o.data, P.dataListagem),
        descricao: txt(o.descricao, "", 300),
        status: status(o.status, "programado"),
        aporte: num(o.aporte),
        emprestimo: num(o.emprestimo),
        saidas: num(o.saidas),
      };
    }),
    cenarios: lista(e.cenarios, 20).map((c) => {
      const o = obj(c);
      return { nome: txt(o.nome, "", 80), descricao: txt(o.descricao, "", 200), preco: num(o.preco), dias: Math.max(0, Math.round(num(o.dias))) };
    }),
    sensibilidade: {
      precoMin: num(se.precoMin, SEED.sensibilidade.precoMin),
      precoMax: num(se.precoMax, SEED.sensibilidade.precoMax),
      passo: Math.max(500, num(se.passo, SEED.sensibilidade.passo)),
      dias: dias.length ? dias : SEED.sensibilidade.dias,
    },
    riscos: lista(e.riscos, 30).map((r) => {
      const o = obj(r);
      return { titulo: txt(o.titulo, "", 120), texto: txt(o.texto, "", 1000) };
    }),
  };
}
