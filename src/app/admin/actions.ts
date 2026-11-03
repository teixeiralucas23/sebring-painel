"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE, MAX_AGE, criarSessao, iguais, lerSessao, usuarios } from "@/lib/auth";
import { lerVersao, salvarPainel } from "@/lib/db";
import { validar } from "@/lib/validar";

async function exigirUsuario() {
  const usuario = await lerSessao((await cookies()).get(COOKIE)?.value);
  if (!usuario) throw new Error("Sessão expirada. Entre de novo.");
  return usuario;
}

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

export async function salvar(dados: unknown, versao: string): Promise<{ ok: boolean; erro?: string }> {
  try {
    const usuario = await exigirUsuario();
    const salvou = await salvarPainel(validar(dados), usuario, versao);
    if (!salvou)
      return { ok: false, erro: "Outra pessoa salvou alterações enquanto você editava. Copie o que mudou, recarregue a página (F5) e aplique de novo." };
    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao salvar." };
  }
}

export async function restaurar(id: number): Promise<{ ok: boolean; erro?: string }> {
  try {
    const usuario = await exigirUsuario();
    const dados = await lerVersao(id);
    if (!dados) return { ok: false, erro: "Versão não encontrada." };
    await salvarPainel(dados, usuario);
    revalidatePath("/");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, erro: e instanceof Error ? e.message : "Erro ao restaurar." };
  }
}
