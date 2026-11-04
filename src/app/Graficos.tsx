"use client";
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Legend, Title, Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { fmt } from "@/lib/calc";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Filler, Legend, Title, Tooltip);
ChartJS.defaults.font.family = "-apple-system,'Segoe UI',Arial";
ChartJS.defaults.font.size = 11.5;

const NAVY = "#1f3864";
const titulo = (text: string) => ({ display: true, text, font: { size: 13, weight: 700 as const }, color: NAVY, padding: { bottom: 14 } });
const eixoK = { ticks: { callback: (v: string | number) => "$" + Number(v) / 1000 + "k" }, grid: { color: "#eef1f6" } };

export function Composicao({ itens, total }: { itens: { label: string; valor: number }[]; total: number }) {
  return (
    <Doughnut
      data={{
        labels: itens.map((i) => i.label),
        datasets: [{
          data: itens.map((i) => Math.round(i.valor)),
          backgroundColor: ["#1f3864", "#2d5490", "#c0392b", "#c9821a", "#e0a020", "#4a7fbf", "#8494ab"],
          borderWidth: 2, borderColor: "#fff",
        }],
      }}
      options={{
        cutout: "52%",
        plugins: {
          title: titulo(`Composição do custo total — ${fmt(total)}`),
          legend: { position: "right", labels: { boxWidth: 11, padding: 9 } },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmt(c.parsed)} (${((c.parsed / total) * 100).toFixed(1)}%)` } },
        },
      }}
    />
  );
}

export function Cenarios({ itens, pctSocio }: { itens: { label: string; lucro: number; base: boolean }[]; pctSocio: number }) {
  const cores = ["#c9821a", "#e0a020", "#4a7fbf", "#2fb47c", "#1e8e5a"];
  return (
    <Bar
      data={{
        labels: itens.map((i) => i.label.split("\n")),
        datasets: [{
          label: "Lucro líquido",
          data: itens.map((i) => Math.round(i.lucro)),
          backgroundColor: itens.map((i, k) => (i.lucro < 0 ? "#c0392b" : i.base ? "#1e8e5a" : cores[k % cores.length])),
          borderRadius: 5, maxBarThickness: 64,
        }],
      }}
      options={{
        plugins: {
          title: titulo("Lucro líquido por cenário"),
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${fmt(c.parsed.y ?? 0)}  ·  ${fmt(((c.parsed.y ?? 0) * pctSocio) / 100)} por sócio` } },
        },
        scales: { y: eixoK, x: { grid: { display: false }, ticks: { font: { size: 10 } } } },
      }}
    />
  );
}

export function Curva({ labels, equity, caixa, divida }: { labels: string[]; equity: number[]; caixa: number[]; divida: number[] }) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          { label: "Equity acumulado dos sócios", data: equity, borderColor: "#c9821a", backgroundColor: "rgba(201,130,26,.09)", fill: true, tension: 0.15, borderWidth: 2.5, pointRadius: 3 },
          { label: "Caixa do projeto", data: caixa, borderColor: "#1e8e5a", backgroundColor: "rgba(30,142,90,.11)", fill: true, tension: 0.15, borderWidth: 2.5, pointRadius: 3 },
          { label: "Saldo devedor do empréstimo", data: divida, borderColor: "#c0392b", borderDash: [5, 4], fill: false, tension: 0.15, borderWidth: 2.5, pointRadius: 3 },
        ],
      }}
      options={{
        interaction: { mode: "index", intersect: false },
        plugins: {
          title: titulo("Curva de capital, caixa e dívida ao longo do projeto"),
          legend: { position: "bottom", labels: { boxWidth: 12, padding: 14, usePointStyle: true } },
          tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.parsed.y ?? 0)}` } },
        },
        scales: { y: eixoK, x: { grid: { display: false } } },
      }}
    />
  );
}

export function Pizza({ titulo: t, itens }: { titulo: string; itens: { label: string; valor: number }[] }) {
  const total = itens.reduce((a, b) => a + b.valor, 0) || 1;
  return (
    <Doughnut
      data={{
        labels: itens.map((i) => i.label),
        datasets: [{
          data: itens.map((i) => Math.round(i.valor)),
          backgroundColor: ["#1f3864", "#c9821a", "#2d5490", "#1e8e5a", "#e0a020", "#4a7fbf", "#c0392b", "#8a5a06", "#8494ab"],
          borderWidth: 2, borderColor: "#fff",
        }],
      }}
      options={{
        cutout: "52%",
        plugins: {
          title: titulo(t),
          legend: { position: "right", labels: { boxWidth: 11, padding: 9 } },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${fmt(c.parsed)} (${((c.parsed / total) * 100).toFixed(1)}%)` } },
        },
      }}
    />
  );
}
