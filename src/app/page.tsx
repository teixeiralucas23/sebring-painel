import { lerPainel } from "@/lib/db";
import { dataCurta, dataLonga, diasEntre, fmt, pct, resumo } from "@/lib/calc";
import { STATUS_LABEL, type Status } from "@/lib/types";
import Simulador from "./Simulador";
import { Cenarios, Composicao, Curva } from "./Graficos";
import { nomeExibicao } from "@/lib/auth";

export const dynamic = "force-dynamic";

const PILL: Record<Status, string> = { realizado: "p-ok", proximo: "p-next", programado: "p-sch", marco: "p-sch" };
const dash = (n: number) => (n ? fmt(n) : "—");

export default async function Pagina() {
  const { dados: d, atualizadoEm, atualizadoPor } = await lerPainel();
  const p = d.premissas;
  const r = resumo(d);
  const { m } = r;
  const N = m.N;
  const pctS = d.socios[0]?.percentual ?? 0;
  const porSocio = (v: number) => (v * pctS) / 100;
  const atualizado = atualizadoEm.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/New_York" });
  const venda = r.linhas[r.linhas.length - 1];
  const meses = r.linhas.length ? Math.round(diasEntre(r.linhas[0].data, venda.data) / 30.4) : 0;

  // orçamento
  const custoTotal = r.custo;
  const linhaOrc = (nome: string, total: number, obs: string) => ({ nome, total, obs });
  const hard = [
    linhaOrc("Abertura da empresa (rateada)", p.aberturaEmpresa, `Total ${fmt(p.aberturaEmpresa)}`),
    linhaOrc("Compra do lote", N * p.lote, `${fmt(p.lote)} por lote`),
    linhaOrc(`Contrato de construção — ${d.projeto.construtora}`, N * p.construcao, p.areaSqft ? `Contrato fixo · ${fmt(p.construcao / p.areaSqft)}/sq ft · ${p.areaSqft.toLocaleString("pt-BR")} sq ft` : "Contrato fixo"),
    linhaOrc("Gestão da obra", N * p.gestao, ""),
  ];
  const principalCasa = m.emprestimoTotal / N;
  const fin = [
    linhaOrc("Taxas e pontos do hard money", N * p.taxasEmprestimo, principalCasa ? `~${pct(p.taxasEmprestimo / principalCasa)} sobre ${fmt(principalCasa)}/casa` : ""),
    linhaOrc("Juros acumulados até a quitação", r.juros, `${p.jurosAnual.toLocaleString("pt-BR")}% a.a., diário, até a venda (${dataCurta(venda.data)})`),
  ];
  const saida = [linhaOrc(`Closing costs na venda (${p.closing.toLocaleString("pt-BR")}%)`, r.receita * m.cc, "Comissão, title, transfer tax")];
  const sub = (xs: { total: number }[]) => xs.reduce((a, b) => a + b.total, 0);

  // cenários (inclui o base)
  const cenarios = [
    ...d.cenarios.map((c) => ({ ...c, base: false })),
    { nome: "BASE", descricao: "premissa atual do projeto", preco: p.precoVenda, dias: p.diasMercado, base: true },
  ]
    .map((c) => ({ ...c, juros: m.juros(c.dias), custo: m.custo(c.preco, c.dias), lucro: m.lucro(c.preco, c.dias) }))
    .sort((a, b) => a.lucro - b.lucro);

  // sensibilidade
  const precos: number[] = [];
  for (let x = d.sensibilidade.precoMin; x <= d.sensibilidade.precoMax && precos.length < 30; x += d.sensibilidade.passo) precos.push(x);
  const valoresHeat = precos.flatMap((pr) => d.sensibilidade.dias.map((di) => m.lucro(pr, di)));
  const escala = Math.max(1, ...valoresHeat.map(Math.abs));

  // aportes por sócio
  const aportes = d.lancamentos.filter((l) => l.aporte > 0).sort((a, b) => a.data.localeCompare(b.data));
  let acum = 0;

  return (
    <>
      <header>
        <div className="wrap">
          <h1>{d.projeto.titulo}</h1>
          <div className="sub">{d.projeto.descricao} · Atualizado em {atualizado} · Valores em USD</div>
          <div className="tags">
            {d.socios.map((s) => <span className="tag" key={s.nome}>{s.nome}</span>)}
            <span className="tag">Construtora: {d.projeto.construtora}</span>
          </div>
        </div>
      </header>
      <div className="wrap">
        <h2>Números-chave <span className="en">— cenário base: venda a {fmt(p.precoVenda)}, {p.diasMercado} dias no mercado</span></h2>
        <div className="grid g4">
          <div className="kpi"><div className="lab">Receita bruta · {N} casas</div><div className="val">{fmt(r.receita)}</div><div className="note">{fmt(p.precoVenda)} por casa</div></div>
          <div className="kpi"><div className="lab">Custo total do projeto</div><div className="val">{fmt(r.custo)}</div><div className="note">{fmt(r.custoPorCasa)} por casa{r.custoSqft ? ` · ${fmt(r.custoSqft)}/sq ft` : ""}</div></div>
          <div className={"kpi " + (r.lucro >= 0 ? "good" : "warn")}><div className="lab">Lucro líquido</div><div className={"val " + (r.lucro >= 0 ? "pos" : "neg")}>{fmt(r.lucro)}</div><div className="note">Margem de {pct(r.margem)} sobre a venda</div></div>
          <div className={"kpi " + (r.lucro >= 0 ? "good" : "warn")}><div className="lab">Retorno sobre capital</div><div className={"val " + (r.lucro >= 0 ? "pos" : "neg")}>{pct(r.roe)}</div><div className="note">Em ~{meses} meses de projeto</div></div>
        </div>
        <div className="grid g4" style={{ marginTop: 16 }}>
          <div className="kpi"><div className="lab">Equity dos sócios</div><div className="val">{fmt(m.equityTotal)}</div><div className="note">{r.pctIgual ? `${fmt(porSocio(m.equityTotal))} por sócio (${pctS}% cada)` : `${d.socios.length} sócios`}</div></div>
          <div className="kpi good"><div className="lab">Lucro por sócio{r.pctIgual ? "" : ` (${pctS}%)`}</div><div className={"val " + (r.lucro >= 0 ? "pos" : "neg")}>{fmt(porSocio(r.lucro))}</div><div className="note">Retorno total: {fmt(porSocio(m.equityTotal + r.lucro))}</div></div>
          <div className="kpi warn"><div className="lab">Já aportado</div><div className="val">{fmt(r.jaAportado)}</div><div className="note">{fmt(porSocio(r.jaAportado))} por sócio · {m.equityTotal ? pct(r.jaAportado / m.equityTotal, 0) : "—"} do total</div></div>
          <div className={"kpi " + (r.falta > 0 ? "warn" : "good")}><div className="lab">Falta aportar</div><div className="val">{fmt(r.falta)}</div><div className="note">{r.falta > 0 ? `${fmt(porSocio(r.falta))} por sócio${r.proximoAporte ? ` · próximo em ${dataCurta(r.proximoAporte.data)}` : ""}` : "Todos os aportes realizados"}</div></div>
        </div>

        <h2>Simulador interativo <span className="en">— mova os controles</span></h2>
        <Simulador dados={d} />

        <h2>Composição do custo e cenários</h2>
        <div className="grid g2">
          <div className="card">
            <Composicao
              total={custoTotal}
              itens={[
                { label: `Construção (${d.projeto.construtora})`, valor: N * p.construcao },
                { label: "Lote", valor: N * p.lote },
                { label: "Closing costs da venda", valor: r.receita * m.cc },
                { label: "Taxas do empréstimo", valor: N * p.taxasEmprestimo },
                { label: "Juros", valor: r.juros },
                { label: "Gestão da obra", valor: N * p.gestao },
                { label: "Abertura da empresa", valor: p.aberturaEmpresa },
              ]}
            />
          </div>
          <div className="card">
            <Cenarios pctSocio={pctS} itens={cenarios.map((c) => ({ label: `${c.nome}\n$${Math.round(c.preco / 1000)}k/${c.dias}d`, lucro: c.lucro, base: c.base }))} />
          </div>
        </div>

        <h2>Orçamento itemizado <span className="en">— por casa e projeto completo</span></h2>
        <div className="card scroll" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Item</th><th className="r">Por casa</th><th className="r">{N} casas</th><th className="r">% do custo</th><th>Observação</th></tr></thead>
            <tbody>
              {([["Custos duros · Hard costs", hard, "custos duros"], ["Custos de financiamento · Financing", fin, "financiamento"], ["Custos de saída · Exit", saida, "saída"]] as const).map(([titulo, itens, nome]) => (
                <Bloco key={titulo} titulo={titulo} itens={itens} nome={nome} N={N} total={custoTotal} sub={sub(itens)} />
              ))}
              <tr className="tot geral"><td>CUSTO TOTAL</td><td className="r">{fmt(custoTotal / N)}</td><td className="r">{fmt(custoTotal)}</td><td className="r">100%</td><td></td></tr>
              <tr><td>Receita da venda</td><td className="r">{fmt(p.precoVenda)}</td><td className="r">{fmt(r.receita)}</td><td className="r"></td><td>Preço estimado</td></tr>
              <tr className="tot verde"><td>LUCRO LÍQUIDO</td><td className={"r " + (r.lucro >= 0 ? "pos" : "neg")}>{fmt(r.lucro / N)}</td><td className={"r " + (r.lucro >= 0 ? "pos" : "neg")}>{fmt(r.lucro)}</td><td className="r">{pct(r.margem)}</td><td>margem sobre a venda</td></tr>
            </tbody>
          </table>
        </div>

        <h2>Fluxo de caixa do projeto <span className="en">— {N} casas</span></h2>
        <div className="card scroll" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Data</th><th>Evento</th><th className="c">Status</th><th className="r">Equity</th><th className="r">Empréstimo</th><th className="r">Venda</th><th className="r">Saídas</th><th className="r">Caixa acum.</th><th className="r">Equity acum.</th></tr></thead>
            <tbody>
              {r.linhas.map((l) => (
                <tr key={l.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{dataCurta(l.data)}</td><td>{l.descricao}</td>
                  <td className="c"><span className={"pill " + PILL[l.status]}>{STATUS_LABEL[l.status]}</span></td>
                  <td className="r">{dash(l.aporte)}</td><td className="r">{dash(l.emprestimo)}</td><td className="r">{dash(l.venda)}</td><td className="r">{dash(l.saidas)}</td>
                  <td className={"r" + (l.caixa < -0.5 ? " neg" : "")}>{fmt(l.caixa)}</td><td className="r">{fmt(l.equity)}</td>
                </tr>
              ))}
              <tr className="tot">
                <td colSpan={3}>Caixa final {fmt(r.caixaFinal)} − equity aportado {fmt(m.equityTotal)}</td>
                <td colSpan={5} className="r">LUCRO LÍQUIDO DO PROJETO</td>
                <td className={"r " + (r.caixaFinal - m.equityTotal >= 0 ? "pos" : "neg")}>{fmt(r.caixaFinal - m.equityTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <Curva labels={r.linhas.map((l) => dataCurta(l.data))} equity={r.linhas.map((l) => l.equity)} caixa={r.linhas.map((l) => Math.round(l.caixa))} divida={r.linhas.map((l) => l.divida)} />
        </div>

        <h2>Cenários de lucro e prejuízo</h2>
        <div className="card scroll" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Cenário</th><th className="r">Preço/casa</th><th className="c">Dias no mercado</th><th className="r">Juros</th><th className="r">Custo total</th><th className="r">Lucro líquido</th><th className="r">Margem</th><th className="r">Por sócio</th><th className="r">ROE</th></tr></thead>
            <tbody>
              {cenarios.map((c) => (
                <tr key={c.nome + c.preco + c.dias} style={c.base ? { background: "#d6f0e2" } : undefined}>
                  <td><b>{c.nome}</b> — {c.descricao}</td><td className="r">{fmt(c.preco)}</td><td className="c">{c.dias}</td><td className="r">{fmt(c.juros)}</td><td className="r">{fmt(c.custo)}</td>
                  <td className={"r " + (c.lucro >= 0 ? "pos" : "neg")}><b>{fmt(c.lucro)}</b></td><td className="r">{pct(c.lucro / (N * c.preco))}</td><td className="r">{fmt(porSocio(c.lucro))}</td><td className="r">{m.equityTotal ? pct(c.lucro / m.equityTotal) : "—"}</td>
                </tr>
              ))}
              <tr className="tot">
                <td colSpan={9} style={{ fontWeight: 400, fontSize: 12, background: "#fff" }}>
                  Preço de equilíbrio: <b>{fmt(m.breakeven(p.diasMercado))}</b> por casa com {p.diasMercado} dias no mercado · <b>{fmt(m.breakeven(p.diasMercado + 60))}</b> com {p.diasMercado + 60} dias. O projeto suporta uma queda de ~{pct(1 - m.breakeven(p.diasMercado) / p.precoVenda, 0)} no preço antes de entrar no vermelho.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2>Sensibilidade <span className="en">— lucro líquido total ({N} casas)</span></h2>
        <div className="card scroll" style={{ padding: 0 }}>
          <table className="heat">
            <thead><tr><th>Preço \ Dias no mercado</th>{d.sensibilidade.dias.map((di) => <th className="c" key={di}>{di}</th>)}</tr></thead>
            <tbody>
              {precos.map((pr) => (
                <tr key={pr}>
                  <td className="px">{fmt(pr)}</td>
                  {d.sensibilidade.dias.map((di) => {
                    const v = m.lucro(pr, di);
                    const t = Math.max(-1, Math.min(1, v / escala));
                    const bg = v >= 0 ? `rgba(30,142,90,${0.1 + t * 0.62})` : `rgba(192,57,43,${0.14 + Math.abs(t) * 0.62})`;
                    return <td key={di} style={{ background: bg, color: Math.abs(t) > 0.55 ? "#fff" : "#1a2332" }}>{fmt(v)}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>Aportes por sócio <span className="en">— {r.pctIgual ? `${pctS}% para cada um dos ${d.socios.length} sócios` : "conforme participação"}</span></h2>
        <div className="card scroll" style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Data</th><th>Chamada de capital</th><th className="c">Status</th><th className="r">Total</th>{d.socios.map((s) => <th className="r" key={s.nome}>{s.nome} ({s.percentual}%)</th>)}<th className="r">Acum. total</th></tr></thead>
            <tbody>
              {aportes.map((l) => {
                acum += l.aporte;
                return (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{dataCurta(l.data)}</td><td>{l.descricao}</td>
                    <td className="c"><span className={"pill " + PILL[l.status]}>{STATUS_LABEL[l.status]}</span></td>
                    <td className="r">{fmt(l.aporte)}</td>
                    {d.socios.map((s) => <td className="r" key={s.nome}>{fmt((l.aporte * s.percentual) / 100)}</td>)}
                    <td className="r">{fmt(acum)}</td>
                  </tr>
                );
              })}
              <tr className="tot"><td colSpan={3}>TOTAL APORTADO</td><td className="r">{fmt(m.equityTotal)}</td>{d.socios.map((s) => <td className="r" key={s.nome}>{fmt((m.equityTotal * s.percentual) / 100)}</td>)}<td className="r">{fmt(m.equityTotal)}</td></tr>
              <tr className="tot verde"><td colSpan={3}>RETORNO PROJETADO (base) — capital + lucro</td><td className="r">{fmt(m.equityTotal + r.lucro)}</td>{d.socios.map((s) => <td className="r pos" key={s.nome}>{fmt(((m.equityTotal + r.lucro) * s.percentual) / 100)}</td>)}<td className="r pos">{r.roe >= 0 ? "+" : ""}{pct(r.roe)}</td></tr>
            </tbody>
          </table>
        </div>

        <h2>Cronograma e riscos</h2>
        <div className="grid g21">
          <div className="card">
            <div className="tl">
              {r.linhas.map((l) => {
                const valor = l.aporte || l.emprestimo || l.venda;
                return (
                  <div className={"ev" + (l.status === "realizado" ? " done" : l.status === "proximo" ? " next" : "")} key={l.id}>
                    <div className="d">{dataLonga(l.data)}{l.status === "proximo" ? " · PRÓXIMO" : l.id === "venda" && l.status !== "realizado" ? " · ESTIMADO" : ""}</div>
                    <div className="t">{l.status === "proximo" ? <b>{l.descricao}</b> : l.descricao}{valor ? ` — ${fmt(valor)}` : ""}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card">
            {d.riscos.map((x, i) => (
              <div className="risk" key={i}><div className="n">{i + 1}</div><div className="b"><b>{x.titulo}</b>{x.texto}</div></div>
            ))}
          </div>
        </div>
        <div className="foot">
          {d.projeto.rodape}
          <br />Última atualização: {atualizado}, por {nomeExibicao(atualizadoPor)}.
        </div>
      </div>
    </>
  );
}

function Bloco({ titulo, itens, nome, N, total, sub }: { titulo: string; itens: readonly { nome: string; total: number; obs: string }[]; nome: string; N: number; total: number; sub: number }) {
  return (
    <>
      <tr className="sec"><td colSpan={5}>{titulo}</td></tr>
      {itens.map((i) => (
        <tr key={i.nome}><td>{i.nome}</td><td className="r">{fmt(i.total / N)}</td><td className="r">{fmt(i.total)}</td><td className="r">{pct(i.total / total)}</td><td>{i.obs}</td></tr>
      ))}
      <tr className="tot"><td>Subtotal — {nome}</td><td className="r">{fmt(sub / N)}</td><td className="r">{fmt(sub)}</td><td className="r">{pct(sub / total)}</td><td></td></tr>
    </>
  );
}
