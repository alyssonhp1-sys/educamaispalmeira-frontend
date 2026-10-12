import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Modal from "../components/Modal.jsx";
import Kpi from "../components/Kpi.jsx";
import { request, jsonBody, baixarPdf } from "../api.js";
import { GraficoCarga, TabelaAcompanhamento, TabelaEducacaoInfantil } from "../components/DiarioAula.jsx";
import CalendarioLetivo from "../components/CalendarioLetivo.jsx";
import { CamposCargaAlocacao, camposCargaDe, payloadCarga } from "../components/CargaAlocacao.jsx";
import { rotuloEtapa, rotuloJornada, rotuloQuantidade, rotuloSituacaoAluno, avisarSenhaTemporaria } from "../ui.js";
import { AcoesDocumentosAluno, BotaoPdf, historicoTransferenciaVisivel } from "../components/DocumentosAluno.jsx";
import TrajetoriaLegadaAluno from "../components/TrajetoriaLegada.jsx";
import { AtencaoNecessaria, ConfirmModal, DateInput, EmptyState, FeedbackMessage, Field, PageHeader } from "../components/uiKit.jsx";
import { ListaOcorrenciasEscola, RegistrarFaltaDocenteModal } from "../components/FaltaDocente.jsx";

function alunoAtivo(a) {
  return a.situacao === "ativo" || a.situacao === "cursando";
}

function fichaDe(a = {}) {
  return {
    id: a.id,
    nome: a.nome || "",
    cpf: a.cpf || "",
    data_nascimento: a.dataNascimento || "",
    local_nascimento: a.localNascimento || "",
    endereco: a.endereco || "",
    telefone: a.telefone || "",
    nome_mae: a.nomeMae || "",
    prof_mae: a.profMae || "",
    nome_pai: a.nomePai || "",
    prof_pai: a.profPai || "",
    tem_alergia: a.temAlergia || "",
    tem_deficiencia: a.temDeficiencia || "",
    rota_transporte: a.rotaTransporte || "",
    nis_bolsa: a.nisBolsa || "",
    turma_id: a.turmaId || a.turma_id || "",
  };
}

function Campo({ label, children, span, required, id }) {
  return (
    <div className={`ficha-field${span ? " span" : ""}`}>
      <label className="label" htmlFor={id}>
        {label}
        {required ? <span className="req" aria-hidden="true"> *</span> : null}
      </label>
      {children}
    </div>
  );
}

