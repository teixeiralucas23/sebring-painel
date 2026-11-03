"use client";
import { useActionState } from "react";
import { entrar } from "../actions";

export default function Login() {
  const [erro, acao, enviando] = useActionState(entrar, null);
  return (
    <div className="login">
      <div className="card">
        <h1 style={{ fontSize: 20, color: "#1f3864" }}>Editar painel</h1>
        <p className="dica" style={{ margin: "4px 0 18px" }}>OPD Development — Sebring FL</p>
        <form action={acao} className="campos" style={{ gridTemplateColumns: "1fr" }}>
          <div className="campo">
            <label htmlFor="usuario">Usuário</label>
            <input className="in" id="usuario" name="usuario" autoComplete="username" required placeholder="lucas ou tulio" />
          </div>
          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <input className="in" id="senha" name="senha" type="password" autoComplete="current-password" required />
          </div>
          {erro && <div className="erro">{erro}</div>}
          <button className="btn" disabled={enviando}>{enviando ? "Entrando…" : "Entrar"}</button>
        </form>
      </div>
      <p className="dica" style={{ textAlign: "center", marginTop: 14 }}><a href="/">← Voltar ao painel</a></p>
    </div>
  );
}
