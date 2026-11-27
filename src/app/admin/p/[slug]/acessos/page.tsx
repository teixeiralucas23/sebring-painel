import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { COOKIE, lerSessao, nomeExibicao, usuarios } from "@/lib/auth";
import { PRINCIPAL, lerProjeto, listarAcessos, listarProjetos } from "@/lib/db";
import Topo from "../../../Topo";
import Acessos from "./Acessos";

export const dynamic = "force-dynamic";

export default async function PaginaAcessos({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const usuario = (await lerSessao((await cookies()).get(COOKIE)?.value)) ?? "";
  const projeto = await lerProjeto(slug);
  if (!projeto) notFound();
  const [acessos, todos] = await Promise.all([listarAcessos(slug), listarProjetos()]);
  const hoje = new Date().toISOString().slice(0, 10);
  return (
    <>
      <Topo usuario={usuario} aba="acessos" projeto={{ slug, nome: projeto.nome }} />
      <div className="wrap">
        <Acessos
          slug={slug}
          principal={slug === PRINCIPAL}
          nome={projeto.nome}
          visibilidade={projeto.visibilidade}
          admins={Object.keys(usuarios()).map(nomeExibicao)}
          hoje={hoje}
          outrosProjetos={todos.filter((p) => p.slug !== slug).map((p) => ({ slug: p.slug, nome: p.nome }))}
          acessos={acessos.map((a) => ({
            id: a.id, nome: a.nome, email: a.email, perfil: a.perfil, token: a.token, expiraEm: a.expiraEm, revogado: a.revogado,
            criado: `${a.criadoEm.toLocaleDateString("pt-BR", { timeZone: "America/New_York" })} por ${nomeExibicao(a.criadoPor)}`,
            ultimo: a.ultimoAcesso
              ? a.ultimoAcesso.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" })
              : "Nunca",
          }))}
        />
      </div>
    </>
  );
}
