// Sessão assinada com HMAC (Web Crypto) — funciona no middleware e no servidor.
const enc = new TextEncoder();
const DIAS_SESSAO = 30;
export const COOKIE = "sebring_sessao";
export const MAX_AGE = DIAS_SESSAO * 86400;

function segredo() {
  const s = process.env.SESSION_SECRET ?? "";
  if (s.length < 32) throw new Error("SESSION_SECRET precisa ter pelo menos 32 caracteres. Veja o README.");
  return s;
}

/** ADMIN_USERS="lucas:senha1,tulio:senha2" */
export function usuarios(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const par of (process.env.ADMIN_USERS ?? "").split(",")) {
    const i = par.indexOf(":");
    if (i <= 0) continue;
    const nome = par.slice(0, i).trim().toLowerCase();
    const senha = par.slice(i + 1).trim();
    if (/^[a-z0-9_-]+$/.test(nome) && senha.length >= 8) out[nome] = senha;
  }
  return out;
}

export const nomeExibicao = (u: string) => u.charAt(0).toUpperCase() + u.slice(1);

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(msg: string) {
  const chave = await crypto.subtle.importKey("raw", enc.encode(segredo()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(new Uint8Array(await crypto.subtle.sign("HMAC", chave, enc.encode(msg))));
}

/** Comparação em tempo constante. */
export function iguais(a: string, b: string) {
  const x = enc.encode(a), y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export async function criarSessao(usuario: string) {
  const payload = `${usuario}.${Date.now() + MAX_AGE * 1000}`;
  return `${payload}.${await hmac(payload)}`;
}

export async function lerSessao(token: string | undefined | null): Promise<string | null> {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [usuario, exp, assinatura] = partes;
  try {
    if (!iguais(assinatura, await hmac(`${usuario}.${exp}`))) return null;
  } catch {
    return null;
  }
  if (!(Number(exp) > Date.now())) return null;
  if (!(usuario in usuarios())) return null; // usuário removido do ADMIN_USERS perde o acesso
  return usuario;
}
