import { useCallback, useEffect, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { limparCsrfToken, request } from "./api.js";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import DefinirSenha from "./pages/DefinirSenha.jsx";
import DashboardMunicipal from "./pages/DashboardMunicipal.jsx";
import DashboardEscola from "./pages/DashboardEscola.jsx";
import DashboardCoordenador from "./pages/DashboardCoordenador.jsx";
import PainelProfessor from "./pages/PainelProfessor.jsx";
import Turma from "./pages/Turma.jsx";
import Monitoramento from "./pages/Monitoramento.jsx";
import Auditoria from "./pages/Auditoria.jsx";
import RelatorioFaltasDocentes from "./pages/RelatorioFaltasDocentes.jsx";
import { LoadingState } from "./components/uiKit.jsx";

function Home({ dash, loadDash }) {
  if (!dash) return <LoadingState texto="Carregando o painel..." />;
  if (dash.painel === "municipal") return <DashboardMunicipal data={dash} onReload={loadDash} />;
  if (dash.painel === "escola") return <DashboardEscola data={dash} onReload={loadDash} />;
  if (dash.painel === "coordenador") return <DashboardCoordenador data={dash} onReload={loadDash} />;
  if (dash.painel === "professor") return <PainelProfessor data={dash} onReload={loadDash} />;
  return <p>Painel indisponível.</p>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [dash, setDash] = useState(null);
  const [ready, setReady] = useState(false);
  const nav = useNavigate();

  const loadDash = useCallback(async () => {
    const data = await request("/api/dashboard");
    setDash(data);
    setUser(data.usuario);
    return data;
  }, []);

  useEffect(() => {
    request("/api/me")
      .then(async (u) => {
        setUser(u);
        if (!u.primeiroAcesso) await loadDash();
      })
      .catch(() => {
        setUser(null);
        setDash(null);
      })
      .finally(() => setReady(true));
  }, [loadDash]);

  useEffect(() => {
    function aoExpirarSessao() {
      limparCsrfToken();
      setUser(null);
      setDash(null);
      nav("/login", { replace: true });
    }
    window.addEventListener("educamais:sessao-expirada", aoExpirarSessao);
    return () => window.removeEventListener("educamais:sessao-expirada", aoExpirarSessao);
  }, [nav]);

  async function onLogin(u) {
    setUser(u);
    if (u.primeiroAcesso) {
      nav("/definir-senha");
      return;
    }
    await loadDash();
    nav("/");
  }

  async function onLogout() {
    await request("/api/auth/logout", { method: "POST" });
    limparCsrfToken();
    setUser(null);
    setDash(null);
    nav("/login");
  }

  if (!ready) return <LoadingState texto="Carregando..." />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={onLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (user.primeiroAcesso) {
    return <DefinirSenha onDone={async (u) => { setUser(u); await loadDash(); nav("/"); }} />;
  }

  return (
    <Layout user={user} onLogout={onLogout}>
      <Routes>
        <Route path="/" element={<Home dash={dash} loadDash={loadDash} />} />
        <Route path="/turma/:id" element={<Turma />} />
        <Route path="/monitorar/:id" element={<Monitoramento />} />
        <Route path="/auditoria" element={<Auditoria user={user} />} />
        <Route
          path="/faltas-docentes"
          element={
            user.papel === "professor"
              ? <Navigate to="/" replace />
              : <RelatorioFaltasDocentes user={user} />
          }
        />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
