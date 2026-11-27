import { notFound } from "next/navigation";
import { PRINCIPAL, lerProjeto } from "@/lib/db";
import { abasDoVisitante, permissao } from "@/lib/acesso";
import Painel from "./Painel";

/** Abre o painel de um projeto, conferindo quem pode ver. */
export default async function VerProjeto({ slug, conviteInvalido }: { slug: string; conviteInvalido?: boolean }) {
  const projeto = await lerProjeto(slug);
  if (!projeto) notFound();
  const [perm, abas] = await Promise.all([permissao(projeto), abasDoVisitante()]);
  const nav = abas.length > 1 && (
    <nav className="abas-projetos">
      <div className="wrap">
        {abas.map((a) => (
          <a key={a.slug} href={a.slug === PRINCIPAL ? "/" : `/p/${a.slug}`} className={a.slug === slug ? "ativa" : ""}>{a.nome}</a>
        ))}
      </div>
    </nav>
  );

  if (!perm.ok)
    return (
      <>
      {nav}
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
      </>
    );

  return (
    <>
      {nav}
      <Painel dados={projeto.dados} atualizadoEm={projeto.atualizadoEm} atualizadoPor={projeto.atualizadoPor} />
    </>
  );
}
