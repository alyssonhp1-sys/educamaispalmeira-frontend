import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { request, jsonBody } from "../api.js";
import { classeStatusPlano, rotuloEtapa, rotuloQuantidade, rotuloStatusPlano } from "../ui.js";
import { AtencaoNecessaria, EmptyState, FeedbackMessage, Field, PageHeader } from "../components/uiKit.jsx";

export default function PainelProfessor({ data, onReload }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const secao = params.get("secao") || "diarios";
  const [tab, setTab] = useState("ativos");
  const [form, setForm] = useState({
    turma_id: data.alocacoes[0]?.turmaId || "",
    conteudo: "",
  });
  const [reenvio, setReenvio] = useState({});
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [reenviando, setReenviando] = useState(null);

  const porTurma = useMemo(() => {
    const grupos = [];
    (data.alocacoes || []).forEach((a) => {
      let g = grupos.find((x) => x.turmaId === a.turmaId);
      if (!g) {
        g = {
          turmaId: a.turmaId,
          turmaNome: a.turmaNome,
          etapaEnsino: a.etapaEnsino,
          disciplinas: [],
        };
        grupos.push(g);
      }
      g.disciplinas.push(a);
    });
    return grupos;
  }, [data.alocacoes]);

  const registros = data.registrosAula || [];
  const aulasPendentes = registros.filter((r) => r.status === "pendente");
  const aulasInvalidadas = registros.filter((r) => r.status === "invalidada");

  async function enviar() {
    setErro("");
    setMsg("");
    const fd = new FormData();
    fd.append("turma_id", form.turma_id);
    fd.append("conteudo", form.conteudo);
    const file = document.getElementById("arquivoPlan")?.files?.[0];
    if (file) fd.append("arquivo", file);
    setEnviando(true);
    try {
      await request("/api/planejamento/enviar", { method: "POST", body: fd });
      setForm({ ...form, conteudo: "" });
      setMsg("Planejamento enviado para a coordenação.");
      onReload();
    } catch (e) {
      setErro(e.message || "Não foi possível enviar o planejamento.");
    } finally {
      setEnviando(false);
    }
  }

  async function arquivar(id) {
    await request(`/api/planejamento/${id}/arquivar`, { method: "POST" });
    onReload();
  }

  async function reenviar(p) {
    setErro("");
    setReenviando(p.id);
    try {
      await request(`/api/planejamento/${p.id}/reenviar`, {
        method: "POST",
        body: jsonBody({ conteudo: reenvio[p.id] ?? p.conteudo }),
      });
      setMsg("Planejamento reenviado. A coordenação verá o conteúdo atualizado.");
      onReload();
    } catch (e) {
      setErro(e.message || "Não foi possível reenviar.");
    } finally {
      setReenviando(null);
    }
  }

  function abrirTurma(aloc, aba) {
    const q = new URLSearchParams();
    q.set("aba", aba);
    if (aloc.disciplinaId) q.set("disc", aloc.disciplinaId);
    nav(`/turma/${aloc.turmaId}?${q.toString()}`, {
      state: { voltarPara: "/", voltarRotulo: "Minhas turmas" },
    });
  }

  const lista = tab === "ativos" ? data.planejamentos : data.arquivados;

  return (
    <>
      <PageHeader
        kicker={data.escolaNome}
        title={`Olá, ${data.usuario.professorNome || data.usuario.nome}`}
        description="Suas turmas, o que registrar agora e o que ainda está pendente."
      />

      <AtencaoNecessaria
        itens={[
          {
            id: "pendentes",
            quantidade: aulasPendentes.length,
            rotulo: rotuloQuantidade(aulasPendentes.length, "aula aguardando validação da coordenação", "aulas aguardando validação da coordenação"),
          },
          {
            id: "invalidadas",
            quantidade: aulasInvalidadas.length,
            rotulo: rotuloQuantidade(aulasInvalidadas.length, "aula invalidada", "aulas invalidadas"),
            critico: true,
          },
        ]}
        vazio="Nenhuma aula pendente de validação."
      />

      <FeedbackMessage type="success">{msg}</FeedbackMessage>
      <FeedbackMessage type="danger">{erro}</FeedbackMessage>

      {secao === "diarios" && (
        <section className="section">
          <div className="section-head">
            <div>
              <h2 className="section-title">Minhas turmas</h2>
              <p className="section-sub">Abra o diário para registrar a aula. Notas valem só para o Ensino Fundamental.</p>
            </div>
          </div>
          {!porTurma.length && <EmptyState title="Nenhuma turma vinculada">Aguarde a gestão escolar alocar você a uma turma.</EmptyState>}
          {porTurma.map((turma) => {
            const infantil = turma.etapaEnsino === "infantil";
            return (
              <article className="card turma-card mb" key={turma.turmaId}>
                <div className="card-body">
                  <div className="turma-card-head">
                    <div>
                      <h3>{turma.turmaNome}</h3>
                      <span className="muted">{rotuloEtapa(turma.etapaEnsino)}</span>
                    </div>
                  </div>
                  {infantil ? (
                    <div className="aloc-row">
                      <div className="muted">Registro de aula e acompanhamento descritivo</div>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-primary" onClick={() => abrirTurma(turma.disciplinas[0], "aula")}>Registrar aula</button>
                        <button className="btn btn-sm btn-outline" onClick={() => abrirTurma(turma.disciplinas[0], "pareceres")}>Acompanhamento</button>
                      </div>
                    </div>
                  ) : turma.disciplinas.map((a) => (
                    <div className="aloc-row" key={a.id}>
                      <div>
                        <strong>{a.disciplinaNome || "Disciplina"}</strong>
                      </div>
                      <div className="row-actions">
                        <button className="btn btn-sm btn-primary" onClick={() => abrirTurma(a, "aula")}>Registrar aula</button>
                        <button className="btn btn-sm btn-outline" onClick={() => abrirTurma(a, "notas")}>Notas</button>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {secao === "planos" && (
        <div className="grid grid-2">
          <div className="card">
            <div className="card-header">Enviar planejamento</div>
            <div className="card-body">
              <Field id="plan-turma" label="Turma / disciplina">
                <select id="plan-turma" className="input" value={form.turma_id} onChange={(e) => setForm({ ...form, turma_id: e.target.value })}>
                  {data.alocacoes.map((a) => <option key={a.id} value={a.turmaId}>{a.disciplinaNome} — {a.turmaNome}</option>)}
                </select>
              </Field>
              <Field id="plan-conteudo" label="Conteúdo / metodologia">
                <textarea id="plan-conteudo" className="input" rows="4" value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} placeholder="Descreva o plano de aula para a coordenação." />
              </Field>
              <Field id="arquivoPlan" label="Anexo (opcional)">
                <input id="arquivoPlan" className="input" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.odt,.ods" />
              </Field>
              <button className="btn btn-primary btn-block" onClick={enviar} disabled={enviando}>{enviando ? "Enviando..." : "Enviar para a coordenação"}</button>
            </div>
          </div>
          <div>
            <div className="tabs">
              <button className={`tab ${tab === "ativos" ? "active" : ""}`} onClick={() => setTab("ativos")}>Em acompanhamento</button>
              <button className={`tab ${tab === "arquivo" ? "active" : ""}`} onClick={() => setTab("arquivo")}>Arquivo</button>
            </div>
            {lista.map((p) => (
              <div className={`plan-item ${p.status}`} key={p.id}>
                <div className="toolbar">
                  <strong>{p.turmaNome}</strong>
                  <span className={`badge ${classeStatusPlano(p.status)}`}>{rotuloStatusPlano(p.status)}</span>
                </div>
                <p className="muted">{p.conteudo}</p>
                {p.arquivo && (
                  <a className="btn btn-sm btn-outline" href={`/api/planejamentos/${p.id}/arquivo`}>
                    Baixar anexo
                  </a>
                )}
                {p.feedback && (
                  <div className="feedback-box">
                    <strong>Feedback da coordenação</strong>
                    <p>{p.feedback}</p>
                  </div>
                )}
                {p.status === "revisar" && tab === "ativos" && (
                  <div className="mt">
                    <label className="label">Corrigir e reenviar</label>
                    <textarea
                      className="input field"
                      rows="3"
                      value={reenvio[p.id] ?? p.conteudo}
                      onChange={(e) => setReenvio({ ...reenvio, [p.id]: e.target.value })}
                    />
                    <button className="btn btn-sm btn-primary" onClick={() => reenviar(p)} disabled={reenviando === p.id}>{reenviando === p.id ? "Enviando..." : "Reenviar para análise"}</button>
                  </div>
                )}
                <button className="btn btn-sm btn-light mt" onClick={() => arquivar(p.id)}><i className="fas fa-archive" /> Arquivar</button>
              </div>
            ))}
            {!lista.length && <div className="empty-state">Nenhum planejamento nesta lista.</div>}
          </div>
        </div>
      )}
    </>
  );
}
