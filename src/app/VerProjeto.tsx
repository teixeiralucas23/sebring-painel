import { notFound } from "next/navigation";
import { lerProjeto } from "@/lib/db";
import { permissao } from "@/lib/acesso";
import Painel from "./Painel";

/** Abre o painel de um projeto, conferindo quem pode ver. */
export default async function VerProjeto({ slug, conviteInvalido }: { slug: string; conviteInvalido?: boolean }) {
  const projeto = await lerProjeto(slug);
  if (!projeto) notFound();
  const perm = await permissao(projeto);

  if (!perm.ok)
    return (
      <div className="restrito-box">
        <div className="card">
          <h1 style={{ fontSize: 20, color: "#1f3864" }}>Acesso restrito</h1>
          <p style={{ margin: "12px 0", fontSize: 14 }}>
            {conviteInvalido
              ? "Este link de acesso não é válido: ele pode ter sido revogado ou ter passado da validade."
              : "Este painel é visível apenas para pessoas convidadas."}
          </p>
          <p className="dica">Peça um link de acesso a quem administra o projeto.</p>
        </div>
        <p className="dica" style={{ marginTop: 14 }}><a href="/admin/login">Sou administrador</a></p>
      </div>
    );

  return (
    <>
      {perm.admin && (
        <div className="barra-admin">
          <div className="wrap">
            <span>Você está vendo como administrador · {projeto.visibilidade === "publico" ? "projeto público" : "projeto restrito a convidados"}</span>
            <a href={`/admin/p/${slug}`}>Editar</a>
            <a href={`/admin/p/${slug}/acessos`}>Acessos</a>
            <a href="/admin">Todos os projetos</a>
          </div>
        </div>
      )}
      <Painel dados={projeto.dados} atualizadoEm={projeto.atualizadoEm} atualizadoPor={projeto.atualizadoPor} />
    </>
  );
}
