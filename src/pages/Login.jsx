import { useState } from "react";
import { request, jsonBody } from "../api.js";
import { Field, FeedbackMessage } from "../components/uiKit.jsx";

export default function Login({ onLogin }) {
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErro("");
    setLoading(true);
    try {
      const user = await request("/api/auth/login", {
        method: "POST",
        body: jsonBody({ login, senha }),
      });
      onLogin(user);
    } catch (ex) {
      setErro(ex.message || "Não foi possível entrar. Verifique os dados e tente novamente.");
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
        <h1>Educa+ <span>Palmeira</span></h1>
        <p className="sub">Secretaria Municipal de Educação<br />Palmeira do Piauí</p>
        <FeedbackMessage type="danger">{erro}</FeedbackMessage>
        <form onSubmit={submit}>
          <Field id="login-usuario" label="Usuário ou INEP" required>
            <div className="input-group">
              <span aria-hidden="true"><i className="fas fa-user" /></span>
              <input
                id="login-usuario"
                className={`input${erro ? " is-invalid" : ""}`}
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </div>
          </Field>
          <Field id="login-senha" label="Senha" required>
            <div className="input-group">
              <span aria-hidden="true"><i className="fas fa-lock" /></span>
              <input
                id="login-senha"
                className="input"
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </Field>
          <button className="btn-login" type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
        <p className="login-hint">Esqueceu sua senha? Procure a gestão da escola ou a Secretaria.</p>
        <p className="login-credit">Desenvolvido por <strong>Axon Dev</strong></p>
      </div>
      <div className="page-footer">
        <p>Prefeitura Municipal de Palmeira do Piauí</p>
        <p>Secretaria Municipal de Educação · Educa+ Palmeira</p>
      </div>
    </div>
  );
}
