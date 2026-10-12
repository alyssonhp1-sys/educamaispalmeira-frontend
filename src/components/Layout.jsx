import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Modal from "./Modal.jsx";
import { Field, FeedbackMessage } from "./uiKit.jsx";
import { request, jsonBody } from "../api.js";
import { rotuloPapel } from "../ui.js";
import { itensNavegacao, navAtivo } from "../nav.js";

export default function Layout({ user, onLogout, children }) {
  const location = useLocation();
  const [senhaOpen, setSenhaOpen] = useState(false);
  const [form, setForm] = useState({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [senhaTemp, setSenhaTemp] = useState(null);
  const itens = itensNavegacao(user?.papel);

  useEffect(() => {
    function aoSenhaTemp(e) {
      setSenhaTemp(e.detail);
    }
    window.addEventListener("educamais:senha-temporaria", aoSenhaTemp);
    return () => window.removeEventListener("educamais:senha-temporaria", aoSenhaTemp);
  }, []);

  async function salvarSenha(e) {
    e.preventDefault();
    setErr("");
    setMsg("");
    setSalvando(true);
    try {
      const data = await request("/api/auth/alterar-senha", { method: "POST", body: jsonBody(form) });
      setMsg(data.mensagem || "Senha atualizada.");
      setForm({ senhaAtual: "", novaSenha: "", confirmarSenha: "" });
    } catch (ex) {
      setErr(ex.message || "Não foi possível alterar a senha.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <img src="/static/img/logo2.png" alt="Prefeitura Municipal de Palmeira do Piauí" />
            </span>
            <span className="brand-text">
              <strong>Educa+ <span>Palmeira</span></strong>
              <small>Secretaria Municipal de Educação</small>
            </span>
          </Link>
          <div className="nav-links" aria-label="Seções">
            {itens.map((item) => {
              const ativo = navAtivo(item, location.pathname, location.search);
              return (
                <Link
                  key={`${item.to}-${item.label}`}
                  to={item.to}
                  className={`nav-link${ativo ? " active" : ""}`}
                  aria-current={ativo ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="nav-actions">
            <div className="user-chip">
              <small>{rotuloPapel(user?.papel)}</small>
              <strong>{user?.nome || user?.login}</strong>
            </div>
            <button
              className="btn btn-ghost"
              type="button"
              title="Alterar senha"
              aria-label="Alterar senha"
              onClick={() => { setErr(""); setMsg(""); setSenhaOpen(true); }}
            >
              Alterar senha
            </button>
            <button className="btn-logout" type="button" title="Sair" onClick={onLogout}>
              Sair
            </button>
          </div>
        </div>
      </nav>
      <div className="container">{children}</div>
      <footer className="page-footer">Prefeitura Municipal de Palmeira do Piauí · Secretaria Municipal de Educação · Educa+ Palmeira · 2026</footer>
      {senhaOpen && (
        <Modal title="Alterar senha" onClose={() => { if (!salvando) setSenhaOpen(false); }}>
          <form onSubmit={salvarSenha}>
            <FeedbackMessage type="danger">{err}</FeedbackMessage>
            <FeedbackMessage type="success">{msg}</FeedbackMessage>
            <Field id="senha-atual" label="Senha atual" required>
              <input id="senha-atual" className="input" type="password" value={form.senhaAtual} onChange={(e) => setForm({ ...form, senhaAtual: e.target.value })} required autoComplete="current-password" />
            </Field>
            <Field id="nova-senha-conta" label="Nova senha" required>
              <input id="nova-senha-conta" className="input" type="password" minLength={8} value={form.novaSenha} onChange={(e) => setForm({ ...form, novaSenha: e.target.value })} required autoComplete="new-password" />
            </Field>
            <Field id="confirmar-senha-conta" label="Confirmar nova senha" required>
              <input id="confirmar-senha-conta" className="input" type="password" minLength={8} value={form.confirmarSenha} onChange={(e) => setForm({ ...form, confirmarSenha: e.target.value })} required autoComplete="new-password" />
            </Field>
            <div className="flex-end">
              <button type="button" className="btn btn-outline" onClick={() => setSenhaOpen(false)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
            </div>
          </form>
        </Modal>
      )}
      {senhaTemp && (
        <Modal
          title={senhaTemp.titulo || "Senha temporária"}
          onClose={() => setSenhaTemp(null)}
          footer={<button type="button" className="btn btn-primary" onClick={() => setSenhaTemp(null)}>Entendi</button>}
        >
          <p>{senhaTemp.mensagem}</p>
          <p className="senha-temp">{senhaTemp.senha}</p>
          <p className="help-text">Anote a senha agora. Ela não poderá ser consultada depois.</p>
        </Modal>
      )}
    </>
  );
}
