import { cookies } from "next/headers";
import { COOKIE, lerSessao, nomeExibicao } from "@/lib/auth";
import { PRINCIPAL, listarProjetos } from "@/lib/db";
import { fmt, pct, resumo } from "@/lib/calc";
import Topo from "./Topo";
import NovoProjeto from "./NovoProjeto";

export const dynamic = "force-dynamic";

const quando = (d: Date) =>
  d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });

export default async function Projetos() {
  const usuario = (await lerSessao((await cookies()).get(COOKIE)?.value)) ?? "";
  const projetos = await listarProjetos();
  return (
    <>
      <Topo usuario={usuario} aba="projetos" />
      <div className="wrap">
        <h2>Projetos <span className="en">— {projetos.length} cadastrado{projetos.length === 1 ? "" : "s"}</span></h2>
        <div className="projetos">
          {projetos.map((p) => {
            const r = resumo(p.dados);
            const link = p.slug === PRINCIPAL ? "/" : `/p/${p.slug}`;
            return (
              <div className="card projeto" key={p.slug}>
                <h3>{p.nome}</h3>
                <div className="slug">sebring.vercel.app{link}{p.slug === PRINCIPAL ? " · página inicial" : ""}</div>
                <span className={"vis " + p.visibilidade}>
                  {p.visibilidade === "publico" ? "Público" : `Restrito · ${p.acessosAtivos} convidado${p.acessosAtivos === 1 ? "" : "s"} ativo${p.acessosAtivos === 1 ? "" : "s"}`}
                </span>
                <div className="mini" style={{ marginTop: 12 }}>
                  <div><span>Custo total</span><b>{fmt(r.custo)}</b></div>
                  <div><span>Lucro (base)</span><b className={r.lucro >= 0 ? "pos" : "neg"}>{fmt(r.lucro)}</b></div>
                  <div><span>ROE</span><b>{pct(r.roe)}</b></div>
                </div>
                <p className="dica" style={{ marginTop: 10 }}>Última alteração: {quando(p.atualizadoEm)} por {nomeExibicao(p.atualizadoPor)}</p>
                <div className="acoes">
                  <a className="btn" href={`/admin/p/${p.slug}`}>Editar</a>
                  <a className="btn cinza" href={`/admin/p/${p.slug}/acessos`}>Acessos</a>
                  <a className="btn cinza" href={link} target="_blank">Ver painel ↗</a>
                </div>
              </div>
            );
          })}
        </div>

        <h2>Novo projeto</h2>
        <NovoProjeto projetos={projetos.map((p) => ({ slug: p.slug, nome: p.nome }))} />
      </div>
    </>
  );
}
