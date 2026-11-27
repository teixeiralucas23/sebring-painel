"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE, MAX_AGE, criarSessao, iguais, lerSessao, usuarios } from "@/lib/auth";
import {
  PRINCIPAL, atualizarAcesso, atualizarInfoProjeto, criarAcesso, criarProjeto, excluirAcesso, excluirProjeto,
  lerProjeto, lerVersao, salvarProjeto, slugValido,
} from "@/lib/db";
import { validar } from "@/lib/validar";
import { modeloEmBranco } from "@/lib/modelo";
import type { Visibilidade } from "@/lib/types";

type Res = { ok: boolean; erro?: string };

async function exigirUsuario() {
  const usuario = await lerSessao((await cookies()).get(COOKIE)?.value);
  if (!usuario) throw new Error("Sessão expirada. Entre de novo.");
  return usuario;
}

async function tentar(fn: () => Promise<Res | void>): Promise<Res> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro inesperado." };
  }
}

function atualizarTelas(slug: string) {
  revalidatePath("/");
  revalidatePath(`/p/${slug}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/p/${slug}`);
  revalidatePath(`/admin/p/${slug}/acessos`);
}

const vis = (v: unknown): Visibilidade => (v === "publico" ? "publico" : "restrito");

export async function entrar(_: string | null, form: FormData): Promise<string | null> {
  const usuario = String(form.get("usuario") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const lista = usuarios();
  const certa = lista[usuario] ?? "";
  const ok = iguais(senha, certa) && usuario in lista;
  if (!ok) {
    await new Promise((r) => setTimeout(r, 800)); // freia tentativas de adivinhar senha
    return "Usuário ou senha incorretos.";
  }
  (await cookies()).set(COOKIE, await criarSessao(usuario), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE,
  });
  redirect("/admin");
}

export async function sair() {
  (await cookies()).delete(COOKIE);
  redirect("/admin/login");
}

// ---------------------------------------------------------------- dados do projeto

export async function salvar(slug: string, dados: unknown, versao: string): Promise<Res> {
  return tentar(async () => {
    const usuario = await exigirUsuario();
    const salvou = await salvarProjeto(slug, validar(dados), usuario, versao);
    if (!salvou)
      return { ok: false, erro: "Outra pessoa salvou alterações enquanto você editava. Copie o que mudou, recarregue a página (F5) e aplique de novo." };
    atualizarTelas(slug);
  });
}

export async function restaurar(slug: string, id: number): Promise<Res> {
  return tentar(async () => {
    const usuario = await exigirUsuario();
    const dados = await lerVersao(slug, id);
    if (!dados) return { ok: false, erro: "Versão não encontrada." };
    await salvarProjeto(slug, dados, usuario);
    atualizarTelas(slug);
  });
}

// ---------------------------------------------------------------- projetos

export async function novoProjeto(entrada: { nome: string; slug: string; visibilidade: string; copiarDe: string }): Promise<Res & { slug?: string }> {
  try {
    const usuario = await exigirUsuario();
    const nome = String(entrada.nome ?? "").trim().slice(0, 120);
    const slug = String(entrada.slug ?? "").trim().toLowerCase();
    if (!nome) return { ok: false, erro: "Dê um nome ao projeto." };
    if (!slugValido(slug)) return { ok: false, erro: "O link deve ter de 2 a 60 caracteres: letras minúsculas, números e hífens (ex.: 2201-sunrise-drive)." };
    let dados = modeloEmBranco(nome);
    if (entrada.copiarDe) {
      const origem = await lerProjeto(entrada.copiarDe);
      if (!origem) return { ok: false, erro: "Projeto de origem não encontrado." };
      dados = { ...structuredClone(origem.dados), projeto: { ...origem.dados.projeto, titulo: nome } };
    }
    const criou = await criarProjeto(slug, nome, vis(entrada.visibilidade), validar(dados), usuario);
    if (!criou) return { ok: false, erro: `Já existe um projeto com o link "${slug}". Escolha outro.` };
    revalidatePath("/admin");
    return { ok: true, slug };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao criar o projeto." };
  }
}

export async function salvarInfoProjeto(slug: string, nome: string, visibilidade: string): Promise<Res> {
  return tentar(async () => {
    await exigirUsuario();
    const n = String(nome ?? "").trim().slice(0, 120);
    if (!n) return { ok: false, erro: "O nome não pode ficar vazio." };
    await atualizarInfoProjeto(slug, n, vis(visibilidade));
    atualizarTelas(slug);
  });
}

export async function apagarProjeto(slug: string, confirmacao: string): Promise<Res> {
  return tentar(async () => {
    await exigirUsuario();
    if (slug === PRINCIPAL) return { ok: false, erro: "O projeto principal (página inicial do site) não pode ser excluído." };
    if (confirmacao.trim() !== slug) return { ok: false, erro: `Para confirmar, digite exatamente: ${slug}` };
    await excluirProjeto(slug);
    revalidatePath("/admin");
  });
}

// ---------------------------------------------------------------- acessos

const dataOk = (s: string) => s === "" || (/^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)));

export async function adicionarAcesso(slug: string, a: { nome: string; email: string; perfil: string; expiraEm: string; outros?: string[] }): Promise<Res> {
  return tentar(async () => {
    const usuario = await exigirUsuario();
    const nome = String(a.nome ?? "").trim().slice(0, 120);
    const email = String(a.email ?? "").trim().toLowerCase().slice(0, 200);
    const expiraEm = String(a.expiraEm ?? "");
    if (!nome) return { ok: false, erro: "Informe o nome da pessoa." };
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, erro: "E-mail inválido." };
    if (!dataOk(expiraEm)) return { ok: false, erro: "Data de validade inválida." };
    const projetos = [slug, ...(Array.isArray(a.outros) ? a.outros.map(String) : [])].filter((x, i, l) => l.indexOf(x) === i).slice(0, 50);
    if (projetos.length > 1 && !email) return { ok: false, erro: "Para convidar para mais de um projeto, informe o e-mail (é ele que junta os acessos num link só)." };
    for (const p of projetos) if (!(await lerProjeto(p))) return { ok: false, erro: "Projeto não encontrado." };
    for (const p of projetos) {
      await criarAcesso(p, { nome, email, perfil: String(a.perfil ?? "").slice(0, 60), expiraEm }, usuario);
      atualizarTelas(p);
    }
    atualizarTelas(slug);
  });
}

export async function alterarAcesso(slug: string, id: number, campos: { revogado?: boolean; expiraEm?: string; novoLink?: boolean }): Promise<Res> {
  return tentar(async () => {
    await exigirUsuario();
    if (campos.expiraEm !== undefined && !dataOk(campos.expiraEm)) return { ok: false, erro: "Data de validade inválida." };
    await atualizarAcesso(id, slug, {
      revogado: typeof campos.revogado === "boolean" ? campos.revogado : undefined,
      expiraEm: campos.expiraEm,
      novoLink: campos.novoLink === true,
    });
    atualizarTelas(slug);
  });
}

export async function removerAcesso(slug: string, id: number): Promise<Res> {
  return tentar(async () => {
    await exigirUsuario();
    await excluirAcesso(id, slug);
    atualizarTelas(slug);
  });
}
