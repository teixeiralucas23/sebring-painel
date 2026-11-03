"use client";
import { useMemo, useState } from "react";
import type { Dados } from "@/lib/types";
import { criarModelo, fmt } from "@/lib/calc";

export default function Simulador({ dados }: { dados: Dados }) {
  const m = useMemo(() => criarModelo(dados), [dados]);
  const p = dados.premissas;
  const pctSocio = dados.socios[0]?.percentual ?? 0;
  const [preco, setPreco] = useState(p.precoVenda);
  const [dias, setDias] = useState(p.diasMercado);
  const lucro = m.lucro(preco, dias);
  const cls = "v " + (lucro >= 0 ? "pos" : "neg");
  const min = Math.floor((Math.min(p.precoVenda, dados.sensibilidade.precoMin) - 10000) / 1000) * 1000;
  const max = Math.ceil((Math.max(p.precoVenda, dados.sensibilidade.precoMax) + 10000) / 1000) * 1000;

  return (
    <div className="card">
      <div className="ctrl">
        <div>
          <label>
            Preço de venda por casa <span className="cur">{fmt(preco)}</span>
          </label>
          <input type="range" min={min} max={max} step={1000} value={preco} onChange={(e) => setPreco(+e.target.value)} />
        </div>
        <div>
          <label>
            Dias no mercado até fechar <span className="cur">{dias} dias</span>
          </label>
          <input type="range" min={15} max={360} step={5} value={dias} onChange={(e) => setDias(+e.target.value)} />
        </div>
      </div>
      <div className="out">
        <div><div className="l">Juros do empréstimo</div><div className="v">{fmt(m.juros(dias))}</div></div>
        <div><div className="l">Custo total · {m.N} casas</div><div className="v">{fmt(m.custo(preco, dias))}</div></div>
        <div><div className="l">Lucro líquido</div><div className={cls}>{fmt(lucro)}</div></div>
        <div><div className="l">Por sócio ({pctSocio}%)</div><div className={cls}>{fmt((lucro * pctSocio) / 100)}</div></div>
      </div>
      <p style={{ fontSize: 11.5, color: "#7b8aa3", marginTop: 16 }}>
        Preço de equilíbrio (break-even) com {dias} dias no mercado: <b>{fmt(m.breakeven(dias))}</b> por casa. Abaixo disso o projeto dá prejuízo.
      </p>
    </div>
  );
}
