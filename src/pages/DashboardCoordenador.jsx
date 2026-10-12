import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Modal from "../components/Modal.jsx";
import Kpi from "../components/Kpi.jsx";
import { DetalheAula } from "../components/DiarioAula.jsx";
import CalendarioLetivo from "../components/CalendarioLetivo.jsx";
import { request, jsonBody } from "../api.js";
import { classeStatusAula, classeStatusPlano, rotuloQuantidade, rotuloStatusAula, rotuloStatusPlano } from "../ui.js";
import { AtencaoNecessaria, EmptyState, FeedbackMessage, PageHeader } from "../components/uiKit.jsx";
import { ListaOcorrenciasEscola, RegistrarFaltaDocenteModal } from "../components/FaltaDocente.jsx";

export default function DashboardCoordenador({ data, onReload }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const secao = params.get("secao") || "visao";
  const [tab, setTab] = useState("ativos");
  const [revisao, setRevisao] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [motivo, setMotivo] = useState("");
  const [invalidar, setInvalidar] = useState(null);
  const [aberto, setAberto] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [filtroAula, setFiltroAula] = useState("pendente");
  const [validandoId, setValidandoId] = useState(null);
  const [modalFalta, setModalFalta] = useState(false);
  const [listaFaltaKey, setListaFaltaKey] = useState(0);

  async function avaliar(id, status, texto) {
    setErro("");
    setSalvando(true);
    try {
      await request(`/api/coordenacao/planejamento/${id}`, {
        method: "POST",
        body: jsonBody({ status, feedback: texto || "" }),
      });
      setRevisao(null);
      setFeedback("");
      setMsg(status === "aprovado" ? "Planejamento aprovado." : "Devolvido ao professor com feedback.");
      onReload();
    } catch (e) {
      setErro(e.message || "Não foi possível registrar a avaliação.");
    } finally {
      setSalvando(false);
    }
  }

  async function arquivar(id) {
    await request(`/api/planejamento/${id}/arquivar`, { method: "POST" });
    onReload();
  }

  async function validarAula(id) {
    if (validandoId) return;
    setErro("");
    setValidandoId(id);
    try {
      await request(`/api/coordenacao/registros-aula/${id}`, {
        method: "POST",
        body: jsonBody({ status: "validada" }),
      });
      setMsg("Aula validada.");
      onReload();
    } catch (e) {
      setErro(e.message || "Não foi possível validar.");
    } finally {
      setValidandoId(null);
    }
  }

  async function invalidarAula() {
    setErro("");
    setSalvando(true);
    try {
      await request(`/api/coordenacao/registros-aula/${invalidar.id}`, {
        method: "POST",
        body: jsonBody({ status: "invalidada", motivo }),
      });
      setInvalidar(null);
      setMotivo("");
      setMsg("Aula invalidada. O registro permanece no histórico e não conta na carga.");
      onReload();
    } catch (e) {
      setErro(e.message || "Não foi possível invalidar.");
    } finally {
      setSalvando(false);
    }
  }

  async function abrirAula(id) {
    if (aberto && aberto.id === id) {
      setAberto(null);
      return;
    }
    try {
      setAberto(await request(`/api/registros-aula/${id}`));
    } catch (e) {
      setErro(e.message || "Não foi possível abrir o registro.");
    }
  }

  const lista = tab === "ativos" ? data.planejamentos : data.arquivados;
  const registros = data.registrosAula || [];
  const pendentes = registros.filter((p) => p.status === "pendente");
  const validadas = registros.filter((p) => p.status === "validada");
  const invalidadas = registros.filter((p) => p.status === "invalidada");
  const registrosFiltrados = filtroAula === "todas"
    ? [...pendentes, ...validadas, ...invalidadas]
    : registros.filter((r) => r.status === filtroAula);
  const mostrarRegistros = secao === "registros" || secao === "visao";
  const mostrarAtencao = secao !== "registros" && secao !== "planos" && secao !== "calendario";
  const mostrarPlanos = secao === "planos";
  const qtdFaltas = data.indicadores?.faltasDocentesAtivas ?? 0;

  if (secao === "calendario") {
    return <CalendarioLetivo somenteLeitura />;
  }

  return (
    <>
      <PageHeader
        kicker="Coordenação pedagógica"
        title={data.escola.nome}
        description="Valide os registros de aula e acompanhe quem precisa de atenção."
      />

      <section className="section section-fold">
        <div className="grid-stats">
          <Kpi value={pendentes.length} label="Aulas pendentes" tone={pendentes.length ? "warn" : undefined} />
          <Kpi value={validadas.length} label="Validadas" />
          <Kpi value={invalidadas.length} label="Invalidadas" />
        </div>
      </section>

      {mostrarAtencao && (
        <AtencaoNecessaria
          itens={[
            {
              id: "aulas",
              quantidade: pendentes.length,
              rotulo: rotuloQuantidade(pendentes.length, "aula pendente de validação", "aulas pendentes de validação"),
              onAction: () => {
                setFiltroAula("pendente");
                document.getElementById("registros-aula")?.scrollIntoView({ behavior: "smooth", block: "start" });
              },
              acaoLabel: "Ver",
            },
            {
              id: "risco",
              quantidade: (data.alunosEmRisco || []).length,
              rotulo: rotuloQuantidade((data.alunosEmRisco || []).length, "aluno em risco", "alunos em risco"),
              critico: true,
              onAction: () => document.getElementById("alunos-atencao")?.scrollIntoView({ behavior: "smooth", block: "start" }),
              acaoLabel: "Ver",
            },
            {
              id: "faltas-docentes",
              quantidade: qtdFaltas,
              rotulo: rotuloQuantidade(qtdFaltas, "falta docente registrada", "faltas docentes registradas"),
              onAction: () => document.getElementById("faltas-docentes")?.scrollIntoView({ behavior: "smooth", block: "start" }),
              acaoLabel: "Ver",
            },
          ]}
        />
      )}

      <FeedbackMessage type="success">{msg}</FeedbackMessage>
      {erro && !revisao && !invalidar && <FeedbackMessage type="danger">{erro}</FeedbackMessage>}

      {mostrarRegistros && (
      <section className="section" id="registros-aula">
        <div className="section-head">
          <div>
            <h2 className="section-title">Registros de aula</h2>
            <p className="section-sub">Validar ou invalidar aulas dos professores desta escola. Conteúdo e frequência não são editáveis.</p>
          </div>
        </div>
          <div className="tabs mb" role="tablist" aria-label="Situação da aula">
            {[
              ["pendente", `Pendentes (${pendentes.length})`],
              ["validada", `Validadas (${validadas.length})`],
              ["invalidada", `Invalidadas (${invalidadas.length})`],
              ["todas", `Todas (${registros.length})`],
            ].map(([k, l]) => (
              <button key={k} type="button" className={`tab ${filtroAula === k ? "active" : ""}`} onClick={() => setFiltroAula(k)}>{l}</button>
            ))}
          </div>
          {registrosFiltrados.map((r) => (
            <div className={`plan-item ${r.status}`} key={r.id}>
              <div className="toolbar">
                <div>
                  <strong>{r.professorNome}</strong>
                  <div className="muted">{r.turmaNome} · {r.disciplinaNome} · {r.data} · {r.quantidadeAulas} aula(s)</div>
                </div>
                {r.status === "pendente" ? (
                  <div className="flex">
                    <button className="btn btn-sm btn-outline" onClick={() => validarAula(r.id)} disabled={!!validandoId}>
                      {validandoId === r.id ? "Validando..." : "Validar"}
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => { setErro(""); setMotivo(""); setInvalidar(r); }}>Invalidar</button>
                  </div>
                ) : (
                  <span className={`badge ${classeStatusAula(r.status)}`}>{rotuloStatusAula(r.status)}</span>
                )}
              </div>
              <p className="muted">{r.conteudo}</p>
              <button className="btn btn-sm btn-ghost" onClick={() => abrirAula(r.id)}>
                {aberto && aberto.id === r.id ? "Ocultar detalhes" : "Ver conteúdo, metodologia e frequência"}
              </button>
              {aberto && aberto.id === r.id && <DetalheAula aula={aberto} />}
            </div>
          ))}
          {!registrosFiltrados.length && (
            <EmptyState title={filtroAula === "pendente" ? "Nenhuma aula pendente" : "Nenhum registro neste filtro"}>
              {filtroAula === "pendente" ? "Não há aulas aguardando validação neste momento." : "Não há registros nesta situação."}
            </EmptyState>
          )}
      </section>
      )}

      {mostrarPlanos && (
      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title">Planejamentos</h2>
            <p className="section-sub">Fluxo legado — manter até a substituição completa</p>
          </div>
          <div className="tabs">
            <button className={`tab ${tab === "ativos" ? "active" : ""}`} onClick={() => setTab("ativos")}>Ativos</button>
            <button className={`tab ${tab === "arquivo" ? "active" : ""}`} onClick={() => setTab("arquivo")}>Arquivo</button>
          </div>
        </div>
          {lista.map((p) => (
            <div className={`plan-item ${p.status}`} key={p.id}>
              <div className="toolbar">
                <div>
                  <strong>{p.professorNome}</strong>
                  <div className="muted">{p.turmaNome} · {p.dataEnvio}</div>
                </div>
                {tab === "ativos" && p.status === "pendente" ? (
                  <div className="flex">
                    <button className="btn btn-sm btn-outline" onClick={() => avaliar(p.id, "aprovado")}>Aprovar</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => { setErro(""); setFeedback(""); setRevisao(p); }}>Devolver</button>
                  </div>
                ) : (
                  <div className="flex">
                    <span className={`badge ${classeStatusPlano(p.status)}`}>{rotuloStatusPlano(p.status)}</span>
                    <button className="btn btn-sm btn-ghost" onClick={() => arquivar(p.id)} aria-label="Arquivar planejamento" title="Arquivar">Arquivar</button>
                  </div>
                )}
              </div>
              <p className="muted">{p.conteudo}</p>
              {p.arquivo && (
                <a className="btn btn-sm btn-outline" href={`/api/planejamentos/${p.id}/arquivo`}>
                  Baixar anexo
                </a>
              )}
              {p.feedback && (
                <div className="feedback-box">
                  <strong>Feedback enviado ao professor</strong>
                  <p>{p.feedback}</p>
                </div>
              )}
            </div>
          ))}
          {!lista.length && <div className="empty-state">Nenhum planejamento.</div>}
      </section>
      )}

      {mostrarAtencao && (
      <section className="section" id="faltas-docentes">
        <div className="section-head">
          <div>
            <h2 className="section-title">Aulas não ministradas</h2>
            <p className="section-sub">Registre falta docente somente quando a aula prevista não aconteceu. A ausência de diário não é falta.</p>
          </div>
          <div className="flex flex-wrap">
            <button type="button" className="btn btn-primary" onClick={() => setModalFalta(true)}>Registrar falta docente</button>
            <button type="button" className="btn btn-outline" onClick={() => nav("/faltas-docentes")}>Ver relatório</button>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <ListaOcorrenciasEscola recarregarChave={listaFaltaKey} aviso={msg} onChanged={onReload} />
          </div>
        </div>
      </section>
      )}

      {mostrarAtencao && (
      <div className="grid grid-2 mb">
        <div className="card" id="alunos-atencao">
          <div className="card-header">Alunos em atenção</div>
          <div className="card-body">
            <p className="section-sub">Situação já calculada pelo motor de notas.</p>
            {(data.alunosEmRisco || []).map((a) => (
              <div className="class-item" key={a.id}>
                <div>
                  <strong>{a.nome}</strong>
                  <div className="muted">{a.turmaNome} · {a.disciplinaNome} · média {a.ma != null ? a.ma : "—"}</div>
                </div>
                <span className={`badge ${a.situacao === "REPROVADO" ? "badge-danger" : "badge-warn"}`}>{a.situacao}</span>
              </div>
            ))}
            {!(data.alunosEmRisco || []).length && <div className="empty-state">Nenhum aluno em recuperação ou reprovado.</div>}
          </div>
        </div>
        <div className="card" id="diarios-pendentes">
          <div className="card-header">Diários sem lançamento</div>
          <div className="card-body">
            <p className="section-sub">Alocações ativas sem notas ou parecer.</p>
            {(data.diariosPendentes || []).map((d, i) => (
              <div className="class-item" key={`${d.turmaId}-${d.disciplinaNome}-${i}`}>
                <div>
                  <strong>{d.turmaNome}</strong>
                  <div className="muted">{d.disciplinaNome} · {d.professorNome || "Sem professor"}</div>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => nav(`/turma/${d.turmaId}`, { state: { voltarPara: "/", voltarRotulo: "Visão pedagógica" } })}>Abrir</button>
              </div>
            ))}
            {!(data.diariosPendentes || []).length && <div className="empty-state">Não há diários sem lançamento.</div>}
          </div>
        </div>
      </div>
      )}

      {mostrarAtencao && (
      <section className="section">
        <div className="section-head">
          <h2 className="section-title">Turmas da escola</h2>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Turma</th><th>Alunos</th><th></th></tr></thead>
              <tbody>
                {data.turmas.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.nome}</strong></td>
                    <td>{t.qtdAlunos}</td>
                    <td className="row-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => nav(`/turma/${t.id}`, { state: { voltarPara: "/", voltarRotulo: "Visão pedagógica" } })}>Diário</button>
                    </td>
                  </tr>
                ))}
                {!data.turmas.length && <tr><td colSpan="3"><div className="empty-state">Nenhuma turma ativa.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      )}

      {revisao && (
        <Modal title="Devolver para revisão" variant="danger" onClose={() => !salvando && setRevisao(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setRevisao(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => avaliar(revisao.id, "revisar", feedback)} disabled={salvando}>{salvando ? "Enviando..." : "Enviar feedback"}</button>
            </>
          }>
          {erro && <div className="alert alert-danger">{erro}</div>}
          <p>Professor: <strong>{revisao.professorNome}</strong></p>
          <p className="muted">{revisao.conteudo}</p>
          <label className="label" htmlFor="feedback-coord">Feedback <span className="req">*</span></label>
          <textarea id="feedback-coord" className="input" rows="4" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Explique o que precisa ser ajustado." />
        </Modal>
      )}

      {invalidar && (
        <Modal title="Invalidar registro de aula" variant="danger" onClose={() => !salvando && setInvalidar(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setInvalidar(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-danger" onClick={invalidarAula} disabled={salvando || !motivo.trim()}>{salvando ? "Invalidando..." : "Invalidar registro"}</button>
            </>
          }>
          {erro && <div className="alert alert-danger">{erro}</div>}
          <p>Professor: <strong>{invalidar.professorNome}</strong></p>
          <p className="muted">{invalidar.conteudo}</p>
          <label className="label" htmlFor="motivo-inv">Motivo da invalidação <span className="req">*</span></label>
          <textarea id="motivo-inv" className="input" rows="4" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Informe o motivo da invalidação." />
          <p className="help-text">Registros invalidados não contam como aula validada.</p>
        </Modal>
      )}
      {modalFalta && (
        <RegistrarFaltaDocenteModal
          onClose={() => setModalFalta(false)}
          onSaved={(texto) => {
            setModalFalta(false);
            setMsg(texto);
            setListaFaltaKey((n) => n + 1);
            onReload();
          }}
        />
      )}
    </>
  );
}
