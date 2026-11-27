import "server-only";
import postgres from "postgres";
import { randomBytes } from "crypto";
import type { Acesso, Dados, ProjetoInfo, Visibilidade } from "./types";
import { SEED } from "./seed";
import { SEED_SUNRISE } from "./seedSunrise";
import { validar } from "./validar";

/** Projeto que abre na página inicial (/). É o painel original das duas casas. */
export const PRINCIPAL = "opd-sebring";

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
/**
 * Cria as tabelas na primeira execução. Na primeira vez com a versão multiprojeto,
 * copia o painel atual para o projeto principal e cria o projeto 2201 Sunrise Drive.
 */
function garantirTabelas() {
  pronto ??= (async () => {
    const s = sql();
    // tabela antiga (painel único): mantida só como origem da migração
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
    await s`alter table historico add column if not exists projeto text not null default 'opd-sebring'`;
    await s`create index if not exists historico_projeto on historico (projeto, id desc)`;
    await s`create table if not exists projetos (
      slug text primary key,
      nome text not null,
      visibilidade text not null default 'restrito',
      dados jsonb not null,
      criado_em timestamptz not null default now(),
      atualizado_em timestamptz not null default date_trunc('milliseconds', now()),
      atualizado_por text not null
    )`;
    await s`create table if not exists acessos (
      id serial primary key,
      projeto text not null references projetos(slug) on delete cascade,
      nome text not null,
      email text not null default '',
      perfil text not null default '',
      token text not null unique,
      expira_em date,
      revogado boolean not null default false,
      criado_em timestamptz not null default now(),
      criado_por text not null,
      ultimo_acesso timestamptz
    )`;
    await s`create table if not exists meta (chave text primary key, valor text not null)`;

    await s.begin(async (tx) => {
      const [nova] = await tx`insert into meta (chave, valor) values ('projetos_v1', now()::text)
                              on conflict (chave) do nothing returning chave`;
      if (!nova) return; // migração já feita
      const [antigo] = await tx`select dados, atualizado_em, atualizado_por from painel where id = 1`;
      await tx`insert into projetos (slug, nome, visibilidade, dados, atualizado_em, atualizado_por)
               values (${PRINCIPAL}, 'OPD Development — 2 casas', 'publico',
                       ${tx.json((antigo ? validar(antigo.dados) : SEED) as never)},
                       date_trunc('milliseconds', ${antigo ? antigo.atualizado_em : new Date()}::timestamptz),
                       ${antigo ? antigo.atualizado_por : "sistema"})
               on conflict (slug) do nothing`;
      await tx`insert into projetos (slug, nome, visibilidade, dados, atualizado_por)
               values ('2201-sunrise-drive', '2201 Sunrise Drive', 'restrito', ${tx.json(SEED_SUNRISE as never)}, 'sistema')
               on conflict (slug) do nothing`;
    });
  })().catch((e) => {
    pronto = null;
    throw e;
  });
  return pronto;
}

const info = (r: Record<string, unknown>): ProjetoInfo => ({
  slug: r.slug as string,
  nome: r.nome as string,
  visibilidade: r.visibilidade === "publico" ? "publico" : "restrito",
  criadoEm: new Date(r.criado_em as string),
  atualizadoEm: new Date(r.atualizado_em as string),
  atualizadoPor: r.atualizado_por as string,
});

export interface Projeto extends ProjetoInfo {
  dados: Dados;
}

export async function listarProjetos(): Promise<(Projeto & { acessosAtivos: number })[]> {
  await garantirTabelas();
  const rows = await sql()`
    select p.*, (select count(*)::int from acessos a where a.projeto = p.slug and not a.revogado
                 and (a.expira_em is null or a.expira_em >= current_date)) as ativos
    from projetos p order by (p.slug = ${PRINCIPAL}) desc, p.criado_em`;
  return rows.map((r) => ({ ...info(r), dados: validar(r.dados), acessosAtivos: r.ativos }));
}

export async function lerProjeto(slug: string): Promise<Projeto | null> {
  await garantirTabelas();
  const [r] = await sql()`select * from projetos where slug = ${slug}`;
  return r ? { ...info(r), dados: validar(r.dados) } : null;
}

export const slugValido = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length >= 2 && s.length <= 60;

/** Cria o projeto. Retorna false se o link já existir. */
export async function criarProjeto(slug: string, nome: string, visibilidade: Visibilidade, dados: Dados, usuario: string) {
  await garantirTabelas();
  const rows = await sql()`insert into projetos (slug, nome, visibilidade, dados, atualizado_por)
                           values (${slug}, ${nome}, ${visibilidade}, ${sql().json(dados as never)}, ${usuario})
                           on conflict (slug) do nothing returning slug`;
  return rows.length > 0;
}

export async function atualizarInfoProjeto(slug: string, nome: string, visibilidade: Visibilidade) {
  await garantirTabelas();
  await sql()`update projetos set nome = ${nome}, visibilidade = ${visibilidade} where slug = ${slug}`;
}

