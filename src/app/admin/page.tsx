import { cookies } from "next/headers";
import { COOKIE, lerSessao, nomeExibicao } from "@/lib/auth";
import { lerPainel, listarHistorico } from "@/lib/db";
import Editor from "./Editor";
import { sair } from "./actions";

export const dynamic = "force-dynamic";

const quando = (d: Date) =>
  d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });

export default async function Admin() {
  const usuario = (await lerSessao((await cookies()).get(COOKIE)?.value)) ?? "";
  const [painel, historico] = await Promise.all([lerPainel(), listarHistorico()]);
  return (
    <>
      <div className="topo-admin">
        <div className="wrap">
          <b>Editar painel</b>
          <span className="dica" style={{ color: "#cfe0ff" }}>
            Última alteração: {quando(painel.atualizadoEm)} por {nomeExibicao(painel.atualizadoPor)}
          </span>
          <span className="esp" />
          <a href="/" target="_blank">Ver painel ↗</a>
          <span style={{ fontSize: 13 }}>Olá, {nomeExibicao(usuario)}</span>
          <form action={sair}><button className="btn cinza peq">Sair</button></form>
        </div>
      </div>
      <div className="wrap">
        <Editor
          inicial={painel.dados}
          versao={painel.atualizadoEm.toISOString()}
          historico={historico.map((h) => ({
            id: h.id,
            texto: `Versão de ${quando(h.salvoEm)} (${nomeExibicao(h.salvoPor)}) — substituída em ${quando(h.substituidoEm)} por ${nomeExibicao(h.substituidoPor)}`,
          }))}
        />
      </div>
    </>
  );
}
