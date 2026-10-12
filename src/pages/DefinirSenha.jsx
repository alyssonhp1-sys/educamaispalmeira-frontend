import { useState } from "react";
import { request, jsonBody } from "../api.js";
import { Field, FeedbackMessage } from "../components/uiKit.jsx";

export default function DefinirSenha({ onDone }) {
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErro("");
    if (senha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const user = await request("/api/auth/definir-senha", {
        method: "POST",
        body: jsonBody({ senha, confirmar }),
      });
      onDone(user);
    } catch (ex) {
      setErro(ex.message || "Não foi possível salvar a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <span className="brand-mark login-mark">
          <img src="/static/img/logo2.png" alt="Prefeitura Municipal de Palmeira do Piauí" />
        </span>
        <h1>Primeiro acesso</h1>
        <p className="sub">Defina sua nova senha para continuar.</p>
        <FeedbackMessage type="danger">{erro}</FeedbackMessage>
        <form onSubmit={submit}>
          <Field id="nova-senha" label="Nova senha" required help="Use pelo menos 8 caracteres.">
            <input
              id="nova-senha"
              className="input"
              type="password"
              minLength={8}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field id="confirmar-senha" label="Confirmar senha" required>
            <input
              id="confirmar-senha"
              className="input"
              type="password"
              minLength={8}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
          <button className="btn-login" type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Salvar senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
