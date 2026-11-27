import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED } from "./seed";
import { resumo, criarModelo } from "./calc";

const r = (n: number) => Math.round(n);

test("reproduz os números do painel original", () => {
  const s = resumo(SEED);
  assert.equal(r(s.receita), 610000);
  assert.equal(r(s.juros), 12688);
  assert.equal(r(s.custo), 550988);
  assert.equal(r(s.lucro), 59012);
  assert.equal((s.roe * 100).toFixed(1), "33.5"); // 59012/175900 = 33,55%
  assert.equal(r(s.m.equityTotal), 175900);
  assert.equal(r(s.jaAportado), 95900);
  assert.equal(r(s.falta), 80000);
  assert.equal(r(s.caixaFinal), 234912);
  assert.equal(r(s.m.breakeven(90)), 273610);
  assert.equal(r(s.m.breakeven(150)), 276496);
  assert.equal(s.linhas.at(-1)!.data, "2027-02-08");
  assert.deepEqual(s.avisos, []);
});

test("cenários", () => {
  const m = criarModelo(SEED);
  assert.equal(r(m.lucro(289000, 180)), 20795);
  assert.equal(r(m.lucro(295000, 150)), 34788);
  assert.equal(r(m.lucro(295000, 90)), 40212);
  assert.equal(r(m.lucro(308000, 60)), 67365);
  assert.equal(r(m.juros(180)), 20825);
});

test("aviso quando lançamentos não batem com premissas", () => {
  const d = structuredClone(SEED);
  d.premissas.construcao += 5000;
  assert.equal(resumo(d).avisos.length, 1);
});

test("2201 Sunrise Drive reproduz a planilha de viabilidade", async () => {
  const { SEED_SUNRISE } = await import("./seedSunrise");
  const s = resumo(SEED_SUNRISE);
  assert.equal(r(s.m.fixo), 368000); // C9 "Total custos" da planilha
  assert.equal(r(s.m.equityTotal), 150000); // recursos próprios
  assert.equal(r(s.m.emprestimoTotal), 218000); // lender
  assert.equal(r(s.receita), 469000); // cenário moderado
  assert.equal(r(s.lucro), 72860); // 469.000 − 6% − 368.000
  assert.equal((s.roe * 100).toFixed(1), "48.6");
  const m = criarModelo(SEED_SUNRISE);
  assert.equal(r(m.lucro(489000, 90)), 91660);
  assert.equal(r(m.lucro(439000, 90)), 44660);
  assert.deepEqual(s.avisos, []);
});

test("modelo em branco não gera erro", async () => {
  const { modeloEmBranco } = await import("./modelo");
  const s = resumo(modeloEmBranco("Teste", "2026-11-26"));
  assert.equal(s.lucro, 0);
  assert.ok(Number.isFinite(s.margem) && Number.isFinite(s.roe));
});
