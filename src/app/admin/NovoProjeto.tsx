"use client";
import { useState, useTransition } from "react";
import { novoProjeto } from "./actions";

const paraSlug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export default function NovoProjeto({ projetos }: { projetos: { slug: string; nome: string }[] }) {
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [visibilidade, setVisibilidade] = useState("restrito");
  const [copiarDe, setCopiarDe] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, start] = useTransition();
  const s = slugManual ? slug : paraSlug(nome);

  function criar() {
    setErro(null);
    start(async () => {
      const r = await novoProjeto({ nome, slug: s, visibilidade, copiarDe });
      if (r.ok && r.slug) window.location.href = `/admin/p/${r.slug}`;
      else setErro(r.erro ?? "Erro ao criar.");
    });
  }

  return (
    <div className="card">
      <div className="campos">
        <div className="campo">
          <label>Nome do projeto</label>
          <input className="in" value={nome} placeholder="Ex.: 2210 Lakeview Drive" onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="campo">
          <label>Link</label>
          <input className="in" value={s} onChange={(e) => { setSlugManual(true); setSlug(e.target.value.toLowerCase()); }} />
          <small>sebring.vercel.app/p/{s || "…"}</small>
        </div>
        <div className="campo">
          <label>Começar com</label>
          <select className="in" value={copiarDe} onChange={(e) => setCopiarDe(e.target.value)}>
            <option value="">Projeto em branco (1 casa)</option>
            {projetos.map((p) => <option key={p.slug} value={p.slug}>Cópia de: {p.nome}</option>)}
          </select>
          <small>A cópia traz premissas, lançamentos e cenários. Os acessos não são copiados.</small>
        </div>
        <div className="campo">
          <label>Quem pode ver</label>
          <select className="in" value={visibilidade} onChange={(e) => setVisibilidade(e.target.value)}>
            <option value="restrito">Só convidados</option>
            <option value="publico">Qualquer pessoa com o link</option>
          </select>
        </div>
      </div>
      {erro && <div className="erro" style={{ marginTop: 12 }}>{erro}</div>}
      <button className="btn verde" style={{ marginTop: 14 }} disabled={!nome.trim() || pendente} onClick={criar}>
        {pendente ? "Criando…" : "Criar projeto"}
      </button>
    </div>
  );
}
