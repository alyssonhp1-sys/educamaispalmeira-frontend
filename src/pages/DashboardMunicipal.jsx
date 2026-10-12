import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Modal from "../components/Modal.jsx";
import Kpi from "../components/Kpi.jsx";
import { request, jsonBody } from "../api.js";
import { GraficoCarga, rotuloPctAteHoje } from "../components/DiarioAula.jsx";
import CalendarioLetivo from "../components/CalendarioLetivo.jsx";
import { CamposCargaAlocacao, camposCargaDe, payloadCarga } from "../components/CargaAlocacao.jsx";
import { MEDIA_MINIMA_PADRAO } from "../notas.js";
import { avisarSenhaTemporaria, rotuloEtapa, rotuloQuantidade } from "../ui.js";
import { AcoesDocumentosAluno, BotaoPdf, historicoTransferenciaVisivel } from "../components/DocumentosAluno.jsx";
import TrajetoriaLegadaAluno from "../components/TrajetoriaLegada.jsx";
import { ActionMenu, AtencaoNecessaria, ConfirmModal, EmptyState, FeedbackMessage, Field, PageHeader } from "../components/uiKit.jsx";

export default function DashboardMunicipal({ data, onReload }) {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const secao = params.get("secao") || "rede";
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const mediaAtual = data.configuracaoAcademica?.mediaMinima ?? MEDIA_MINIMA_PADRAO;
  const ind = data.indicadores || {};
  const [mediaMinima, setMediaMinima] = useState(mediaAtual);
  const [senhaConfirmacao, setSenhaConfirmacao] = useState("");
  const [cfgMsg, setCfgMsg] = useState("");
  const [cfgErro, setCfgErro] = useState("");
  const [erroAcao, setErroAcao] = useState("");
  const [msgAcao, setMsgAcao] = useState("");
  const [salvandoCfg, setSalvandoCfg] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [matriz, setMatriz] = useState(null);
  const [filtroEtapa, setFiltroEtapa] = useState("fundamental");
  const [filtroAno, setFiltroAno] = useState("");
  const [buscaDoc, setBuscaDoc] = useState([]);
  const [alunoDoc, setAlunoDoc] = useState(null);
  const [historicosAluno, setHistoricosAluno] = useState([]);
  const [confirmacao, setConfirmacao] = useState(null);
  const [confirmando, setConfirmando] = useState(false);
  const [abaUsuarios, setAbaUsuarios] = useState("dirigentes");

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

  async function buscarAlunoDoc(q) {
    if (q.length < 2) { setBuscaDoc([]); return; }
    setBuscaDoc(await request(`/api/alunos/busca?q=${encodeURIComponent(q)}`));
  }

  useEffect(() => {
    if (secao !== "matriz") return;
    const q = new URLSearchParams();
    if (filtroEtapa) q.set("etapa", filtroEtapa);
    if (filtroAno) q.set("ano_letivo", filtroAno);
    request(`/api/matriz-cargas?${q.toString()}`)
      .then(setMatriz)
      .catch(() => setMatriz({ itens: [] }));
  }, [secao, filtroEtapa, filtroAno]);

  async function salvarEscola() {
    setErroAcao("");
    setSalvando(true);
    try {
      const r = await request("/api/escolas", {
        method: "POST",
        body: jsonBody({
          nome: form.nome,
          inep: form.inep,
          oferta_infantil: !!form.ofertaInfantil,
          oferta_fundamental: !!form.ofertaFundamental,
        }),
      });
      setModal(null);
      avisarSenhaTemporaria(r);
      setMsgAcao("Escola cadastrada.");
      onReload();
    } catch (e) {
      setErroAcao(e.message || "Não foi possível cadastrar a escola.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConfig() {
    setErroAcao("");
    setSalvando(true);
    try {
      await request(`/api/escolas/${form.id}`, {
        method: "PUT",
        body: jsonBody({
          oferta_infantil: !!form.ofertaInfantil,
          oferta_fundamental: !!form.ofertaFundamental,
        }),
      });
      setModal(null);
      setMsgAcao("Etapas da escola atualizadas.");
      onReload();
    } catch (e) {
      setErroAcao(e.message || "Não foi possível atualizar a escola.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarConfigAcademica() {
    setCfgMsg("");
    setCfgErro("");
    setSalvandoCfg(true);
    try {
      const r = await request("/api/configuracao-academica", {
        method: "PUT",
        body: jsonBody({
          mediaMinima: Number(String(mediaMinima).replace(",", ".")),
          senhaConfirmacao,
        }),
      });
      setCfgMsg(r.mensagem || "Configuração acadêmica atualizada.");
      setSenhaConfirmacao("");
      await onReload();
    } catch (e) {
      setCfgErro(e.message || "Não foi possível salvar a configuração.");
    } finally {
      setSalvandoCfg(false);
    }
  }

  async function executarConfirmacao() {
    if (!confirmacao?.acao) return;
    setConfirmando(true);
    setErroAcao("");
    try {
      await confirmacao.acao();
      setConfirmacao(null);
    } catch (e) {
      setErroAcao(e.message || "Não foi possível concluir a operação.");
    } finally {
      setConfirmando(false);
    }
  }

  function pedirExclusao(tipo, id, rotulo) {
    setConfirmacao({
      title: "Excluir registro",
      message: `Excluir ${rotulo}? A exclusão só será concluída se não houver vínculos que impeçam.`,
      confirmLabel: "Excluir",
      danger: true,
      acao: async () => {
        await request(`/api/excluir/${tipo}/${id}`, { method: "DELETE" });
        setMsgAcao("Registro excluído.");
        await onReload();
      },
    });
  }

  function pedirResetSenha(usuarioId) {
    if (!usuarioId) return;
    setConfirmacao({
      title: "Redefinir senha",
      message: "Gerar nova senha temporária? O usuário precisará defini-la no próximo acesso.",
      confirmLabel: "Gerar senha",
      danger: false,
      acao: async () => {
        const r = await request(`/api/usuarios/${usuarioId}/resetar-senha`, { method: "POST" });
        avisarSenhaTemporaria(r, "reset");
        await onReload();
      },
    });
  }

  async function gerarDiretor(escolaId) {
    setErroAcao("");
    setSalvando(true);
    try {
      const r = await request(`/api/escolas/${escolaId}/diretor`, { method: "POST" });
      avisarSenhaTemporaria(r);
      setMsgAcao("Dirigente escolar gerado.");
      onReload();
    } catch (e) {
      setErroAcao(e.message || "Não foi possível gerar o dirigente.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarCargaMatriz() {
    setErroAcao("");
    setSalvando(true);
    try {
      await request(`/api/alocacoes/${form.alocacaoId}`, {
        method: "PUT",
        body: jsonBody(payloadCarga(form)),
      });
      setModal(null);
      setMsgAcao("Carga atualizada.");
      const q = new URLSearchParams();
      if (filtroEtapa) q.set("etapa", filtroEtapa);
      if (filtroAno) q.set("ano_letivo", filtroAno);
      setMatriz(await request(`/api/matriz-cargas?${q.toString()}`));
    } catch (e) {
      setErroAcao(e.message || "Não foi possível salvar a carga.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarCoordenador() {
    setErroAcao("");
    setSalvando(true);
    try {
      const r = await request(`/api/escolas/${form.escolaId}/coordenadores`, {
        method: "POST",
        body: jsonBody({ login: form.login, nome: form.nome }),
      });
      setModal(null);
      avisarSenhaTemporaria(r);
      setMsgAcao("Coordenador adicionado.");
      onReload();
    } catch (e) {
      setErroAcao(e.message || "Não foi possível adicionar o coordenador.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarProfessor() {
    setErroAcao("");
    setSalvando(true);
    try {
      const r = await request("/api/professores", {
        method: "POST",
        body: jsonBody({ nome: form.nome, cpf: form.cpf, escola_id: form.escolaId }),
      });
      setModal(null);
      avisarSenhaTemporaria(r);
      setMsgAcao("Professor adicionado.");
      onReload();
    } catch (e) {
      setErroAcao(e.message || "Não foi possível adicionar o professor.");
    } finally {
      setSalvando(false);
    }
  }

  const confirmEl = (
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
  );

  if (secao === "calendario") {
    return <CalendarioLetivo somenteLeitura={false} />;
  }

  if (secao === "docs") {
    return (
      <section className="section">
        <PageHeader
          title="Documentos oficiais"
          description="Localize o aluno da rede e emita o histórico escolar, o histórico para transferência ou os dados anteriores ao Educa+."
        />
        <div className="card">
          <div className="card-body">
            <Field id="busca-aluno-doc" label="Buscar aluno">
              <div className="rel">
                <input id="busca-aluno-doc" className="input" placeholder="Nome ou CPF" onChange={(e) => buscarAlunoDoc(e.target.value)} />
                {!!buscaDoc.length && (
                  <div className="sugestoes">
                    {buscaDoc.map((a) => (
                      <button type="button" key={a.id} className="sugestao" onClick={() => { setAlunoDoc(a); setBuscaDoc([]); }}>
                        <strong>{a.nome}</strong> <span className="muted">{a.cpf} · {a.turma}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
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
                  <div className="mt docs-block">
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
      </section>
    );
  }

  if (secao === "matriz") {
    return (
      <section className="section">
        <PageHeader
          title="Matriz e cargas horárias"
          description="Edição da carga na alocação professor, turma e disciplina. Não duplica a matriz curricular."
        />
        <FeedbackMessage type="danger">{erroAcao}</FeedbackMessage>
        <FeedbackMessage type="success">{msgAcao}</FeedbackMessage>
        <div className="toolbar mb">
          <select className="input input-narrow" value={filtroEtapa} onChange={(e) => setFiltroEtapa(e.target.value)} aria-label="Etapa">
            <option value="fundamental">Ensino Fundamental</option>
            <option value="infantil">Educação Infantil</option>
          </select>
          <input className="input input-narrow" type="number" placeholder="Ano letivo" value={filtroAno} onChange={(e) => setFiltroAno(e.target.value)} aria-label="Ano letivo" />
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Escola</th>
                  <th>Turma</th>
                  <th>Etapa</th>
                  <th>Disciplina</th>
                  <th>Professor</th>
                  <th>Carga anual</th>
                  <th>Aulas/semana</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(matriz?.itens || []).map((i) => (
                  <tr key={i.alocacaoId}>
                    <td>{i.escolaNome}</td>
                    <td>{i.turmaNome}</td>
                    <td>{rotuloEtapa(i.etapaEnsino)}</td>
                    <td>{i.disciplinaNome || "—"}</td>
                    <td>{i.professorNome}</td>
                    <td>{i.cargaHorariaNaoConfigurada ? "Não configurada" : (i.cargaHorariaPrevista ?? "—")}</td>
                    <td>{i.aulasSemanais ?? "—"}</td>
                    <td>
                      {i.etapaEnsino !== "infantil" && (
                        <button className="btn btn-sm btn-outline" onClick={() => { setForm({ ...camposCargaDe(i), alocacaoId: i.alocacaoId }); setModal("carga"); }}>Editar</button>
                      )}
                    </td>
                  </tr>
                ))}
                {!(matriz?.itens || []).length && (
                  <tr>
                    <td colSpan="8">
                      <EmptyState
                        title={filtroEtapa === "infantil" ? "Carga da Educação Infantil" : "Nenhuma alocação neste filtro"}
                      >
                        {filtroEtapa === "infantil"
                          ? "A carga da Educação Infantil é configurada na turma (jornada e carga diária/anual), não por disciplina."
                          : "Nenhum registro corresponde aos filtros selecionados."}
                      </EmptyState>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {modal === "carga" && (
          <Modal
            title="Carga e grade semanal"
            onClose={() => !salvando && setModal(null)}
            footer={(
              <>
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
                <button className="btn btn-primary" onClick={salvarCargaMatriz} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
              </>
            )}
          >
            <CamposCargaAlocacao form={form} setForm={setForm} />
          </Modal>
        )}
      </section>
    );
  }

  const aulasPendentesRede = ind.registrosAulaPendentes
    ?? (data.acompanhamentoPedagogico?.escolas || []).reduce((n, e) => n + (e.aulasPendentes || 0), 0);
  const atencaoRede = [
    { id: "risco", quantidade: ind.alunosEmRisco ?? 0, rotulo: rotuloQuantidade(ind.alunosEmRisco ?? 0, "aluno em risco", "alunos em risco"), critico: true },
    { id: "sem-turma", quantidade: ind.alunosSemTurma ?? 0, rotulo: rotuloQuantidade(ind.alunosSemTurma ?? 0, "aluno sem turma", "alunos sem turma") },
    {
      id: "aulas",
      quantidade: aulasPendentesRede,
      rotulo: rotuloQuantidade(aulasPendentesRede, "aula pendente de validação", "aulas pendentes de validação"),
      onAction: () => document.getElementById("acompanhamento-rede")?.scrollIntoView({ behavior: "smooth", block: "start" }),
      acaoLabel: "Ver escolas",
    },
    {
      id: "faltas-docentes",
      quantidade: ind.faltasDocentesAtivas ?? 0,
      rotulo: rotuloQuantidade(ind.faltasDocentesAtivas ?? 0, "falta docente registrada", "faltas docentes registradas"),
      onAction: () => nav("/faltas-docentes"),
      acaoLabel: "Ver relatório",
    },
  ];
  const acompPorEscola = Object.fromEntries(
    (data.acompanhamentoPedagogico?.escolas || []).map((e) => [e.escolaId, e]),
  );

  if (secao === "usuarios") {
    const grupos = [
      ["dirigentes", "Dirigentes escolares", data.gestores, (g) => (
        <tr key={g.id}>
          <td>{g.nome || g.login}</td>
          <td>{g.login}</td>
          <td>{g.escolaNome}</td>
          <td className="row-actions">
            <button className="btn btn-sm btn-ghost" onClick={() => pedirResetSenha(g.id)}>Redefinir senha</button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => pedirExclusao("usuario", g.id, `o usuário ${g.login}`)}>Excluir</button>
          </td>
        </tr>
      )],
      ["coordenadores", "Coordenadores", data.coordenadores, (c) => (
        <tr key={c.id}>
          <td>{c.nome}</td>
          <td>{c.login}</td>
          <td>{c.escolaNome}</td>
          <td className="row-actions">
            <button className="btn btn-sm btn-ghost" onClick={() => pedirResetSenha(c.id)}>Redefinir senha</button>
            <button className="btn btn-sm btn-outline-danger" onClick={() => pedirExclusao("usuario", c.id, `o coordenador ${c.nome}`)}>Excluir</button>
          </td>
        </tr>
      )],
      ["professores", "Professores", data.professores, (p) => (
        <tr key={p.id}>
          <td>{p.nome}</td>
          <td>{p.cpf}</td>
          <td>{p.escolaNome}</td>
          <td className="row-actions">
            {p.usuarioId ? <button className="btn btn-sm btn-ghost" onClick={() => pedirResetSenha(p.usuarioId)}>Redefinir senha</button> : null}
            <button className="btn btn-sm btn-outline-danger" onClick={() => pedirExclusao("professor", p.id, `o professor ${p.nome}`)}>Excluir</button>
          </td>
        </tr>
      )],
    ];
    const grupo = grupos.find(([k]) => k === abaUsuarios) || grupos[0];
    return (
      <>
        <PageHeader
          title="Usuários"
          description="Dirigentes escolares, coordenadores e professores da rede."
          actions={(
            <div className="flex flex-wrap">
              <button className="btn btn-outline" onClick={() => { setErroAcao(""); setForm({ escolaId: data.escolas[0]?.id }); setModal("coord"); }}>Adicionar coordenador</button>
              <button className="btn btn-primary" onClick={() => { setErroAcao(""); setForm({ escolaId: data.escolas[0]?.id }); setModal("prof"); }}>Adicionar professor</button>
            </div>
          )}
        />
        <FeedbackMessage type="danger">{erroAcao}</FeedbackMessage>
        <FeedbackMessage type="success">{msgAcao}</FeedbackMessage>
        <div className="tabs" role="tablist" aria-label="Tipo de usuário">
          {grupos.map(([k, l, lista]) => (
            <button key={k} type="button" className={`tab ${abaUsuarios === k ? "active" : ""}`} onClick={() => setAbaUsuarios(k)}>
              {l} ({lista.length})
            </button>
          ))}
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>{abaUsuarios === "professores" ? "CPF" : "Login"}</th>
                  <th>Escola</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {grupo[2].map(grupo[3])}
                {!grupo[2].length && (
                  <tr><td colSpan="4"><EmptyState title={`Nenhum registro em ${grupo[1].toLowerCase()}`} /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        {modal === "coord" && (
          <Modal
            title="Adicionar coordenador"
            onClose={() => !salvando && setModal(null)}
            footer={(
              <>
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
                <button className="btn btn-primary" onClick={salvarCoordenador} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
              </>
            )}
          >
            <FeedbackMessage type="danger">{erroAcao}</FeedbackMessage>
            <Field id="coord-escola-u" label="Escola" required>
              <select id="coord-escola-u" className="input" value={form.escolaId || ""} onChange={(e) => setForm({ ...form, escolaId: e.target.value })}>
                <option value="">Selecione</option>
                {data.escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </Field>
            <Field id="coord-nome-u" label="Nome" required>
              <input id="coord-nome-u" className="input" value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Field>
            <Field id="coord-login-u" label="CPF / login" required>
              <input id="coord-login-u" className="input" value={form.login || ""} onChange={(e) => setForm({ ...form, login: e.target.value })} />
            </Field>
          </Modal>
        )}
        {modal === "prof" && (
          <Modal
            title="Adicionar professor"
            onClose={() => !salvando && setModal(null)}
            footer={(
              <>
                <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
                <button className="btn btn-primary" onClick={salvarProfessor} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
              </>
            )}
          >
            <FeedbackMessage type="danger">{erroAcao}</FeedbackMessage>
            <Field id="prof-escola-u" label="Escola" required>
              <select id="prof-escola-u" className="input" value={form.escolaId || ""} onChange={(e) => setForm({ ...form, escolaId: e.target.value })}>
                <option value="">Selecione</option>
                {data.escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
            </Field>
            <Field id="prof-nome-u" label="Nome" required>
              <input id="prof-nome-u" className="input" value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
            </Field>
            <Field id="prof-cpf-u" label="CPF" required>
              <input id="prof-cpf-u" className="input" value={form.cpf || ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
            </Field>
          </Modal>
        )}
        {confirmEl}
      </>
    );
  }

  if (secao === "config") {
    return (
      <>
        <PageHeader
          title="Configuração acadêmica"
          description="Critério de aprovação vigente na rede. A alteração exige confirmação da senha."
        />
        <div className="card">
          <div className="card-body">
            <FeedbackMessage type="success">{cfgMsg}</FeedbackMessage>
            <FeedbackMessage type="danger">{cfgErro}</FeedbackMessage>
            <div className="grid grid-2">
              <Field id="media-minima" label="Média mínima para aprovação">
                <input
                  id="media-minima"
                  className="input"
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={mediaMinima}
                  onChange={(e) => setMediaMinima(e.target.value)}
                />
              </Field>
              <Field id="senha-cfg" label="Confirme sua senha" required>
                <input
                  id="senha-cfg"
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  value={senhaConfirmacao}
                  onChange={(e) => setSenhaConfirmacao(e.target.value)}
                />
              </Field>
            </div>
            <div className="flex-end">
              <button className="btn btn-outline" disabled={salvandoCfg} onClick={salvarConfigAcademica}>
                {salvandoCfg ? "Salvando..." : "Salvar configuração"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        kicker="Secretaria Municipal de Educação"
        title="Visão da rede"
        description="Palmeira do Piauí — situação atual da rede municipal."
      />

      <FeedbackMessage type="danger">{erroAcao}</FeedbackMessage>
      <FeedbackMessage type="success">{msgAcao}</FeedbackMessage>

      <section className="section section-fold">
        <div className="grid-stats">
          <Kpi value={ind.totalEscolas ?? data.escolas.length} label="Escolas" />
          <Kpi value={ind.alunosAtivos ?? data.totalAlunos ?? 0} label="Alunos ativos" />
          <Kpi value={ind.turmasAtivas ?? 0} label="Turmas" />
          <Kpi value={ind.totalProfessores ?? data.professores.length} label="Professores" />
        </div>
      </section>

      <AtencaoNecessaria itens={atencaoRede} />

      <section className="section" id="escolas-rede">
        <div className="section-head">
          <div>
            <h2 className="section-title">Escolas</h2>
            <p className="section-sub">Abra a unidade para ver turmas, alunos e o acompanhamento pedagógico.</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setErroAcao(""); setForm({ ofertaInfantil: true, ofertaFundamental: true }); setModal("escola"); }}>
            Cadastrar escola
          </button>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Escola</th><th>INEP</th><th></th></tr></thead>
              <tbody>
                {data.escolas.map((e) => {
                  const acomp = acompPorEscola[e.id];
                  const pend = acomp?.aulasPendentes || 0;
                  return (
                    <tr key={e.id}>
                      <td>
                        <div className="escola-resumo">
                          <strong>{e.nome}</strong>
                          <span className="muted">
                            {e.ofertaFundamental ? "Ensino Fundamental" : ""}
                            {e.ofertaFundamental && e.ofertaInfantil ? " · " : ""}
                            {e.ofertaInfantil ? "Educação Infantil" : ""}
                            {pend > 0 ? ` · ${pend} aula${pend === 1 ? "" : "s"} pendente${pend === 1 ? "" : "s"}` : ""}
                          </span>
                        </div>
                      </td>
                      <td><span className="badge badge-light">{e.inep}</span></td>
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-sm btn-primary" onClick={() => nav(`/monitorar/${e.id}`)}>Abrir escola</button>
                          <ActionMenu
                            items={[
                              { label: "Etapas ofertadas", onClick: () => { setForm(e); setModal("config"); } },
                              { label: "Gerar dirigente escolar", onClick: () => gerarDiretor(e.id), disabled: salvando },
                              { label: "Adicionar coordenador", onClick: () => { setErroAcao(""); setForm({ escolaId: e.id }); setModal("coord"); } },
                              { label: "Adicionar professor", onClick: () => { setErroAcao(""); setForm({ escolaId: e.id }); setModal("prof"); } },
                              { label: "Excluir escola", danger: true, onClick: () => pedirExclusao("escola", e.id, `a escola ${e.nome}`) },
                            ]}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!data.escolas.length && (
                  <tr>
                    <td colSpan="3">
                      <EmptyState title="Nenhuma escola cadastrada">Cadastre uma escola para começar.</EmptyState>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section" id="acompanhamento-rede">
        <div className="section-head">
          <div>
            <h2 className="section-title">Acompanhamento da rede</h2>
            <p className="section-sub">Aulas validadas sobre as previstas até hoje, por escola</p>
          </div>
        </div>
        {(data.acompanhamentoPedagogico?.limitacaoCalendario) && (
          <div className="alert alert-info mb">
            {data.acompanhamentoPedagogico.observacaoCalendario}
          </div>
        )}
        <div className="card mb">
          <div className="card-body">
            <GraficoCarga
              itens={data.acompanhamentoPedagogico?.escolas}
              rotulo={(i) => i.escolaNome}
            />
          </div>
        </div>
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Escola</th>
                  <th>Carga anual</th>
                  <th>Previstas até hoje</th>
                  <th>Validadas</th>
                  <th>Invalidadas</th>
                  <th>% até hoje</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {(data.acompanhamentoPedagogico?.escolas || []).map((e) => (
                  <tr key={e.escolaId}>
                    <td><strong>{e.escolaNome}</strong></td>
                    <td>{e.cargaPrevista ?? "—"}</td>
                    <td>{e.aulasPrevistasAteHoje ?? "—"}</td>
                    <td>{e.aulasValidadas}</td>
                    <td>{e.aulasInvalidadas}</td>
                    <td>{rotuloPctAteHoje(e)}</td>
                    <td className="row-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => nav(`/monitorar/${e.escolaId}`)}>Ver escola</button>
                    </td>
                  </tr>
                ))}
                {!(data.acompanhamentoPedagogico?.escolas || []).length && (
                  <tr><td colSpan="7"><EmptyState title="Nenhuma escola na rede" /></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <h2 className="section-title">Administração</h2>
            <p className="section-sub">Ajustes pouco frequentes da rede</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body admin-links">
            <button type="button" className="btn btn-outline" onClick={() => nav("/?secao=config")}>Configuração acadêmica</button>
            <button type="button" className="btn btn-outline" onClick={() => nav("/?secao=matriz")}>Matriz e cargas</button>
            <button type="button" className="btn btn-outline" onClick={() => nav("/?secao=usuarios")}>Usuários</button>
          </div>
        </div>
      </section>

      {modal === "escola" && (
        <Modal
          title="Nova escola"
          onClose={() => !salvando && setModal(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarEscola} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
            </>
          )}
        >
          <FeedbackMessage type="danger">{erroAcao}</FeedbackMessage>
          <Field id="escola-nome" label="Nome da escola" required>
            <input id="escola-nome" className="input" value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </Field>
          <Field id="escola-inep" label="INEP" required>
            <input id="escola-inep" className="input" value={form.inep || ""} onChange={(e) => setForm({ ...form, inep: e.target.value })} required />
          </Field>
          <p className="label">Etapas ofertadas</p>
          <label className="check"><input type="checkbox" checked={!!form.ofertaInfantil} onChange={(e) => setForm({ ...form, ofertaInfantil: e.target.checked })} /> Educação Infantil</label>
          <label className="check"><input type="checkbox" checked={!!form.ofertaFundamental} onChange={(e) => setForm({ ...form, ofertaFundamental: e.target.checked })} /> Ensino Fundamental</label>
        </Modal>
      )}

      {modal === "config" && (
        <Modal
          title="Configurar etapas"
          onClose={() => !salvando && setModal(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarConfig} disabled={salvando}>{salvando ? "Salvando..." : "Atualizar"}</button>
            </>
          )}
        >
          <h4>{form.nome}</h4>
          <label className="check"><input type="checkbox" checked={!!form.ofertaInfantil} onChange={(e) => setForm({ ...form, ofertaInfantil: e.target.checked })} /> Oferta Educação Infantil</label>
          <label className="check"><input type="checkbox" checked={!!form.ofertaFundamental} onChange={(e) => setForm({ ...form, ofertaFundamental: e.target.checked })} /> Oferta Ensino Fundamental</label>
        </Modal>
      )}

      {modal === "coord" && (
        <Modal
          title="Adicionar coordenador"
          onClose={() => !salvando && setModal(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarCoordenador} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
            </>
          )}
        >
          <FeedbackMessage type="danger">{erroAcao}</FeedbackMessage>
          <Field id="coord-escola" label="Escola" required>
            <select id="coord-escola" className="input" value={form.escolaId || ""} onChange={(e) => setForm({ ...form, escolaId: e.target.value })}>
              <option value="">Selecione</option>
              {data.escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </Field>
          <Field id="coord-nome" label="Nome" required>
            <input id="coord-nome" className="input" value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field id="coord-login" label="CPF / login" required>
            <input id="coord-login" className="input" value={form.login || ""} onChange={(e) => setForm({ ...form, login: e.target.value })} />
          </Field>
        </Modal>
      )}

      {modal === "prof" && (
        <Modal
          title="Adicionar professor"
          onClose={() => !salvando && setModal(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarProfessor} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
            </>
          )}
        >
          <FeedbackMessage type="danger">{erroAcao}</FeedbackMessage>
          <Field id="prof-escola" label="Escola" required>
            <select id="prof-escola" className="input" value={form.escolaId || ""} onChange={(e) => setForm({ ...form, escolaId: e.target.value })}>
              <option value="">Selecione</option>
              {data.escolas.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
            </select>
          </Field>
          <Field id="prof-nome" label="Nome" required>
            <input id="prof-nome" className="input" value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </Field>
          <Field id="prof-cpf" label="CPF" required>
            <input id="prof-cpf" className="input" value={form.cpf || ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
          </Field>
        </Modal>
      )}

      {confirmEl}
    </>
  );
}
