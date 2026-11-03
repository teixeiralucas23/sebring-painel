import "server-only";
import postgres from "postgres";
import type { Dados } from "./types";
import { SEED } from "./seed";
import { validar } from "./validar";

let cliente: postgres.Sql | null = null;
function sql() {
  if (!cliente) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL não configurada. Veja o README.");
    const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
    cliente = postgres(url, { ssl: local ? false : "require", max: 1, prepare: false, idle_timeout: 20 });
  }
  return cliente;
}

let pronto: Promise<void> | null = null;
/** Cria as tabelas e carrega os dados iniciais na primeira execução. */
function garantirTabelas() {
  pronto ??= (async () => {
    const s = sql();
    await s`create table if not exists painel (
      id int primary key,
      dados jsonb not null,
      atualizado_em timestamptz not null default now(),
      atualizado_por text not null
    )`;
    await s`create table if not exists historico (
      id serial primary key,
      dados jsonb not null,
      salvo_em timestamptz not null,
      salvo_por text not null,
      substituido_em timestamptz not null default now(),
      substituido_por text not null
    )`;
    await s`insert into painel (id, dados, atualizado_por)
            values (1, ${s.json(SEED as never)}, 'sistema') on conflict (id) do nothing`;
  })().catch((e) => {
    pronto = null;
    throw e;
  });
  return pronto;
}

export interface Painel {
  dados: Dados;
  atualizadoEm: Date;
  atualizadoPor: string;
}

export async function lerPainel(): Promise<Painel> {
  await garantirTabelas();
  const [row] = await sql()`select dados, date_trunc('milliseconds', atualizado_em) as atualizado_em, atualizado_por from painel where id = 1`;
  return { dados: validar(row.dados), atualizadoEm: new Date(row.atualizado_em), atualizadoPor: row.atualizado_por };
}

/**
 * Salva a nova versão e guarda a anterior no histórico (para poder desfazer).
 * Se `versaoEsperada` for informada e alguém tiver salvo depois dela, não salva e retorna false.
 */
export async function salvarPainel(dados: Dados, usuario: string, versaoEsperada?: string): Promise<boolean> {
  await garantirTabelas();
  return sql().begin(async (tx) => {
    const [atual] = await tx`select date_trunc('milliseconds', atualizado_em) as v from painel where id = 1 for update`;
    if (versaoEsperada && new Date(atual.v).toISOString() !== versaoEsperada) return false;
    await tx`insert into historico (dados, salvo_em, salvo_por, substituido_por)
             select dados, atualizado_em, atualizado_por, ${usuario} from painel where id = 1`;
    await tx`update painel set dados = ${tx.json(dados as never)}, atualizado_em = date_trunc('milliseconds', now()), atualizado_por = ${usuario} where id = 1`;
    await tx`delete from historico where id not in (select id from historico order by id desc limit 200)`;
    return true;
  });
}

export interface VersaoHistorico {
  id: number;
  salvoEm: Date;
  salvoPor: string;
  substituidoEm: Date;
  substituidoPor: string;
}

export async function listarHistorico(limite = 30): Promise<VersaoHistorico[]> {
  await garantirTabelas();
  const rows = await sql()`select id, salvo_em, salvo_por, substituido_em, substituido_por
                           from historico order by id desc limit ${limite}`;
  return rows.map((r) => ({
    id: r.id,
    salvoEm: new Date(r.salvo_em),
    salvoPor: r.salvo_por,
    substituidoEm: new Date(r.substituido_em),
    substituidoPor: r.substituido_por,
  }));
}

export async function lerVersao(id: number): Promise<Dados | null> {
  await garantirTabelas();
  const [row] = await sql()`select dados from historico where id = ${id}`;
  return row ? validar(row.dados) : null;
}
