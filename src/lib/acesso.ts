import "server-only";
import { cookies } from "next/headers";
import { COOKIE, lerSessao } from "./auth";
import { projetosVisiveis, validarConvite, type Projeto } from "./db";

/** Cookie com o convite de um projeto (um por projeto). */
export const cookieConvite = (slug: string) => `conv_${slug}`;

export type Permissao =
  | { ok: true; admin: string | null; convidado: string | null }
  | { ok: false };

/** Administradores (ADMIN_USERS) veem tudo; projeto público é aberto; projeto restrito exige convite válido. */
export async function permissao(projeto: Projeto): Promise<Permissao> {
  const jar = await cookies();
  const admin = await lerSessao(jar.get(COOKIE)?.value);
  if (admin) return { ok: true, admin, convidado: null };
  if (projeto.visibilidade === "publico") return { ok: true, admin: null, convidado: null };
  const convite = await validarConvite(projeto.slug, jar.get(cookieConvite(projeto.slug))?.value);
  return convite ? { ok: true, admin: null, convidado: convite.nome } : { ok: false };
}

/** Projetos que quem está visitando pode abrir (abas no topo do painel). */
export async function abasDoVisitante() {
  const jar = await cookies();
  const admin = !!(await lerSessao(jar.get(COOKIE)?.value));
  const tokens: Record<string, string> = {};
  for (const c of jar.getAll()) if (c.name.startsWith("conv_")) tokens[c.name.slice(5)] = c.value;
  return projetosVisiveis(admin, tokens);
}
