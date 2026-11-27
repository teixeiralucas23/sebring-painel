import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { COOKIE, lerSessao, nomeExibicao } from "@/lib/auth";
import { PRINCIPAL, lerProjeto, listarHistorico } from "@/lib/db";
import Editor from "../../Editor";
import Topo from "../../Topo";

export const dynamic = "force-dynamic";

const quando = (d: Date) =>
  d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });

export default async function EditarProjeto({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const usuario = (await lerSessao((await cookies()).get(COOKIE)?.value)) ?? "";
  const projeto = await lerProjeto(slug);
  if (!projeto) notFound();
  const historico = await listarHistorico(slug);
  return (
    <>
      <Topo usuario={usuario} aba="editar" projeto={{ slug, nome: projeto.nome }} />
      <div className="wrap">
        <p className="dica" style={{ marginTop: 14 }}>
          Última alteração: {quando(projeto.atualizadoEm)} por {nomeExibicao(projeto.atualizadoPor)}
        </p>
        <Editor
          slug={slug}
          link={slug === PRINCIPAL ? "/" : `/p/${slug}`}
          inicial={projeto.dados}
          versao={projeto.atualizadoEm.toISOString()}
          historico={historico.map((h) => ({
            id: h.id,
            texto: `Versão de ${quando(h.salvoEm)} (${nomeExibicao(h.salvoPor)}) — substituída em ${quando(h.substituidoEm)} por ${nomeExibicao(h.substituidoPor)}`,
          }))}
        />
      </div>
    </>
  );
}
