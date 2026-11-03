import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, lerSessao } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();
  const usuario = await lerSessao(req.cookies.get(COOKIE)?.value);
  if (!usuario) return NextResponse.redirect(new URL("/admin/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
