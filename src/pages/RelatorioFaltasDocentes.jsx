import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Kpi from "../components/Kpi.jsx";
import { EmptyState, FeedbackMessage, Field, PageHeader, DateInput } from "../components/uiKit.jsx";
import { request } from "../api.js";

function qs(filtros) {
  const p = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v != null && String(v).trim() !== "") p.set(k, v);
  });
  return p.toString();
}

function rotuloStatus(status) {
  return status === "CANCELADA" ? "Cancelada" : "Ativa";
}

export default function RelatorioFaltasDocentes({ user }) {
  const nav = useNavigate();
  const municipal = user?.papel === "dirigente" || user?.papel === "secretaria";
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    escolaId: "",
    professorId: "",
    turmaId: "",
    disciplinaId: "",
    status: "ATIVA",
  });
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [exportando, setExportando] = useState(false);

  function setFiltro(k, v) {
    setFiltros((prev) => ({ ...prev, [k]: v }));
  }

  function queryFiltros(f) {
    return qs({
      data_inicio: f.dataInicio,
      data_fim: f.dataFim,
      escola_id: municipal ? f.escolaId : "",
      professor_id: f.professorId,
      turma_id: f.turmaId,
      disciplina_id: f.disciplinaId,
      status: f.status,
    });
  }

  async function carregar(prox) {
    const f = prox || filtros;
    setCarregando(true);
    setErro("");
    try {
      const payload = await request(`/api/faltas-docentes/relatorio?${queryFiltros(f)}`);
      setDados(payload);
      if (!f.dataInicio && payload.periodoPadrao) {
        setFiltros((prev) => ({
          ...prev,
          dataInicio: prev.dataInicio || payload.periodoPadrao.dataInicio || "",
          dataFim: prev.dataFim || payload.periodoPadrao.dataFim || "",
        }));
      }
    } catch (e) {
      setErro(e.message || "Não foi possível abrir o relatório.");
    } finally {
      setCarregando(false);
    }
  }

  async function exportarCsv() {
    if (exportando) return;
    setErro("");
    setExportando(true);
    try {
      const res = await fetch(`/api/faltas-docentes/relatorio.csv?${queryFiltros(filtros)}`, {
        credentials: "include",
      });
      const tipo = (res.headers.get("content-type") || "").toLowerCase();
      if (!res.ok || tipo.includes("application/json")) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Não foi possível exportar o CSV.");
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "faltas-docentes.csv";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 60000);
    } catch (e) {
      setErro(e.message || "Não foi possível exportar o CSV.");
    } finally {
      setExportando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ind = dados?.indicadores || {};
  const opcoes = dados?.opcoes || {};
  const escolaFiltrada = municipal ? filtros.escolaId : true;

  return (
    <>
      <PageHeader
        kicker={municipal ? "Secretaria Municipal" : (user?.papel === "coordenador_pedagogico" ? "Coordenação pedagógica" : "Gestão da escola")}
        title="Relatório de faltas docentes"
        description="Aulas previstas registradas pela gestão como não ministradas. Totais consideram somente ocorrências ativas."
        actions={<button type="button" className="btn btn-outline" onClick={() => nav("/")}>Voltar</button>}
      />
      <FeedbackMessage type="danger">{erro}</FeedbackMessage>
      <form
        className="card mb"
        onSubmit={(e) => {
          e.preventDefault();
          carregar();
        }}
      >
        <div className="card-body filtros-faltas">
          <Field id="rel-ini" label="Data inicial">
            <DateInput id="rel-ini" value={filtros.dataInicio} onChange={(e) => setFiltro("dataInicio", e.target.value)} />
          </Field>
          <Field id="rel-fim" label="Data final">
            <DateInput id="rel-fim" value={filtros.dataFim} onChange={(e) => setFiltro("dataFim", e.target.value)} />
          </Field>
          {municipal ? (
            <Field id="rel-escola" label="Escola">
              <select id="rel-escola" className="input" value={filtros.escolaId} onChange={(e) => setFiltro("escolaId", e.target.value)}>
                <option value="">Todas as escolas</option>
                {(opcoes.escolas || []).map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </Field>
          ) : null}
          <Field id="rel-prof" label="Professor">
            <select id="rel-prof" className="input" value={filtros.professorId} onChange={(e) => setFiltro("professorId", e.target.value)}>
              <option value="">Todos</option>
              {(opcoes.professores || []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Field>
          <Field id="rel-turma" label="Turma">
            <select id="rel-turma" className="input" value={filtros.turmaId} onChange={(e) => setFiltro("turmaId", e.target.value)}>
              <option value="">Todas</option>
              {(opcoes.turmas || []).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </Field>
          <Field id="rel-disc" label="Disciplina">
            <select id="rel-disc" className="input" value={filtros.disciplinaId} onChange={(e) => setFiltro("disciplinaId", e.target.value)}>
              <option value="">Todas</option>
              {(opcoes.disciplinas || []).map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </Field>
          <Field id="rel-sit" label="Situação">
            <select id="rel-sit" className="input" value={filtros.status} onChange={(e) => setFiltro("status", e.target.value)}>
              <option value="ATIVA">Ativas</option>
              <option value="CANCELADA">Canceladas</option>
              <option value="TODAS">Ativas e canceladas</option>
            </select>
          </Field>
          <div className="field-actions">
            <button type="submit" className="btn btn-primary" disabled={carregando}>{carregando ? "Consultando..." : "Consultar"}</button>
            <button type="button" className="btn btn-outline" onClick={exportarCsv} disabled={exportando || carregando}>
              {exportando ? "Exportando..." : "Exportar CSV"}
            </button>
          </div>
        </div>
      </form>

      <div className="grid-stats mb">
        <Kpi value={ind.ocorrenciasAtivas ?? 0} label="Ocorrências ativas" />
        <Kpi value={ind.aulasNaoMinistradas ?? 0} label="Aulas não ministradas" />
        {municipal ? <Kpi value={ind.escolasComOcorrencias ?? 0} label="Escolas com ocorrências" /> : null}
        <Kpi value={ind.professoresEnvolvidos ?? 0} label="Professores envolvidos" />
      </div>

      {municipal ? (
        <section className="section">
          <h2 className="section-title">Resumo por escola</h2>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Escola</th>
                    <th>Ocorrências</th>
                    <th>Aulas não ministradas</th>
                  </tr>
                </thead>
                <tbody>
                  {(dados?.porEscola || []).map((e) => (
                    <tr key={e.escolaId}>
                      <td>{e.escolaNome}</td>
                      <td>{e.ocorrencias}</td>
                      <td>{e.aulasNaoMinistradas}</td>
                    </tr>
                  ))}
                  {!(dados?.porEscola || []).length && (
                    <tr><td colSpan="3"><EmptyState title="Nenhuma ocorrência ativa no período" /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      {escolaFiltrada && (dados?.porProfessor || []).length > 0 ? (
        <section className="section">
          <h2 className="section-title">Por professor</h2>
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Professor</th>
                    <th>Ocorrências</th>
                    <th>Aulas não ministradas</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.porProfessor.map((p) => (
                    <tr key={p.professorId}>
                      <td>{p.professorNome}</td>
                      <td>{p.ocorrencias}</td>
                      <td>{p.aulasNaoMinistradas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <h2 className="section-title">Detalhamento</h2>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  {municipal ? <th>Escola</th> : null}
                  <th>Professor</th>
                  <th>Turma</th>
                  <th>Disciplina</th>
                  <th>Horário</th>
                  <th>Qtd. aulas</th>
                  <th>Motivo</th>
                  <th>Situação</th>
                </tr>
              </thead>
              <tbody>
                {(dados?.itens || []).map((i) => (
                  <tr key={i.id}>
                    <td>{i.data}</td>
                    {municipal ? <td>{i.escolaNome}</td> : null}
                    <td>{i.professorNome}</td>
                    <td>{i.turmaNome}</td>
                    <td>{i.disciplinaNome}</td>
                    <td>{i.diaSemana == null ? "—" : ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"][i.diaSemana]}</td>
                    <td>{i.quantidadeAulas}</td>
                    <td>{i.motivoRotulo}</td>
                    <td>
                      <span className={`badge ${i.status === "CANCELADA" ? "badge-light" : "badge-warn"}`}>
                        {rotuloStatus(i.status)}
                      </span>
                    </td>
                  </tr>
                ))}
                {!(dados?.itens || []).length && (
                  <tr>
                    <td colSpan={municipal ? 9 : 8}>
                      <EmptyState title="Nenhum registro neste filtro" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
