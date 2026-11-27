"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Ativo, Cenario, Dados, Lancamento, Risco, Socio, Status } from "@/lib/types";
import { CATEGORIAS_ATIVO, STATUS_LABEL } from "@/lib/types";
import { fmt, pct, resumo, resumoAtivos } from "@/lib/calc";
import { restaurar, salvar } from "./actions";

const STATUS = Object.keys(STATUS_LABEL) as Status[];

/** Campo numérico que aceita apagar/digitar livremente e só repassa números válidos. */
function Num({ value, onChange, step = 1, style }: { value: number; onChange: (n: number) => void; step?: number; style?: React.CSSProperties }) {
  const [txt, setTxt] = useState(String(value));
  useEffect(() => {
    if (Number(txt) !== value) setTxt(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      className="in" type="number" step={step} value={txt} style={style}
      onChange={(e) => {
        setTxt(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value !== "" && Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => { if (txt === "" || !Number.isFinite(Number(txt))) { setTxt("0"); onChange(0); } }}
    />
  );
}

function Campo({ label, dica, largo, children }: { label: string; dica?: string; largo?: boolean; children: React.ReactNode }) {
  return (
    <div className={"campo" + (largo ? " largo" : "")}>
      <label>{label}</label>
      {children}
      {dica && <small>{dica}</small>}
    </div>
  );
}

const hoje = () => new Date().toISOString().slice(0, 10);
const novoId = () => "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export default function Editor({ slug, link, inicial, versao, historico }: { slug: string; link: string; inicial: Dados; versao: string; historico: { id: number; texto: string }[] }) {
  const [d, setD] = useState<Dados>(inicial);
  const [salvo, setSalvo] = useState<string>(JSON.stringify(inicial));
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [pendente, start] = useTransition();
  const sujo = JSON.stringify(d) !== salvo;
  const r = useMemo(() => resumo(d), [d]);
  const at = useMemo(() => resumoAtivos(d), [d]);

  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => { if (sujo) e.preventDefault(); };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sujo]);

  // atualizadores
  const set = <K extends keyof Dados>(k: K, v: Dados[K]) => setD((x) => ({ ...x, [k]: v }));
  const proj = (k: keyof Dados["projeto"], v: string) => set("projeto", { ...d.projeto, [k]: v });
  const prem = <K extends keyof Dados["premissas"]>(k: K, v: Dados["premissas"][K]) => set("premissas", { ...d.premissas, [k]: v });
  function editarLista<T>(k: "socios" | "lancamentos" | "cenarios" | "riscos" | "ativos", i: number, campo: keyof T, v: unknown) {
    const lista = [...(d[k] as unknown as T[])];
    lista[i] = { ...lista[i], [campo]: v };
    set(k, lista as never);
  }
  const remover = (k: "socios" | "lancamentos" | "cenarios" | "riscos" | "ativos", i: number) => set(k, (d[k] as unknown[]).filter((_, j) => j !== i) as never);

  function onSalvar() {
    setMsg(null);
    const ordenado = { ...d, lancamentos: [...d.lancamentos].sort((a, b) => a.data.localeCompare(b.data)) };
    start(async () => {
      const res = await salvar(slug, ordenado, versao);
      if (res.ok) {
        setD(ordenado);
        setSalvo(JSON.stringify(ordenado));
        setMsg({ tipo: "ok", texto: "Salvo! O painel já está atualizado." });
      } else setMsg({ tipo: "erro", texto: res.erro ?? "Erro ao salvar." });
    });
  }

  function onRestaurar(id: number, texto: string) {
    if (!confirm(`Voltar o painel para esta versão?\n\n${texto}\n\nA versão atual fica guardada no histórico.`)) return;
    start(async () => {
      const res = await restaurar(slug, id);
      if (res.ok) { setSalvo(JSON.stringify(d)); window.location.reload(); }
      else setMsg({ tipo: "erro", texto: res.erro ?? "Erro ao restaurar." });
    });
  }

  const p = d.premissas;
  const L = d.lancamentos;

  return (
    <div style={{ paddingBottom: 90 }}>
      <h2>Resultado com os dados abaixo <span className="en">— atualiza enquanto você digita</span></h2>
      <div className="card">
        <div className="mini">
          <div><span>Lucro líquido</span><b className={r.lucro >= 0 ? "pos" : "neg"}>{fmt(r.lucro)}</b></div>
          <div><span>Margem</span><b>{pct(r.margem)}</b></div>
          <div><span>ROE</span><b>{pct(r.roe)}</b></div>
          <div><span>Custo total</span><b>{fmt(r.custo)}</b></div>
          <div><span>Juros</span><b>{fmt(r.juros)}</b></div>
          <div><span>Equity total</span><b>{fmt(r.m.equityTotal)}</b></div>
          <div><span>Já aportado</span><b>{fmt(r.jaAportado)}</b></div>
          <div><span>Break-even/casa</span><b>{fmt(r.m.breakeven(p.diasMercado))}</b></div>
        </div>
        {r.avisos.length > 0 && (
          <div className="avisos" style={{ marginTop: 14 }}>
            <b>Atenção:</b>
            <ul>{r.avisos.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        )}
      </div>

      <h2>Lançamentos <span className="en">— aportes, liberações do empréstimo, pagamentos e marcos</span></h2>
      <div className="card">
        <p className="dica" style={{ marginBottom: 10 }}>
          Valores do projeto inteiro ({p.casas} casas). <b>Aporte</b> = dinheiro dos sócios. <b>Empréstimo</b> = liberação do hard money (os juros
          contam a partir desta data). <b>Saídas</b> = pagamentos. A listagem e a venda são criadas automaticamente pelas premissas. Para um marco
          sem valor (ex.: CO), deixe tudo em 0 e use status &quot;Marco&quot;.
        </p>
        <div className="scroll">
          <table className="ed" style={{ minWidth: 860 }}>
            <thead><tr><th style={{ width: 140 }}>Data</th><th>Descrição</th><th style={{ width: 130 }}>Status</th><th style={{ width: 115 }}>Aporte</th><th style={{ width: 115 }}>Empréstimo</th><th style={{ width: 115 }}>Saídas</th><th style={{ width: 40 }}></th></tr></thead>
            <tbody>
              {L.map((l, i) => (
                <tr key={l.id}>
                  <td><input className="in" type="date" value={l.data} onChange={(e) => e.target.value && editarLista<Lancamento>("lancamentos", i, "data", e.target.value)} /></td>
                  <td><input className="in" value={l.descricao} onChange={(e) => editarLista<Lancamento>("lancamentos", i, "descricao", e.target.value)} /></td>
                  <td>
                    <select className="in" value={l.status} onChange={(e) => editarLista<Lancamento>("lancamentos", i, "status", e.target.value)}>
                      {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                    </select>
                  </td>
                  <td><Num value={l.aporte} step={100} onChange={(v) => editarLista<Lancamento>("lancamentos", i, "aporte", v)} /></td>
                  <td><Num value={l.emprestimo} step={100} onChange={(v) => editarLista<Lancamento>("lancamentos", i, "emprestimo", v)} /></td>
                  <td><Num value={l.saidas} step={100} onChange={(v) => editarLista<Lancamento>("lancamentos", i, "saidas", v)} /></td>
                  <td><button className="btn x" title="Remover" onClick={() => confirm(`Remover "${l.descricao}"?`) && remover("lancamentos", i)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn cinza" style={{ marginTop: 12 }} onClick={() => set("lancamentos", [...L, { id: novoId(), data: hoje(), descricao: "", status: "programado", aporte: 0, emprestimo: 0, saidas: 0 }])}>+ Adicionar lançamento</button>
      </div>

      <h2>Premissas <span className="en">— valores por casa, salvo indicação</span></h2>
      <div className="card campos">
        <Campo label="Preço de venda (por casa)"><Num value={p.precoVenda} step={1000} onChange={(v) => prem("precoVenda", v)} /></Campo>
        <Campo label="Dias no mercado" dica="Da listagem até o fechamento"><Num value={p.diasMercado} onChange={(v) => prem("diasMercado", v)} /></Campo>
        <Campo label="Data da listagem"><input className="in" type="date" value={p.dataListagem} onChange={(e) => e.target.value && prem("dataListagem", e.target.value)} /></Campo>
        <Campo label="Preço de lista (por casa)"><Num value={p.precoLista} step={1000} onChange={(v) => prem("precoLista", v)} /></Campo>
        <Campo label="Status da venda">
          <select className="in" value={p.statusVenda} onChange={(e) => prem("statusVenda", e.target.value as Status)}>
            {STATUS.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </Campo>
        <Campo label="Número de casas"><Num value={p.casas} onChange={(v) => prem("casas", v)} /></Campo>
        <Campo label="Lote (por casa)"><Num value={p.lote} step={100} onChange={(v) => prem("lote", v)} /></Campo>
        <Campo label="Construção (por casa)" dica="Contrato com a construtora"><Num value={p.construcao} step={100} onChange={(v) => prem("construcao", v)} /></Campo>
        <Campo label="Área (sq ft por casa)"><Num value={p.areaSqft} onChange={(v) => prem("areaSqft", v)} /></Campo>
        <Campo label="Gestão da obra (por casa)"><Num value={p.gestao} step={100} onChange={(v) => prem("gestao", v)} /></Campo>
        <Campo label="Abertura da empresa (total)"><Num value={p.aberturaEmpresa} step={100} onChange={(v) => prem("aberturaEmpresa", v)} /></Campo>
        <Campo label="Taxas do empréstimo (por casa)" dica="Pontos e fees do hard money"><Num value={p.taxasEmprestimo} step={100} onChange={(v) => prem("taxasEmprestimo", v)} /></Campo>
        <Campo label="Outros custos (por casa)"><Num value={p.outros} step={100} onChange={(v) => prem("outros", v)} /></Campo>
        <Campo label="Juros (% ao ano)" dica="Use 0 se os juros já estão nas taxas"><Num value={p.jurosAnual} step={0.25} onChange={(v) => prem("jurosAnual", v)} /></Campo>
        <Campo label="Closing costs na venda (%)"><Num value={p.closing} step={0.25} onChange={(v) => prem("closing", v)} /></Campo>
      </div>

      <h2>Sócios</h2>
      <div className="card">
        {d.socios.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input className="in" value={s.nome} placeholder="Nome" onChange={(e) => editarLista<Socio>("socios", i, "nome", e.target.value)} />
            <div style={{ width: 110 }}><Num value={s.percentual} step={0.5} onChange={(v) => editarLista<Socio>("socios", i, "percentual", v)} /></div>
            <span style={{ alignSelf: "center" }}>%</span>
            <button className="btn x" onClick={() => confirm(`Remover ${s.nome}?`) && remover("socios", i)}>✕</button>
          </div>
        ))}
        <button className="btn cinza" onClick={() => set("socios", [...d.socios, { nome: "", percentual: 0 }])}>+ Adicionar sócio</button>
      </div>

      <h2>Cenários <span className="en">— o cenário BASE vem das premissas</span></h2>
      <div className="card">
        {d.cenarios.map((c, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 2fr 130px 90px auto", gap: 8, marginBottom: 8 }}>
            <input className="in" value={c.nome} placeholder="Nome" onChange={(e) => editarLista<Cenario>("cenarios", i, "nome", e.target.value)} />
            <input className="in" value={c.descricao} placeholder="Descrição" onChange={(e) => editarLista<Cenario>("cenarios", i, "descricao", e.target.value)} />
            <Num value={c.preco} step={1000} onChange={(v) => editarLista<Cenario>("cenarios", i, "preco", v)} />
            <Num value={c.dias} step={5} onChange={(v) => editarLista<Cenario>("cenarios", i, "dias", v)} />
            <button className="btn x" onClick={() => remover("cenarios", i)}>✕</button>
          </div>
        ))}
        <p className="dica">Colunas: nome · descrição · preço por casa · dias no mercado</p>
        <button className="btn cinza" style={{ marginTop: 8 }} onClick={() => set("cenarios", [...d.cenarios, { nome: "", descricao: "", preco: p.precoVenda, dias: p.diasMercado }])}>+ Adicionar cenário</button>
      </div>

      <h2>Tabela de sensibilidade</h2>
      <div className="card campos">
        <Campo label="Preço mínimo"><Num value={d.sensibilidade.precoMin} step={1000} onChange={(v) => set("sensibilidade", { ...d.sensibilidade, precoMin: v })} /></Campo>
        <Campo label="Preço máximo"><Num value={d.sensibilidade.precoMax} step={1000} onChange={(v) => set("sensibilidade", { ...d.sensibilidade, precoMax: v })} /></Campo>
        <Campo label="Passo"><Num value={d.sensibilidade.passo} step={500} onChange={(v) => set("sensibilidade", { ...d.sensibilidade, passo: v })} /></Campo>
        <Campo label="Colunas de dias" dica="Separados por vírgula">
          <input className="in" defaultValue={d.sensibilidade.dias.join(", ")} onChange={(e) => {
            const dias = e.target.value.split(/[,;\s]+/).map(Number).filter((n) => Number.isFinite(n) && n > 0);
            if (dias.length) set("sensibilidade", { ...d.sensibilidade, dias });
          }} />
        </Campo>
      </div>

      <h2>Outros ativos <span className="en">— bolsas, joias, relógios, barcos, arte, ouro, colecionáveis · não entram no lucro do projeto</span></h2>
      <div className="card">
        <div className="mini" style={{ marginBottom: 12 }}>
          <div><span>Valor atual</span><b>{fmt(at.total)}</b></div>
          <div><span>Custo</span><b>{fmt(at.custo)}</b></div>
          <div><span>Valorização</span><b className={at.valorizacao >= 0 ? "pos" : "neg"}>{fmt(at.valorizacao)}</b></div>
          <div><span>Itens</span><b>{d.ativos.length}</b></div>
        </div>
        {d.ativos.length === 0 && <p className="dica" style={{ marginBottom: 10 }}>Nenhum ativo cadastrado. A seção só aparece no painel quando houver pelo menos um item.</p>}
        {d.ativos.length > 0 && (
          <div className="scroll">
            <table className="ed" style={{ minWidth: 1100 }}>
              <thead><tr><th>Item</th><th style={{ width: 160 }}>Categoria</th><th style={{ width: 150 }}>Dono</th><th style={{ width: 140 }}>Aquisição</th><th style={{ width: 115 }}>Custo</th><th style={{ width: 115 }}>Valor atual</th><th>Observação</th><th style={{ width: 40 }}></th></tr></thead>
              <tbody>
                {d.ativos.map((a, i) => (
                  <tr key={a.id}>
                    <td><input className="in" value={a.nome} placeholder="Ex.: Rolex Submariner" onChange={(e) => editarLista<Ativo>("ativos", i, "nome", e.target.value)} /></td>
                    <td>
                      <select className="in" value={a.categoria} onChange={(e) => editarLista<Ativo>("ativos", i, "categoria", e.target.value)}>
                        {CATEGORIAS_ATIVO.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td><input className="in" value={a.dono} list="donos" placeholder="Sócio / empresa" onChange={(e) => editarLista<Ativo>("ativos", i, "dono", e.target.value)} /></td>
                    <td><input className="in" type="date" value={a.dataAquisicao} onChange={(e) => editarLista<Ativo>("ativos", i, "dataAquisicao", e.target.value)} /></td>
                    <td><Num value={a.custo} step={100} onChange={(v) => editarLista<Ativo>("ativos", i, "custo", v)} /></td>
                    <td><Num value={a.valorAtual} step={100} onChange={(v) => editarLista<Ativo>("ativos", i, "valorAtual", v)} /></td>
                    <td><input className="in" value={a.observacao} placeholder="Nº de série, certificado, onde está…" onChange={(e) => editarLista<Ativo>("ativos", i, "observacao", e.target.value)} /></td>
                    <td><button className="btn x" title="Remover" onClick={() => confirm(`Remover "${a.nome || "este item"}"?`) && remover("ativos", i)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <datalist id="donos">
              {["OPD Development LLC", ...d.socios.map((s) => s.nome)].map((n) => <option key={n} value={n} />)}
            </datalist>
          </div>
        )}
        <button className="btn cinza" style={{ marginTop: 12 }} onClick={() => set("ativos", [...d.ativos, { id: "a" + Date.now().toString(36), nome: "", categoria: "Bolsas", dono: "", dataAquisicao: "", custo: 0, valorAtual: 0, observacao: "" }])}>+ Adicionar ativo</button>
      </div>

      <h2>Diferenciais do imóvel <span className="en">— aparecem no painel quando houver pelo menos um</span></h2>
      <div className="card">
        {d.destaques.map((x, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input className="in" value={x} placeholder="Ex.: Piso porcelanato" onChange={(e) => set("destaques", d.destaques.map((y, j) => (j === i ? e.target.value : y)))} />
            <button className="btn x" onClick={() => set("destaques", d.destaques.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button className="btn cinza" onClick={() => set("destaques", [...d.destaques, ""])}>+ Adicionar diferencial</button>
      </div>

      <h2>Riscos</h2>
      <div className="card">
        <p className="dica" style={{ marginBottom: 10 }}>Os textos dos riscos não se recalculam sozinhos — revise os números citados quando as premissas mudarem.</p>
        {d.riscos.map((x, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 3fr auto", gap: 8, marginBottom: 8 }}>
            <input className="in" value={x.titulo} placeholder="Título" onChange={(e) => editarLista<Risco>("riscos", i, "titulo", e.target.value)} />
            <textarea className="in" value={x.texto} onChange={(e) => editarLista<Risco>("riscos", i, "texto", e.target.value)} />
            <button className="btn x" style={{ alignSelf: "start" }} onClick={() => remover("riscos", i)}>✕</button>
          </div>
        ))}
        <button className="btn cinza" onClick={() => set("riscos", [...d.riscos, { titulo: "", texto: "" }])}>+ Adicionar risco</button>
      </div>

      <h2>Textos do painel</h2>
      <div className="card campos">
        <Campo label="Título" largo><input className="in" value={d.projeto.titulo} onChange={(e) => proj("titulo", e.target.value)} /></Campo>
        <Campo label="Subtítulo" largo><input className="in" value={d.projeto.descricao} onChange={(e) => proj("descricao", e.target.value)} /></Campo>
        <Campo label="Construtora"><input className="in" value={d.projeto.construtora} onChange={(e) => proj("construtora", e.target.value)} /></Campo>
        <Campo label="Rodapé" largo><textarea className="in" value={d.projeto.rodape} onChange={(e) => proj("rodape", e.target.value)} /></Campo>
      </div>

      <h2>Histórico <span className="en">— cada vez que alguém salva, a versão anterior fica guardada aqui</span></h2>
      <div className="card">
        {historico.length === 0 && <p className="dica">Nenhuma alteração salva ainda.</p>}
        {historico.map((h) => (
          <div key={h.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid #eef1f6", fontSize: 13 }}>
            <span style={{ flex: 1 }}>{h.texto}</span>
            <button className="btn cinza peq" disabled={pendente} onClick={() => onRestaurar(h.id, h.texto)}>Restaurar</button>
          </div>
        ))}
      </div>

      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, background: "#fff", borderTop: "1px solid #d3dae6", boxShadow: "0 -4px 14px rgba(20,35,70,.08)", zIndex: 30 }}>
        <div className="wrap" style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 20px", flexWrap: "wrap" }}>
          {msg ? <div className={msg.tipo} style={{ flex: 1 }}>{msg.texto}</div> : <span className="dica" style={{ flex: 1 }}>{sujo ? "Você tem alterações não salvas." : "Nenhuma alteração pendente."} <a href={link} target="_blank">Ver painel ↗</a></span>}
          <button className="btn cinza" disabled={!sujo || pendente} onClick={() => { if (confirm("Descartar as alterações não salvas?")) { setD(JSON.parse(salvo)); setMsg(null); } }}>Descartar</button>
          <button className="btn verde" disabled={!sujo || pendente} onClick={onSalvar}>{pendente ? "Salvando…" : "Salvar alterações"}</button>
        </div>
      </div>
    </div>
  );
}