function CamposFicha({ form, setForm, turmas }) {
  function set(k, v) {
    setForm({ ...form, [k]: v });
  }
  return (
    <div className="ficha">
      <section className="ficha-sec">
        <h3 className="ficha-title">Dados do aluno</h3>
        <div className="ficha-grid">
          <Campo id="ficha-nome" label="Nome completo" required><input id="ficha-nome" className="input" value={form.nome || ""} onChange={(e) => set("nome", e.target.value)} /></Campo>
          <Campo id="ficha-cpf" label="CPF" required><input id="ficha-cpf" className="input" value={form.cpf || ""} onChange={(e) => set("cpf", e.target.value)} /></Campo>
          <Campo id="ficha-nasc" label="Nascimento"><DateInput id="ficha-nasc" value={form.data_nascimento || ""} onChange={(e) => set("data_nascimento", e.target.value)} /></Campo>
          <Campo id="ficha-local" label="Local de nascimento"><input id="ficha-local" className="input" value={form.local_nascimento || ""} onChange={(e) => set("local_nascimento", e.target.value)} /></Campo>
        </div>
      </section>
      <section className="ficha-sec">
        <h3 className="ficha-title">Contato</h3>
        <div className="ficha-grid">
          <Campo label="Endereço"><input className="input" value={form.endereco || ""} onChange={(e) => set("endereco", e.target.value)} /></Campo>
          <Campo label="Telefone"><input className="input" value={form.telefone || ""} onChange={(e) => set("telefone", e.target.value)} /></Campo>
        </div>
      </section>
      <section className="ficha-sec">
        <h3 className="ficha-title">Responsáveis</h3>
        <div className="ficha-grid">
          <Campo label="Nome da mãe / responsável"><input className="input" value={form.nome_mae || ""} onChange={(e) => set("nome_mae", e.target.value)} /></Campo>
          <Campo label="Profissão da mãe"><input className="input" value={form.prof_mae || ""} onChange={(e) => set("prof_mae", e.target.value)} /></Campo>
          <Campo label="Nome do pai / responsável"><input className="input" value={form.nome_pai || ""} onChange={(e) => set("nome_pai", e.target.value)} /></Campo>
          <Campo label="Profissão do pai"><input className="input" value={form.prof_pai || ""} onChange={(e) => set("prof_pai", e.target.value)} /></Campo>
        </div>
      </section>
      <section className="ficha-sec">
        <h3 className="ficha-title">Informações complementares</h3>
        <div className="ficha-grid">
          <Campo label="Alergia"><input className="input" value={form.tem_alergia || ""} onChange={(e) => set("tem_alergia", e.target.value)} /></Campo>
          <Campo label="Deficiência"><input className="input" value={form.tem_deficiencia || ""} onChange={(e) => set("tem_deficiencia", e.target.value)} /></Campo>
          <Campo label="Rota de transporte"><input className="input" value={form.rota_transporte || ""} onChange={(e) => set("rota_transporte", e.target.value)} /></Campo>
          <Campo label="NIS / Bolsa"><input className="input" value={form.nis_bolsa || ""} onChange={(e) => set("nis_bolsa", e.target.value)} /></Campo>
        </div>
      </section>
      {turmas && (
        <section className="ficha-sec">
          <h3 className="ficha-title">Enturmação</h3>
          <div className="ficha-grid">
            <Campo label="Turma (opcional — pode enturmar depois)" span>
              <select className="input" value={form.turma_id || ""} onChange={(e) => set("turma_id", e.target.value)}>
                <option value="">Aguardando enturmação</option>
                {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </Campo>
          </div>
        </section>
      )}
    </div>
  );
}

export default function DashboardEscola({ data, onReload }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("secao") || "turmas";
  function setTab(k) {
    const next = new URLSearchParams(params);
    if (!k || k === "turmas") next.delete("secao");
    else next.set("secao", k);
    setParams(next, { replace: true });
  }
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [busca, setBusca] = useState([]);
  const [alunoDoc, setAlunoDoc] = useState(null);
  const [historicosAluno, setHistoricosAluno] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [filtroTexto, setFiltroTexto] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [relTurma, setRelTurma] = useState(data.turmas[0]?.id || "");
  const [relDisc, setRelDisc] = useState(data.disciplinas[0]?.id || "");
  const [salvando, setSalvando] = useState(false);
  const [confirmacao, setConfirmacao] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const ind = data.indicadores || {};
  const anosLetivos = [...new Set((data.turmas || []).map((t) => t.anoLetivo).filter(Boolean))];
  const periodo = anosLetivos.length === 1
    ? `Ano letivo ${anosLetivos[0]}`
    : anosLetivos.length > 1
      ? `Anos ${anosLetivos.join(" · ")}`
      : "";

  const aguardando = useMemo(
    () => (data.alunos || []).filter((a) => !a.turmaId && alunoAtivo(a)),
    [data.alunos],
  );

  const listaAlunos = useMemo(() => {
    const termo = filtroTexto.trim().toLowerCase();
    let lista = data.alunos || [];
    if (termo) {
      lista = lista.filter((a) =>
        (a.nome || "").toLowerCase().includes(termo) || (a.cpf || "").includes(termo),
      );
    }
    if (filtro === "ativos") lista = lista.filter(alunoAtivo);
    if (filtro === "inativos") lista = lista.filter((a) => a.situacao === "inativo");
    if (filtro === "semturma") lista = lista.filter((a) => !a.turmaId && alunoAtivo(a));
    return lista;
  }, [data.alunos, filtro, filtroTexto]);

  useEffect(() => {
    if (!alunoDoc?.id) {
      setHistoricosAluno([]);
      return;
    }
    let cancelado = false;
    request(`/api/alunos/${alunoDoc.id}/historicos`)
      .then((itens) => {
        if (!cancelado) setHistoricosAluno(Array.isArray(itens) ? itens : []);
      })
      .catch(() => {
        if (!cancelado) setHistoricosAluno([]);
      });
    return () => { cancelado = true; };
  }, [alunoDoc]);

  async function matricular() {
    setErro("");
    setSalvando(true);
    try {
      const payload = { ...form };
      if (!payload.turma_id) delete payload.turma_id;
      const r = await request("/api/alunos", { method: "POST", body: jsonBody(payload) });
      setModal(null);
      setMsg("Aluno salvo com sucesso.");
      await onReload();
      if (r.id && payload.turma_id) {
        try {
          await baixarPdf(`/api/alunos/${r.id}/documentos/comprovante-matricula.pdf`);
        } catch (e) {
          setErro(e.message || "Aluno salvo, mas não foi possível gerar a ficha de matrícula.");
        }
      }
    } catch (e) {
      setErro(e.message || "Não foi possível matricular.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao() {
    setErro("");
    setSalvando(true);
    try {
      await request(`/api/alunos/${form.id}`, { method: "PUT", body: jsonBody(form) });
      setModal(null);
      setMsg("Dados do aluno atualizados.");
      await onReload();
    } catch (e) {
      setErro(e.message || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  function inativar(id) {
    setConfirmacao({
      title: "Inativar aluno",
      message: "Inativar este aluno? O registro, o CPF, as notas e o histórico serão preservados.",
      confirmLabel: "Inativar",
      danger: true,
      acao: async () => {
        await request(`/api/alunos/${id}/inativar`, { method: "POST" });
        setMsg("Aluno inativado.");
        await onReload();
      },
    });
  }

  async function confirmarEnturmar() {
    setErro("");
    setSalvando(true);
    try {
      await request(`/api/alunos/${form.id}/enturmar`, {
        method: "POST",
        body: jsonBody({ turma_id: Number(form.turma_id) }),
      });
      setModal(null);
      setMsg("Aluno enturmado.");
      await onReload();
    } catch (e) {
      setErro(e.message || "Não foi possível enturmar.");
    } finally {
      setSalvando(false);
    }
  }

  async function criarTurma() {
    setErro("");
    setSalvando(true);
    try {
      await request("/api/turmas", {
        method: "POST",
        body: jsonBody({
          nome: form.nome,
          ano_letivo: form.ano_letivo,
          etapa: form.etapa,
          capacidade: form.capacidade || null,
          tipo_jornada: form.tipo_jornada || null,
          carga_horaria_diaria: form.carga_horaria_diaria || null,
          carga_horaria_anual: form.carga_horaria_anual || null,
        }),
      });
      setModal(null);
      setMsg("Turma criada.");
      onReload();
    } catch (e) {
      setErro(e.message || "Não foi possível criar a turma.");
    } finally {
      setSalvando(false);
    }
  }

  async function buscar(q) {
    if (!q || q.length < 2) { setBusca([]); return; }
    setBusca(await request(`/api/alunos/busca?q=${encodeURIComponent(q)}`));
  }

  function excluir(tipo, id, rotulo) {
    const pergunta = tipo === "turma"
      ? "Excluir esta turma? Se houver diário, notas, frequência ou histórico, a exclusão será recusada. Prefira encerrar o ano."
      : `Excluir ${rotulo || "este registro"}?`;
    setConfirmacao({
      title: "Excluir",
      message: pergunta,
      confirmLabel: "Excluir",
      danger: true,
      acao: async () => {
        await request(`/api/excluir/${tipo}/${id}`, { method: "DELETE" });
        setMsg(tipo === "disciplina" ? "Disciplina excluída." : "Registro excluído.");
        await onReload();
      },
    });
  }

  function resetarSenha(usuarioId) {
    if (!usuarioId) return;
    setConfirmacao({
      title: "Redefinir senha",
      message: "Gerar nova senha temporária? O usuário precisará defini-la no próximo acesso.",
      confirmLabel: "Gerar senha",
      acao: async () => {
        const r = await request(`/api/usuarios/${usuarioId}/resetar-senha`, { method: "POST" });
        avisarSenhaTemporaria(r, "reset");
        await onReload();
      },
    });
  }

  async function executarConfirmacao() {
    if (!confirmacao?.acao) return;
    setConfirmando(true);
    setErro("");
    try {
      await confirmacao.acao();
      setConfirmacao(null);
    } catch (e) {
      setErro(e.message || "Não foi possível concluir a operação.");
    } finally {
      setConfirmando(false);
    }
  }

  const visao = tab === "turmas" || tab === "historico";
  const qtdSemTurma = ind.alunosSemTurma ?? aguardando.length;
  const qtdRisco = ind.alunosEmRisco ?? 0;
  const qtdAulasPend = ind.registrosAulaPendentes ?? data.acompanhamentoPedagogico?.aulasPendentes ?? 0;
  const qtdDiarios = ind.diariosPendentes ?? 0;
  const qtdCarga = (data.acompanhamentoPedagogico?.itens || []).filter((i) => i.cargaHorariaNaoConfigurada).length;

  return (
    <>
      {visao ? (
        <>
          <PageHeader
            kicker="Gestão escolar"
            title={data.escola.nome}
            description={`INEP ${data.escola.inep}${periodo ? ` · ${periodo}` : ""}`}
          />

          <section className="section section-fold">
            <div className="grid-stats">
              <Kpi value={ind.alunosAtivos ?? 0} label="Alunos" />
              <Kpi value={ind.turmasAtivas ?? data.turmas.length} label="Turmas" />
              <Kpi value={ind.totalProfessores ?? data.professores.length} label="Professores" />
            </div>
          </section>

          <AtencaoNecessaria
            itens={[
              {
                id: "sem-turma",
                quantidade: qtdSemTurma,
                rotulo: rotuloQuantidade(qtdSemTurma, "aluno sem turma", "alunos sem turma"),
                onAction: () => { setFiltro("semturma"); setTab("alunos"); },
                acaoLabel: "Ver alunos",
              },
              {
                id: "risco",
                quantidade: qtdRisco,
                rotulo: rotuloQuantidade(qtdRisco, "aluno em risco", "alunos em risco"),
                critico: true,
              },
              {
                id: "aulas",
                quantidade: qtdAulasPend,
                rotulo: rotuloQuantidade(qtdAulasPend, "aula pendente de validação", "aulas pendentes de validação"),
                onAction: () => setTab("acompanhamento"),
                acaoLabel: "Ver",
              },
              {
                id: "diarios",
                quantidade: qtdDiarios,
                rotulo: rotuloQuantidade(qtdDiarios, "diário sem lançamento", "diários sem lançamento"),
                onAction: () => setTab("acompanhamento"),
                acaoLabel: "Ver",
              },
              {
                id: "carga",
                quantidade: qtdCarga,
                rotulo: rotuloQuantidade(qtdCarga, "alocação sem carga configurada", "alocações sem carga configurada"),
                onAction: () => setTab("acompanhamento"),
                acaoLabel: "Ver",
              },
              {
                id: "faltas-docentes",
                quantidade: ind.faltasDocentesAtivas ?? 0,
                rotulo: rotuloQuantidade(ind.faltasDocentesAtivas ?? 0, "falta docente registrada", "faltas docentes registradas"),
                onAction: () => nav("/faltas-docentes"),
                acaoLabel: "Ver relatório",
              },
            ]}
          />

          <section className="section section-fold">
            <div className="section-head">
              <h2 className="section-title">Ações rápidas</h2>
            </div>
            <div className="quick-actions">
              <button type="button" className="quick-action primary" onClick={() => { setErro(""); setForm(fichaDe({ turma_id: data.turmas[0]?.id })); setModal("matricula"); }}>
                <strong>Novo aluno</strong>
                <span>Matricular na escola</span>
              </button>
              <button type="button" className="quick-action" onClick={() => { setForm({ ano_letivo: new Date().getFullYear(), etapa: data.escola.ofertaFundamental ? "fundamental" : "infantil" }); setModal("turma"); }}>
                <strong>Nova turma</strong>
                <span>Abrir turma no ano</span>
              </button>
              <button type="button" className="quick-action" onClick={() => setTab("docs")}>
                <strong>Documentos</strong>
                <span>Histórico, boletim e declaração</span>
              </button>
            </div>
          </section>
        </>
      ) : null}

      <FeedbackMessage type="success">{msg}</FeedbackMessage>
      {erro && !modal && <FeedbackMessage type="danger">{erro}</FeedbackMessage>}

      {visao ? (
        <div className="tabs" role="tablist" aria-label="Turmas da escola">
          <button type="button" className={`tab ${tab === "turmas" ? "active" : ""}`} onClick={() => setTab("turmas")}>Em curso</button>
          <button type="button" className={`tab ${tab === "historico" ? "active" : ""}`} onClick={() => setTab("historico")}>Encerradas</button>
        </div>
      ) : null}

      {tab === "turmas" && (
        <>
        <div className="section-head">
          <div>
            <h2 className="section-title">Turmas em curso</h2>
            <p className="section-sub">Abra o diário, configure a jornada ou encerre o ano letivo.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setForm({ ano_letivo: new Date().getFullYear(), etapa: data.escola.ofertaFundamental ? "fundamental" : "infantil" }); setModal("turma"); }}>Nova turma</button>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Turma</th>
                  <th>Etapa</th>
                  <th>Jornada</th>
                  <th>Ano</th>
                  <th>Alunos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.turmas.map((t) => (
                  <tr key={t.id}>
                    <td><strong>{t.nome}</strong></td>
                    <td><span className="badge badge-light">{rotuloEtapa(t.etapaEnsino)}</span></td>
                    <td>{t.etapaEnsino === "infantil" ? rotuloJornada(t.tipoJornada) : "—"}</td>
                    <td>{t.anoLetivo}</td>
                    <td>
                      {t.qtdAlunos}
                      {t.capacidade ? <span className="muted"> / {t.capacidade}</span> : ""}
                    </td>
                    <td className="row-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => nav(`/turma/${t.id}`, { state: { voltarPara: "/", voltarRotulo: data.escola.nome } })}>Abrir diário</button>
                      {t.etapaEnsino === "infantil" && (
                        <button className="btn btn-sm btn-ghost" onClick={() => {
                          setForm({
                            id: t.id,
                            tipo_jornada: t.tipoJornada || "PARCIAL",
                            carga_horaria_diaria: t.cargaHorariaDiaria || "",
                            carga_horaria_anual: t.cargaHorariaAnual || "",
                          });
                          setModal("jornada");
                        }}>Jornada</button>
                      )}
                      <button className="btn btn-sm btn-outline-danger" onClick={() => {
                        setConfirmacao({
                          title: "Encerrar turma",
                          message: "Encerrar o ano desta turma? Esta é uma ação final do ciclo letivo.",
                          confirmLabel: "Encerrar ano",
                          danger: true,
                          acao: async () => {
                            await request(`/api/turmas/${t.id}/encerrar`, { method: "POST" });
                            setMsg("Turma encerrada.");
                            onReload();
                          },
                        });
                      }}>Encerrar ano</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => excluir("turma", t.id, t.nome)}>Excluir</button>
                    </td>
                  </tr>
                ))}
                {!data.turmas.length && (
                  <tr><td colSpan="6"><EmptyState title="Nenhuma turma ativa" >Cadastre uma turma para começar.</EmptyState></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {tab === "historico" && (
        <>
        <div className="section-head">
          <div>
            <h2 className="section-title">Turmas encerradas</h2>
            <p className="section-sub">Anos letivos já concluídos nesta escola.</p>
          </div>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Turma</th><th>Ano</th><th></th></tr></thead>
              <tbody>
                {data.historico.map((t) => (
                  <tr key={t.id}>
                    <td>{t.nome}</td>
                    <td>{t.anoLetivo}</td>
                    <td className="row-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => nav(`/turma/${t.id}`, { state: { voltarPara: "/?secao=historico", voltarRotulo: data.escola.nome } })}>Ver</button>
                    </td>
                  </tr>
                ))}
                {!data.historico.length && (
                  <tr><td colSpan="3"><EmptyState title="Nenhuma turma encerrada" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {tab === "alunos" && (
        <>
          <PageHeader
            kicker={data.escola.nome}
            title="Alunos"
            description="Gerencie os estudantes matriculados nesta unidade."
            actions={<button className="btn btn-primary" onClick={() => { setErro(""); setForm(fichaDe({ turma_id: data.turmas[0]?.id })); setModal("matricula"); }}>Novo aluno</button>}
          />
          {!!aguardando.length && (
            <div className="card mb">
              <div className="card-header">Aguardando enturmação</div>
              <div className="table-wrap">
              <table>
                <thead><tr><th>Nome</th><th>CPF</th><th></th></tr></thead>
                <tbody>
                  {aguardando.map((a) => (
                    <tr key={a.id}>
                      <td>{a.nome}</td>
                      <td>{a.cpf}</td>
                      <td className="row-actions">
                        <button className="btn btn-sm btn-primary" onClick={() => { setErro(""); setForm({ id: a.id, nome: a.nome, turma_id: data.turmas[0]?.id }); setModal("enturmar"); }}>Enturmar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
          <div className="card">
            <div className="card-body">
              <div className="toolbar mb">
                <input className="input input-filter" placeholder="Buscar por nome ou CPF" value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} aria-label="Buscar aluno" />
                <div className="tabs" role="tablist" aria-label="Filtro de alunos">
                  {[["todos", "Todos"], ["ativos", "Ativos"], ["inativos", "Inativos"], ["semturma", "Sem turma"]].map(([k, l]) => (
                    <button key={k} className={`tab ${filtro === k ? "active" : ""}`} onClick={() => setFiltro(k)}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="table-wrap">
                <table>
                <thead><tr><th>Nome</th><th>CPF</th><th>Turma</th><th>Situação</th><th></th></tr></thead>
                <tbody>
                  {listaAlunos.map((a) => (
                    <tr key={a.id}>
                      <td>{a.nome}</td>
                      <td>{a.cpf}</td>
                      <td>{a.turmaNome || <span className="muted">Sem turma</span>}</td>
                      <td>
                        <span className={`badge ${alunoAtivo(a) ? "badge-ok" : a.situacao === "inativo" ? "badge-light" : "badge-warn"}`}>
                          {rotuloSituacaoAluno(a.situacao)}
                        </span>
                      </td>
                      <td className="row-actions">
                        <button type="button" className="btn btn-sm btn-outline" onClick={() => { setErro(""); setAlunoDoc(a); setTab("docs"); }}>
                          <i className="fas fa-file-pdf" aria-hidden="true" /> Documentos
                        </button>
                        <button className="btn btn-sm btn-outline" onClick={() => { setErro(""); setForm(fichaDe(a)); setModal("editar"); }}>Editar</button>
                        {alunoAtivo(a) && !a.turmaId && (
                          <button className="btn btn-sm btn-primary" onClick={() => { setErro(""); setForm({ id: a.id, nome: a.nome, turma_id: data.turmas[0]?.id }); setModal("enturmar"); }}>Enturmar</button>
                        )}
                        {a.situacao !== "inativo" && (
                          <button className="btn btn-sm btn-outline-danger" onClick={() => inativar(a.id)}>Inativar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!listaAlunos.length && <tr><td colSpan="5"><EmptyState title="Nenhum aluno encontrado">{filtroTexto || filtro !== "todos" ? "Nenhum registro corresponde aos filtros selecionados." : "Cadastre um aluno para começar."}</EmptyState></td></tr>}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "professores" && (
        <>
          <PageHeader
            kicker={data.escola.nome}
            title="Professores"
            description="Cadastro da unidade e vínculo com turmas."
            actions={(
              <div className="flex flex-wrap">
                <button className="btn btn-outline" onClick={() => setTab("disciplinas")}>Disciplinas</button>
                <button className="btn btn-primary" onClick={() => { setForm(camposCargaDe({})); setModal("alocar"); }}>Vincular à turma</button>
              </div>
            )}
          />
        <div className="card">
          <div className="card-header toolbar">
            <span>Professores</span>
            <button className="btn btn-sm btn-outline" onClick={() => { setForm(camposCargaDe({})); setModal("alocar"); }}>Vincular</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>CPF</th><th></th></tr></thead>
              <tbody>
                {data.professores.map((p) => (
                  <tr key={p.id}>
                    <td>{p.nome}</td>
                    <td>{p.cpf}</td>
                    <td className="row-actions">
                      {p.usuarioId ? (
                        <button className="btn btn-sm btn-ghost" onClick={() => resetarSenha(p.usuarioId)}>
                          Redefinir senha
                        </button>
                      ) : null}
                      <button className="btn btn-sm btn-outline-danger" onClick={() => excluir("professor", p.id, `o professor ${p.nome}`)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {!data.professores.length && (
                  <tr><td colSpan="3"><EmptyState title="Nenhum professor cadastrado" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {tab === "disciplinas" && (
        <>
          <PageHeader
            kicker={data.escola.nome}
            title="Disciplinas"
            description="Composição curricular usada nas alocações desta escola."
            actions={(
              <div className="flex flex-wrap">
                <button className="btn btn-outline" onClick={() => setTab("professores")}>Professores</button>
                <button className="btn btn-primary" onClick={() => { setForm({}); setModal("disc"); }}>Nova disciplina</button>
              </div>
            )}
          />
        <div className="card">
          <div className="card-header toolbar">
            <span>Disciplinas</span>
            <button className="btn btn-sm btn-outline" onClick={() => { setForm({}); setModal("disc"); }}>Nova disciplina</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Disciplina</th><th></th></tr></thead>
              <tbody>
                {data.disciplinas.map((d) => (
                  <tr key={d.id}>
                    <td>{d.nome}</td>
                    <td className="row-actions">
                      <button className="btn btn-sm btn-outline-danger" onClick={() => excluir("disciplina", d.id, `a disciplina ${d.nome}`)}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
                {!data.disciplinas.length && (
                  <tr><td colSpan="2"><EmptyState title="Nenhuma disciplina cadastrada">Cadastre uma disciplina para começar.</EmptyState></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {tab === "calendario" && <CalendarioLetivo somenteLeitura />}

      {tab === "acompanhamento" && (
        <section className="section">
          <PageHeader
            kicker={data.escola.nome}
            title="Acompanhamento"
            description="Progresso anual e cumprimento até hoje por turma, disciplina e professor."
            actions={(
              <div className="flex flex-wrap">
                <button type="button" className="btn btn-outline" onClick={() => setModal("falta")}>Registrar falta docente</button>
                <button type="button" className="btn btn-outline" onClick={() => nav("/faltas-docentes")}>Faltas docentes</button>
              </div>
            )}
          />
          {(data.acompanhamentoPedagogico?.limitacaoCalendario) && (
            <div className="alert alert-info mb">
              {data.acompanhamentoPedagogico.observacaoCalendario || "Sem calendário letivo: o cumprimento até a data não pode ser calculado."}
            </div>
          )}
          <div className="grid-stats mb">
            <Kpi icon="fa-clock" value={data.acompanhamentoPedagogico?.cargaPrevista ?? "—"} label="Carga anual prevista" />
            <Kpi icon="fa-calendar-check" value={data.acompanhamentoPedagogico?.aulasPrevistasAteHoje ?? "—"} label="Previstas até hoje" />
            <Kpi icon="fa-check" value={data.acompanhamentoPedagogico?.aulasValidadas ?? 0} label="Aulas validadas" />
            <Kpi icon="fa-percent" value={data.acompanhamentoPedagogico?.percentualCumprimentoAteHoje == null ? "Sem previsão até a data" : `${data.acompanhamentoPedagogico.percentualCumprimentoAteHoje}%`} label="% até hoje" />
          </div>
          <div className="card mb">
            <div className="card-header">Cumprimento até hoje</div>
            <div className="card-body">
              <GraficoCarga
                itens={data.acompanhamentoPedagogico?.itens}
                rotulo={(i) => `${i.turmaNome} · ${i.disciplinaNome} · ${i.professorNome}`}
              />
            </div>
          </div>
          <div className="card mb">
            <TabelaAcompanhamento
              itens={data.acompanhamentoPedagogico?.itens}
              onEditar={(i) => {
                setForm({ ...camposCargaDe(i), alocacaoId: i.alocacaoId });
                setModal("carga");
              }}
            />
          </div>
          <div className="card">
            <div className="card-header">Educação Infantil</div>
            <TabelaEducacaoInfantil itens={data.acompanhamentoPedagogico?.educacaoInfantil} />
          </div>
          <div className="card mt">
            <div className="card-header">Ocorrências da escola</div>
            <div className="card-body">
              <ListaOcorrenciasEscola recarregarChave={modal} aviso={msg} onChanged={onReload} />
            </div>
          </div>
        </section>
      )}

      {tab === "docs" && (
        <>
          <PageHeader
            kicker={data.escola.nome}
            title="Documentos"
            description="Histórico escolar, histórico para transferência, boletim e dados anteriores ao Educa+."
          />
        <div className="card">
          <div className="card-body">
            <h3 className="section-title">Relatório de turma por disciplina</h3>
            <div className="grid grid-3 mb">
              <div>
                <label className="label">Turma</label>
                <select className="input" value={relTurma} onChange={(e) => setRelTurma(e.target.value)}>
                  <option value="">Selecione</option>
                  {data.turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Disciplina</label>
                <select className="input" value={relDisc} onChange={(e) => setRelDisc(e.target.value)}>
                  <option value="">Selecione</option>
                  {data.disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
                </select>
              </div>
              <div className="field-actions">
                <BotaoPdf
                  url={`/api/turmas/${relTurma}/documentos/rendimento/${relDisc}.pdf`}
                  disabled={!relTurma || !relDisc}
                >
                  Gerar ficha de rendimento
                </BotaoPdf>
              </div>
            </div>
            <hr className="sep" />
            <label className="label">Buscar aluno para emitir documento</label>
            <div className="rel">
              <input className="input" placeholder="Nome ou CPF" onChange={(e) => buscar(e.target.value)} />
              {!!busca.length && (
                <div className="sugestoes">
                  {busca.map((a) => (
                    <button type="button" key={a.id} className="sugestao" onClick={() => { setAlunoDoc(a); setBusca([]); }}>
                      <strong>{a.nome}</strong> <span className="muted">{a.cpf} · {a.turma}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {alunoDoc && (
              <div className="mt docs-actions">
                <strong>{alunoDoc.nome}</strong>
                <AcoesDocumentosAluno
                  alunoId={alunoDoc.id}
                  aluno={alunoDoc}
                  historicoTransferencia={historicoTransferenciaVisivel(alunoDoc)}
                />
                <div className="docs-block">
                  <TrajetoriaLegadaAluno alunoId={alunoDoc.id} />
                </div>
                {!!historicosAluno.length && (
                  <div className="mt">
                    <p className="label">Documentos de anos anteriores</p>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Ano</th>
                            <th>Escola</th>
                            <th>Turma</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {historicosAluno.map((h) => (
                            <tr key={h.historico_id}>
                              <td>{h.ano_letivo}</td>
                              <td>{h.escola_nome}</td>
                              <td>{h.turma_nome}</td>
                              <td className="row-actions">
                                {h.documento === "boletim" && (
                                  <BotaoPdf url={`/api/historicos/${h.historico_id}/boletim.pdf`}>Gerar boletim</BotaoPdf>
                                )}
                                {h.documento === "parecer" && (
                                  <BotaoPdf url={`/api/historicos/${h.historico_id}/parecer.pdf`}>Gerar parecer</BotaoPdf>
                                )}
                                {!h.documento && <span className="muted">Registro legado insuficiente</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </>
      )}

      {modal === "matricula" && (
        <Modal title="Ficha de matrícula" large onClose={() => !salvando && setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" onClick={matricular} disabled={salvando}>{salvando ? "Salvando..." : "Salvar matrícula"}</button>
            </>
          }>
          {erro && <div className="alert alert-danger">{erro}</div>}
          <CamposFicha form={form} setForm={setForm} turmas={data.turmas} />
        </Modal>
      )}

      {modal === "editar" && (
        <Modal title="Editar aluno" large onClose={() => !salvando && setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarEdicao} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
            </>
          }>
          {erro && <div className="alert alert-danger">{erro}</div>}
          <CamposFicha form={form} setForm={setForm} />
        </Modal>
      )}

      {modal === "enturmar" && (
        <Modal title={`Enturmar ${form.nome || "aluno"}`} onClose={() => !salvando && setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarEnturmar} disabled={salvando}>{salvando ? "Salvando..." : "Confirmar enturmação"}</button>
            </>
          }>
          {erro && <div className="alert alert-danger">{erro}</div>}
          <Field id="enturmar-turma" label="Turma da escola" required>
            <select id="enturmar-turma" className="input" value={form.turma_id || ""} onChange={(e) => setForm({ ...form, turma_id: e.target.value })}>
              <option value="">Selecione</option>
              {data.turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}{t.capacidade ? ` (${t.qtdAlunos}/${t.capacidade})` : ""}
                </option>
              ))}
            </select>
          </Field>
        </Modal>
      )}

      {modal === "turma" && (
        <Modal title="Nova turma" onClose={() => !salvando && setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" onClick={criarTurma} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
            </>
          }>
          <FeedbackMessage type="danger">{erro}</FeedbackMessage>
          <Field id="turma-nome" label="Nome" required>
            <input id="turma-nome" className="input" value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field id="turma-etapa" label="Etapa">
            <select id="turma-etapa" className="input" value={form.etapa || "fundamental"} onChange={(e) => setForm({ ...form, etapa: e.target.value })}>
              {data.escola.ofertaFundamental && <option value="fundamental">Ensino Fundamental</option>}
              {data.escola.ofertaInfantil && <option value="infantil">Educação Infantil</option>}
              <option value="eja">EJA</option>
            </select>
          </Field>
          <Field id="turma-ano" label="Ano letivo" required>
            <input id="turma-ano" className="input" type="number" value={form.ano_letivo || ""} onChange={(e) => setForm({ ...form, ano_letivo: e.target.value })} />
          </Field>
          <Field id="turma-cap" label="Capacidade" help="Deixe vazio para ilimitada.">
            <input id="turma-cap" className="input" type="number" min="1" value={form.capacidade || ""} onChange={(e) => setForm({ ...form, capacidade: e.target.value })} />
          </Field>
          {form.etapa === "infantil" && (
            <>
              <Field id="turma-jornada" label="Jornada">
                <select id="turma-jornada" className="input" value={form.tipo_jornada || ""} onChange={(e) => setForm({ ...form, tipo_jornada: e.target.value })}>
                  <option value="">Não informada</option>
                  <option value="PARCIAL">Parcial</option>
                  <option value="INTEGRAL">Integral</option>
                </select>
              </Field>
              <Field id="turma-chd" label="Carga diária (horas)">
                <input id="turma-chd" className="input" type="number" min="0" step="0.5" value={form.carga_horaria_diaria || ""} onChange={(e) => setForm({ ...form, carga_horaria_diaria: e.target.value })} />
              </Field>
              <Field id="turma-cha" label="Carga anual prevista (horas)">
                <input id="turma-cha" className="input" type="number" min="0" step="0.5" value={form.carga_horaria_anual || ""} onChange={(e) => setForm({ ...form, carga_horaria_anual: e.target.value })} />
              </Field>
            </>
          )}
        </Modal>
      )}

      {modal === "disc" && (
        <Modal title="Nova disciplina" onClose={() => !salvando && setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" disabled={salvando} onClick={async () => {
                setErro("");
                setSalvando(true);
                try {
                  await request("/api/disciplinas", { method: "POST", body: jsonBody({ nome: form.nome }) });
                  setModal(null);
                  setMsg("Disciplina adicionada.");
                  onReload();
                } catch (e) {
                  setErro(e.message || "Não foi possível adicionar a disciplina.");
                } finally {
                  setSalvando(false);
                }
              }}>{salvando ? "Salvando..." : "Salvar"}</button>
            </>
          }>
          <FeedbackMessage type="danger">{erro}</FeedbackMessage>
          <Field id="disc-nome" label="Nome" required>
            <input id="disc-nome" className="input" value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
        </Modal>
      )}

      {modal === "alocar" && (
        <Modal title="Vincular professor" onClose={() => !salvando && setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" disabled={salvando} onClick={async () => {
                setErro("");
                setSalvando(true);
                try {
                  await request("/api/alocacoes", { method: "POST", body: jsonBody(payloadCarga(form)) });
                  setModal(null);
                  setMsg("Alocação salva.");
                  onReload();
                } catch (e) {
                  setErro(e.message || "Não foi possível salvar a alocação.");
                } finally {
                  setSalvando(false);
                }
              }}>{salvando ? "Salvando..." : "Salvar"}</button>
            </>
          }>
          <FeedbackMessage type="danger">{erro}</FeedbackMessage>
          <CamposCargaAlocacao
            form={form}
            setForm={setForm}
            professores={data.professores}
            turmas={data.turmas}
            disciplinas={data.disciplinas}
            infantil={data.turmas.find((t) => String(t.id) === String(form.turma_id))?.etapaEnsino === "infantil"}
          />
        </Modal>
      )}

      {modal === "carga" && (
        <Modal title="Carga e grade semanal" onClose={() => !salvando && setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" disabled={salvando} onClick={async () => {
                setErro("");
                setSalvando(true);
                try {
                  await request(`/api/alocacoes/${form.alocacaoId}`, { method: "PUT", body: jsonBody(payloadCarga(form)) });
                  setModal(null);
                  setMsg("Alocação salva.");
                  onReload();
                } catch (e) {
                  setErro(e.message || "Não foi possível salvar.");
                } finally {
                  setSalvando(false);
                }
              }}>{salvando ? "Salvando..." : "Salvar"}</button>
            </>
          }>
          <CamposCargaAlocacao form={form} setForm={setForm} />
        </Modal>
      )}

      {modal === "jornada" && (
        <Modal title="Jornada da Educação Infantil" onClose={() => !salvando && setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" disabled={salvando} onClick={async () => {
                setErro("");
                setSalvando(true);
                try {
                  await request(`/api/turmas/${form.id}`, { method: "PUT", body: jsonBody({
                    tipo_jornada: form.tipo_jornada,
                    carga_horaria_diaria: form.carga_horaria_diaria,
                    carga_horaria_anual: form.carga_horaria_anual,
                  }) });
                  setModal(null);
                  setMsg("Turma atualizada.");
                  onReload();
                } catch (e) {
                  setErro(e.message || "Não foi possível salvar a jornada.");
                } finally {
                  setSalvando(false);
                }
              }}>{salvando ? "Salvando..." : "Salvar"}</button>
            </>
          }>
          <Field id="jornada-tipo" label="Jornada">
            <select id="jornada-tipo" className="input" value={form.tipo_jornada || ""} onChange={(e) => setForm({ ...form, tipo_jornada: e.target.value })}>
              <option value="PARCIAL">Parcial</option>
              <option value="INTEGRAL">Integral</option>
            </select>
          </Field>
          <Field id="jornada-diaria" label="Carga diária (horas)">
            <input id="jornada-diaria" className="input" type="number" min="0" step="0.5" value={form.carga_horaria_diaria || ""} onChange={(e) => setForm({ ...form, carga_horaria_diaria: e.target.value })} />
          </Field>
          <Field id="jornada-anual" label="Carga anual prevista (horas)">
            <input id="jornada-anual" className="input" type="number" min="0" step="0.5" value={form.carga_horaria_anual || ""} onChange={(e) => setForm({ ...form, carga_horaria_anual: e.target.value })} />
          </Field>
        </Modal>
      )}
      {modal === "falta" && (
        <RegistrarFaltaDocenteModal
          onClose={() => setModal(null)}
          onSaved={(texto) => {
            setModal(null);
            setMsg(texto);
            onReload();
          }}
        />
      )}
      <ConfirmModal
        open={!!confirmacao}
        title={confirmacao?.title}
        message={confirmacao?.message}
        confirmLabel={confirmacao?.confirmLabel}
        danger={!!confirmacao?.danger}
        busy={confirmando}
        onCancel={() => !confirmando && setConfirmacao(null)}
        onConfirm={executarConfirmacao}
      />
    </>
  );
}
