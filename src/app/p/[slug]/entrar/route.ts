import { NextResponse, type NextRequest } from "next/server";
import { PRINCIPAL, validarConvite } from "@/lib/db";
import { cookieConvite } from "@/lib/acesso";

export const dynamic = "force-dynamic";

/** Link pessoal de convite: /p/<projeto>/entrar?k=<código>. Guarda o convite num cookie e abre o painel. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const token = req.nextUrl.searchParams.get("k") ?? "";
  const destino = slug === PRINCIPAL ? "/" : `/p/${slug}`;
  const convite = await validarConvite(slug, token);
  if (!convite) return NextResponse.redirect(new URL(`${destino}?convite=invalido`, req.url));
  const res = NextResponse.redirect(new URL(destino, req.url));
  res.cookies.set(cookieConvite(slug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 86400, // a validade real é conferida no banco a cada visita
  });
  return res;
}
