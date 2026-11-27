"use client";
import { useEffect, useState, useTransition } from "react";
import { PERFIS_ACESSO, type Visibilidade } from "@/lib/types";
import { adicionarAcesso, alterarAcesso, apagarProjeto, removerAcesso, salvarInfoProjeto } from "../../../actions";

interface Linha {
  id: number; nome: string; email: string; perfil: string; token: string; expiraEm: string; revogado: boolean; criado: string; ultimo: string;
}

const dataBR = (s: string) => (s ? s.split("-").reverse().join("/") : "");

export default function Acessos(props: {
  slug: string; principal: boolean; nome: string; visibilidade: Visibilidade; admins: string[]; hoje: string; acessos: Linha[];
}) {
  const { slug, principal, admins, hoje, acessos } = props;
  const [pendente, start] = useTransition();
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [origem, setOrigem] = useState("");
  useEffect(() => setOrigem(window.location.origin), []);

  // configuração do projeto
  const [nome, setNome] = useState(props.nome);
  const [vis, setVis] = useState<Visibilidade>(props.visibilidade);
  const infoMudou = nome !== props.nome || vis !== props.visibilidade;

  // novo convite
  const [novo, setNovo] = useState({ nome: "", email: "", perfil: "Investidor", expiraEm: "" });

  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>, ok?: string, depois?: () => void) =>
    start(async () => {
      setMsg(null);
      const r = await fn();
      if (r.ok) { if (ok) setMsg({ tipo: "ok", texto: ok }); depois?.(); }
      else setMsg({ tipo: "erro", texto: r.erro ?? "Erro." });
    });

  const link = (t: string) => `${origem}/p/${slug}/entrar?k=${t}`;
  const status = (a: Linha) => (a.revogado ? "Revogado" : a.expiraEm && a.expiraEm < hoje ? "Expirado" : "Ativo");

  async function copiar(a: Linha) {
    try {
      await navigator.clipboard.writeText(link(a.token));
      setMsg({ tipo: "ok", texto: `Link de ${a.nome} copiado. Envie só para essa pessoa.` });
    } catch {
      prompt("Copie o link:", link(a.token));
    }
  }
  const mailto = (a: Linha) =>
    `mailto:${encodeURIComponent(a.email)}?subject=${encodeURIComponent(`Acesso ao painel — ${props.nome}`)}&body=${encodeURIComponent(
      `Olá ${a.nome},\n\nSegue o seu link pessoal de acesso ao painel do projeto ${props.nome}:\n\n${link(a.token)}\n\nO link é individual, por favor não compartilhe.`,
    )}`;

  const ativos = acessos.filter((a) => status(a) === "Ativo").length;
  const [confirmacao, setConfirmacao] = useState("");

  return (
    <div style={{ paddingBottom: 40 }}>
      {msg && <div className={msg.tipo} style={{ marginTop: 18 }}>{msg.texto}</div>}

      <h2>Quem pode ver este projeto</h2>
      <div className="card">
        <div className="campos" style={{ gridTemplateColumns: "1fr" }}>
          <div className="campo">
            <label>Nome do projeto</label>
            <input className="in" value={nome} onChange={(e) => setNome(e.target.value)} style={{ maxWidth: 420 }} />
          </div>
        </div>
        <div className="grid g2" style={{ marginTop: 14 }}>
          <label className={"opcao" + (vis === "restrito" ? " on" : "")}>
            <input type="radio" checked={vis === "restrito"} onChange={() => setVis("restrito")} />
            <span><b>Só convidados</b><small>Apenas quem recebeu um link pessoal (abaixo) consegue abrir o painel. Você pode revogar a qualquer momento.</small></span>
          </label>
          <label className={"opcao" + (vis === "publico" ? " on" : "")}>
            <input type="radio" checked={vis === "publico"} onChange={() => setVis("publico")} />
            <span><b>Qualquer pessoa com o link</b><small>O endereço {principal ? "da página inicial" : `/p/${slug}`} abre para qualquer um. Os convites ficam guardados para quando você restringir.</small></span>
          </label>
        </div>
        <p className="dica" style={{ marginTop: 12 }}>
          Administradores sempre veem e editam todos os projetos: <b>{admins.join(", ") || "—"}</b>. Para incluir ou tirar um administrador, altere <code>ADMIN_USERS</code> na Vercel.
        </p>
        <button className="btn" style={{ marginTop: 12 }} disabled={!infoMudou || pendente}
          onClick={() => rodar(() => salvarInfoProjeto(slug, nome, vis), "Configuração salva.")}>
          Salvar configuração
        </button>
      </div>

      <h2>Convidados <span className="en">— {ativos} com acesso ativo</span></h2>
      <div className="card">
        {acessos.length === 0 && <p className="dica" style={{ marginBottom: 12 }}>Ninguém convidado ainda.</p>}
        {acessos.length > 0 && (
          <div className="scroll" style={{ marginBottom: 16 }}>
            <table className="ed" style={{ minWidth: 980 }}>
              <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th style={{ width: 150 }}>Válido até</th><th>Último acesso</th><th className="c">Status</th><th>Ações</th></tr></thead>
              <tbody>
                {acessos.map((a) => {
                  const st = status(a);
                  return (
                    <tr key={a.id} style={st !== "Ativo" ? { opacity: 0.6 } : undefined}>
                      <td><b>{a.nome}</b><div className="dica">criado em {a.criado}</div></td>
                      <td>{a.email || "—"}</td>
                      <td>{a.perfil || "—"}</td>
                      <td>
                        <input className="in" type="date" defaultValue={a.expiraEm} title="Deixe vazio para não expirar"
                          onBlur={(e) => e.target.value !== a.expiraEm && rodar(() => alterarAcesso(slug, a.id, { expiraEm: e.target.value }), "Validade atualizada.")} />
                      </td>
                      <td style={{ fontSize: 12 }}>{a.ultimo}</td>
                      <td className="c"><span className={"pill " + (st === "Ativo" ? "p-ok" : "p-next")}>{st}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {!a.revogado && <button className="btn peq" onClick={() => copiar(a)}>Copiar link</button>}
                          {!a.revogado && a.email && <a className="btn cinza peq" href={mailto(a)} style={{ textDecoration: "none" }}>E-mail</a>}
                          {a.revogado
                            ? <button className="btn cinza peq" disabled={pendente} onClick={() => rodar(() => alterarAcesso(slug, a.id, { revogado: false }), `Acesso de ${a.nome} reativado.`)}>Reativar</button>
                            : <button className="btn x" disabled={pendente} onClick={() => confirm(`Revogar o acesso de ${a.nome}? O link para de funcionar na hora.`) && rodar(() => alterarAcesso(slug, a.id, { revogado: true }), `Acesso de ${a.nome} revogado.`)}>Revogar</button>}
                          <button className="btn cinza peq" disabled={pendente} title="Gera um link novo; o antigo para de funcionar"
                            onClick={() => confirm(`Gerar um link novo para ${a.nome}? O link atual deixa de funcionar.`) && rodar(() => alterarAcesso(slug, a.id, { novoLink: true }), "Link novo gerado. Copie e envie de novo.")}>Novo link</button>
                          <button className="btn x" disabled={pendente} title="Excluir"
                            onClick={() => confirm(`Excluir ${a.nome} da lista?`) && rodar(() => removerAcesso(slug, a.id), "Convidado excluído.")}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <b style={{ fontSize: 13, color: "#1f3864" }}>Convidar pessoa</b>
        <div className="campos" style={{ marginTop: 8 }}>
          <div className="campo"><label>Nome</label><input className="in" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} /></div>
          <div className="campo"><label>E-mail (opcional)</label><input className="in" type="email" value={novo.email} onChange={(e) => setNovo({ ...novo, email: e.target.value })} /></div>
          <div className="campo">
            <label>Perfil</label>
            <select className="in" value={novo.perfil} onChange={(e) => setNovo({ ...novo, perfil: e.target.value })}>
              {PERFIS_ACESSO.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="campo"><label>Válido até (opcional)</label><input className="in" type="date" min={hoje} value={novo.expiraEm} onChange={(e) => setNovo({ ...novo, expiraEm: e.target.value })} /><small>Vazio = sem prazo</small></div>
        </div>
        <button className="btn verde" style={{ marginTop: 12 }} disabled={!novo.nome.trim() || pendente}
          onClick={() => rodar(() => adicionarAcesso(slug, novo), `${novo.nome} convidado. Use "Copiar link" para enviar.`, () => setNovo({ nome: "", email: "", perfil: "Investidor", expiraEm: "" }))}>
          + Gerar link de acesso
        </button>
        <p className="dica" style={{ marginTop: 12 }}>
          Cada pessoa recebe um link pessoal que abre só este projeto, apenas para visualização. Ao revogar, a pessoa perde o acesso imediatamente.
          {vis === "publico" && " Atenção: com o projeto público, qualquer pessoa com o endereço consegue ver, com ou sem convite."}
        </p>
      </div>

      {!principal && (
        <>
          <h2>Excluir projeto</h2>
          <div className="card">
            <p className="dica" style={{ marginBottom: 10 }}>Apaga o projeto, o histórico de versões e todos os convites. Não dá para desfazer. Para confirmar, digite <b>{slug}</b>.</p>
            <div style={{ display: "flex", gap: 8, maxWidth: 520 }}>
              <input className="in" value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} placeholder={slug} />
              <button className="btn x" disabled={confirmacao !== slug || pendente}
                onClick={() => rodar(() => apagarProjeto(slug, confirmacao), undefined, () => (window.location.href = "/admin"))}>Excluir</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
