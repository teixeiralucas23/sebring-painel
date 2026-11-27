import { nomeExibicao } from "@/lib/auth";
import { PRINCIPAL } from "@/lib/db";
import { sair } from "./actions";

/** Barra do admin com as abas: Projetos · <projeto>: Editar · Acessos. */
export default function Topo({ usuario, aba, projeto }: { usuario: string; aba: "projetos" | "editar" | "acessos"; projeto?: { slug: string; nome: string } }) {
  const ver = projeto ? (projeto.slug === PRINCIPAL ? "/" : `/p/${projeto.slug}`) : null;
  return (
    <div className="topo-admin" style={{ paddingBottom: 0 }}>
      <div className="wrap" style={{ flexDirection: "column", alignItems: "stretch", gap: 0 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <b>Administração</b>
          <span className="esp" style={{ flex: 1 }} />
          {ver && <a href={ver} target="_blank">Ver painel ↗</a>}
          <span style={{ fontSize: 13 }}>Olá, {nomeExibicao(usuario)}</span>
          <form action={sair}><button className="btn cinza peq">Sair</button></form>
        </div>
        <nav className="abas">
          <a href="/admin" className={aba === "projetos" ? "ativa" : ""}>Projetos</a>
          {projeto && (
            <>
              <span className="sep">›</span>
              <a href={`/admin/p/${projeto.slug}`} className={aba === "editar" ? "ativa" : ""}>{projeto.nome} — Editar</a>
              <a href={`/admin/p/${projeto.slug}/acessos`} className={aba === "acessos" ? "ativa" : ""}>Acessos</a>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