export async function excluirProjeto(slug: string) {
  await garantirTabelas();
  await sql().begin(async (tx) => {
    await tx`delete from historico where projeto = ${slug}`;
    await tx`delete from projetos where slug = ${slug}`;
  });
}

/**
 * Salva a nova versão e guarda a anterior no histórico (para poder desfazer).
 * Se `versaoEsperada` for informada e alguém tiver salvo depois dela, não salva e retorna false.
 */
export async function salvarProjeto(slug: string, dados: Dados, usuario: string, versaoEsperada?: string): Promise<boolean> {
  await garantirTabelas();
  return sql().begin(async (tx) => {
    const [atual] = await tx`select date_trunc('milliseconds', atualizado_em) as v from projetos where slug = ${slug} for update`;
    if (!atual) throw new Error("Projeto não encontrado.");
    if (versaoEsperada && new Date(atual.v).toISOString() !== versaoEsperada) return false;
    await tx`insert into historico (projeto, dados, salvo_em, salvo_por, substituido_por)
             select slug, dados, atualizado_em, atualizado_por, ${usuario} from projetos where slug = ${slug}`;
    await tx`update projetos set dados = ${tx.json(dados as never)}, atualizado_em = date_trunc('milliseconds', now()), atualizado_por = ${usuario}
             where slug = ${slug}`;
    await tx`delete from historico where projeto = ${slug} and id not in
             (select id from historico where projeto = ${slug} order by id desc limit 200)`;
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

export async function listarHistorico(slug: string, limite = 30): Promise<VersaoHistorico[]> {
  await garantirTabelas();
  const rows = await sql()`select id, salvo_em, salvo_por, substituido_em, substituido_por
                           from historico where projeto = ${slug} order by id desc limit ${limite}`;
  return rows.map((r) => ({
    id: r.id,
    salvoEm: new Date(r.salvo_em),
    salvoPor: r.salvo_por,
    substituidoEm: new Date(r.substituido_em),
    substituidoPor: r.substituido_por,
  }));
}

export async function lerVersao(slug: string, id: number): Promise<Dados | null> {
  await garantirTabelas();
  const [row] = await sql()`select dados from historico where id = ${id} and projeto = ${slug}`;
  return row ? validar(row.dados) : null;
}

// ---------------------------------------------------------------- acessos

const acesso = (r: Record<string, unknown>): Acesso => ({
  id: r.id as number,
  projeto: r.projeto as string,
  nome: r.nome as string,
  email: r.email as string,
  perfil: r.perfil as string,
  token: r.token as string,
  expiraEm: r.expira_em ? new Date(r.expira_em as string).toISOString().slice(0, 10) : "",
  revogado: r.revogado as boolean,
  criadoEm: new Date(r.criado_em as string),
  criadoPor: r.criado_por as string,
  ultimoAcesso: r.ultimo_acesso ? new Date(r.ultimo_acesso as string) : null,
});

export async function listarAcessos(slug: string): Promise<Acesso[]> {
  await garantirTabelas();
  const rows = await sql()`select * from acessos where projeto = ${slug} order by revogado, nome`;
  return rows.map(acesso);
}

export async function criarAcesso(
  slug: string,
  a: { nome: string; email: string; perfil: string; expiraEm: string },
  usuario: string,
) {
  await garantirTabelas();
  const token = randomBytes(24).toString("base64url");
  await sql()`insert into acessos (projeto, nome, email, perfil, token, expira_em, criado_por)
              values (${slug}, ${a.nome}, ${a.email}, ${a.perfil}, ${token}, ${a.expiraEm || null}, ${usuario})`;
}

export async function atualizarAcesso(id: number, slug: string, campos: { revogado?: boolean; expiraEm?: string; novoLink?: boolean }) {
  await garantirTabelas();
  const s = sql();
  if (campos.revogado !== undefined) await s`update acessos set revogado = ${campos.revogado} where id = ${id} and projeto = ${slug}`;
  if (campos.expiraEm !== undefined) await s`update acessos set expira_em = ${campos.expiraEm || null} where id = ${id} and projeto = ${slug}`;
  if (campos.novoLink) await s`update acessos set token = ${randomBytes(24).toString("base64url")} where id = ${id} and projeto = ${slug}`;
}

export async function excluirAcesso(id: number, slug: string) {
  await garantirTabelas();
  await sql()`delete from acessos where id = ${id} and projeto = ${slug}`;
}

/** Confere se o convite vale para o projeto (não revogado, dentro da validade) e registra o acesso. */
export async function validarConvite(slug: string, token: string | undefined | null): Promise<Acesso | null> {
  if (!token || token.length < 20 || token.length > 100) return null;
  await garantirTabelas();
  const [r] = await sql()`update acessos set ultimo_acesso = now()
                          where projeto = ${slug} and token = ${token} and not revogado
                            and (expira_em is null or expira_em >= current_date)
                          returning *`;
  return r ? acesso(r) : null;
}
