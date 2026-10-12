import { useEffect, useState, Fragment } from "react";
import { request, jsonBody } from "../api.js";
import { rotuloStatusAula, classeStatusAula } from "../ui.js";
import { FeedbackMessage, DateInput } from "./uiKit.jsx";

function hojeISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function resumoConteudo(texto) {
  const t = String(texto || "").trim();
  if (t.length <= 80) return t || "—";
  return `${t.slice(0, 77)}…`;
}

function resumoFreq(r) {
  if (r.presentes == null && r.faltosos == null) return "—";
  const p = r.presentes ?? 0;
  const f = r.faltosos ?? 0;
  return `${p} P · ${f} F`;
}

function PfBotao({ situacao, disabled, onToggle }) {
  const falta = situacao === "FALTA";
  return (
    <button
      type="button"
      className={`pf-btn ${falta ? "f" : "p"}`}
      disabled={disabled}
      onClick={onToggle}
      title={falta ? "Falta — clique para marcar presente" : "Presente — clique para marcar falta"}
      aria-label={falta ? "Falta. Clique para marcar presente" : "Presente. Clique para marcar falta"}
    >
      {falta ? "F" : "P"}
    </button>
  );
}

export function RegistrarAulaPanel({ painel, discId }) {
  const { turma, podeRegistrarAula, podeChamada } = painel;
  const pode = podeRegistrarAula ?? podeChamada;
  const infantil = turma.etapaEnsino === "infantil";
  const discOk = infantil || !!discId;
  const discPath = infantil ? 0 : discId;
  const [data, setData] = useState(hojeISO);
  const [bimestre, setBimestre] = useState("1");
  const [quantidade, setQuantidade] = useState("1");
  const [conteudo, setConteudo] = useState("");
  const [metodologia, setMetodologia] = useState("");
  const [observacao, setObservacao] = useState("");
  const [alunos, setAlunos] = useState([]);
  const [discNome, setDiscNome] = useState("");
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [periodoInfo, setPeriodoInfo] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [statusPendente, setStatusPendente] = useState(false);

  const presentes = alunos.filter((a) => a.situacao !== "FALTA").length;
  const faltosos = alunos.filter((a) => a.situacao === "FALTA").length;
  const total = alunos.length;

  async function carregarPeriodo(dataIso) {
    try {
      const info = await request(`/api/calendario/periodo?data=${encodeURIComponent(dataIso)}`);
      setPeriodoInfo(info);
      if (info?.periodo?.numero) setBimestre(String(info.periodo.numero));
    } catch {
      setPeriodoInfo(null);
    }
  }

  async function carregar() {
    if (!discOk) return;
    setErro("");
    try {
      const payload = await request(`/api/turmas/${turma.id}/disciplinas/${discPath}/registros-aula`);
      setAlunos((payload.alunos || []).map((a) => ({ ...a, situacao: "PRESENTE" })));
      setDiscNome(payload.disciplinaNome || "");
    } catch (e) {
      setErro(e.message || "Não foi possível abrir o registro de aula.");
      setAlunos([]);
    }
  }

  useEffect(() => {
    if (discOk) carregar();
    else setAlunos([]);
    carregarPeriodo(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discPath, turma.id]);

  function toggle(id) {
    setAlunos((prev) => prev.map((a) => {
      if (a.id !== id) return a;
      return { ...a, situacao: a.situacao === "FALTA" ? "PRESENTE" : "FALTA" };
    }));
  }

  function todosPresentes() {
    setAlunos((prev) => prev.map((a) => ({ ...a, situacao: "PRESENTE" })));
  }

  async function registrar() {
    if (!pode) return setErro("Somente o professor alocado registra aula.");
    if (salvando) return;
    setErro("");
    setMsg("");
    setStatusPendente(false);
    setSalvando(true);
    try {
      await request(`/api/turmas/${turma.id}/disciplinas/${discPath}/registros-aula`, {
        method: "POST",
        body: jsonBody({
          data,
          bimestre: Number(bimestre),
          quantidade_aulas: Number(quantidade),
          conteudo,
          metodologia,
          observacao,
          lancamentos: alunos.map((a) => ({ aluno_id: a.id, situacao: a.situacao })),
        }),
      });
      setMsg("Registro de aula salvo.");
      setStatusPendente(true);
      setConteudo("");
      setMetodologia("");
      setObservacao("");
      setQuantidade("1");
      await carregar();
    } catch (e) {
      setErro(e.message || "Não foi possível registrar a aula.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card-body form-diario">
      <FeedbackMessage type="success">{msg}</FeedbackMessage>
      {statusPendente ? <p className="badge badge-warn mb" role="status">Pendente de validação</p> : null}
      <FeedbackMessage type="danger">{erro}</FeedbackMessage>
      {!discOk && <p className="muted">Selecione a disciplina para registrar a aula.</p>}
      {discOk && (
        <>
          <p className="muted">
            {infantil ? "Turma" : "Turma"}: <strong>{turma.nome}</strong>
            {" · "}
            {infantil ? "Educação Infantil" : (discNome || "Disciplina")}
            {periodoInfo?.periodo ? ` · ${periodoInfo.periodo.nome}` : ""}
          </p>
          <div className="mb">
            <label className="label" htmlFor="aula-data">Data da aula</label>
            <DateInput id="aula-data" value={data} onChange={(e) => { setData(e.target.value); carregarPeriodo(e.target.value); }} />
            {periodoInfo?.motivo === "fora_de_periodo" && <p className="muted">Data fora dos bimestres configurados.</p>}
          </div>
          <div className="mb">
            <label className="label" htmlFor="aula-qtd">Quantidade de aulas</label>
            <input id="aula-qtd" className="input" type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} />
          </div>
          <div className="mb">
            <label className="label" htmlFor="aula-conteudo">{infantil ? "Experiências/atividades desenvolvidas" : "Conteúdo"}</label>
            <textarea id="aula-conteudo" className="input" rows="3" value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder={infantil ? "O que foi vivenciado nesta atividade." : "O que foi trabalhado nesta aula."} />
          </div>
          <div className="mb">
            <label className="label" htmlFor="aula-metodo">{infantil ? "Estratégias/metodologia" : "Metodologia"}</label>
            <textarea id="aula-metodo" className="input" rows="3" value={metodologia} onChange={(e) => setMetodologia(e.target.value)} placeholder={infantil ? "Como a experiência foi conduzida." : "Como a aula foi conduzida."} />
          </div>
          <div className="mb">
            <label className="label" htmlFor="aula-obs">Observações</label>
            <textarea id="aula-obs" className="input" rows="2" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </div>
          <div className="chamada-meta mb">
            <span>Presentes: <strong>{presentes}</strong></span>
            <span>Faltas: <strong>{faltosos}</strong></span>
            <span>Total: <strong>{total}</strong></span>
            {pode && <button type="button" className="btn btn-sm btn-outline" onClick={todosPresentes}>Todos presentes</button>}
          </div>
          <p className="muted">Todos iniciam como Presentes. Clique no aluno para marcar Falta. P — Presente · F — Falta</p>
          <div className="table-wrap mb">
            <table>
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th className="col-pf">Frequência</th>
                </tr>
              </thead>
              <tbody>
                {alunos.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.nome}</strong></td>
                    <td>
                      <PfBotao situacao={a.situacao} disabled={!pode} onToggle={() => toggle(a.id)} />
                    </td>
                  </tr>
                ))}
                {!alunos.length && (
                  <tr><td colSpan="2"><div className="empty-state">Nenhum aluno ativo nesta turma.</div></td></tr>
                )}
              </tbody>
            </table>
          </div>
          {pode && (
            <button type="button" className="btn btn-primary" onClick={registrar} disabled={!alunos.length || salvando}>
              {salvando ? "Salvando..." : "Salvar registro"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function DetalheAula({ aula, infantil }) {
  if (!aula) return null;
  return (
    <div className="aula-detalhe">
      <p><strong>{infantil ? "Experiências/atividades:" : "Conteúdo:"}</strong> {aula.conteudo}</p>
      <p><strong>{infantil ? "Estratégias/metodologia:" : "Metodologia:"}</strong> {aula.metodologia}</p>
      {aula.observacao && <p><strong>Observação:</strong> {aula.observacao}</p>}
      {aula.status === "invalidada" && aula.motivoInvalidacao && (
        <div className="feedback-box">
          <strong>Motivo da invalidação</strong>
          <p>{aula.motivoInvalidacao}</p>
        </div>
      )}
      {aula.frequencia && (
        <div className="table-wrap mt">
          <table>
            <thead><tr><th>Aluno</th><th>Situação</th></tr></thead>
            <tbody>
              {aula.frequencia.map((f) => (
                <tr key={f.alunoId}>
                  <td>{f.nome}</td>
                  <td>
                    <span className={`badge ${f.situacao === "FALTA" ? "badge-danger" : "badge-ok"}`}>
                      {f.situacao === "FALTA" ? "Falta" : "Presente"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function HistoricoAulasPanel({ painel, discId }) {
  const { turma } = painel;
  const infantil = turma.etapaEnsino === "infantil";
  const discOk = infantil || !!discId;
  const discPath = infantil ? 0 : discId;
  const [registros, setRegistros] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [erro, setErro] = useState("");

  async function carregar() {
    if (!discOk) return;
    setErro("");
    try {
      const payload = await request(`/api/turmas/${turma.id}/disciplinas/${discPath}/registros-aula`);
      setRegistros(payload.registros || []);
    } catch (e) {
      setErro(e.message || "Não foi possível carregar o histórico.");
      setRegistros([]);
    }
  }

  useEffect(() => {
    if (discOk) carregar();
    else setRegistros([]);
    setAberto(null);
    setDetalhe(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [discPath, turma.id]);

  async function abrir(id) {
    if (aberto === id) {
      setAberto(null);
      setDetalhe(null);
      return;
    }
    setErro("");
    try {
      const payload = await request(`/api/registros-aula/${id}`);
      setAberto(id);
      setDetalhe(payload);
    } catch (e) {
      setErro(e.message || "Não foi possível abrir o registro.");
    }
  }

  return (
    <div className="card-body">
      {erro ? <FeedbackMessage type="danger">{erro}</FeedbackMessage> : null}
      {!discOk && <p className="muted">Selecione a disciplina para ver o histórico.</p>}
      {discOk && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>{infantil ? "Experiências/atividades" : "Conteúdo"}</th>
                <th>Qtd. aulas</th>
                <th>Frequência</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {registros.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td>{r.data}</td>
                    <td>{resumoConteudo(r.conteudo)}</td>
                    <td>{r.quantidadeAulas}</td>
                    <td>{resumoFreq(r)}</td>
                    <td>
                      <span className={`badge ${classeStatusAula(r.status)}`}>{rotuloStatusAula(r.status)}</span>
                    </td>
                    <td>
                      <button type="button" className="btn btn-sm btn-ghost" onClick={() => abrir(r.id)}>
                        {aberto === r.id ? "Ocultar" : "Ver"}
                      </button>
                    </td>
                  </tr>
                  {aberto === r.id && detalhe && (
                    <tr>
                      <td colSpan="6"><DetalheAula aula={detalhe} infantil={infantil} /></td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {!registros.length && (
                <tr><td colSpan="6"><div className="empty-state">{infantil ? "Nenhum registro de atividade nesta turma." : "Nenhuma aula registrada nesta disciplina."}</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function pctAteHoje(item) {
  if (!item) return null;
  return item.percentualCumprimentoAteHoje;
}

export function rotuloPctAteHoje(item) {
  if (!item) return "—";
  if (item.cargaHorariaNaoConfigurada && item.aulasPrevistasAteHoje == null) {
    return "Carga horária não configurada";
  }
  if (item.semPrevisaoAteData || item.percentualCumprimentoAteHoje == null) {
    return "Sem previsão até a data";
  }
  return `${item.percentualCumprimentoAteHoje}%`;
}

export function GraficoCarga({ itens, rotulo }) {
  const lista = itens || [];
  if (!lista.length) return <div className="empty-state">Sem dados de cumprimento até a data para o gráfico.</div>;
  return (
    <div className="carga-chart">
      {lista.map((i) => {
        const bruto = pctAteHoje(i);
        const pct = bruto == null ? 0 : Math.min(100, Math.max(0, bruto));
        const key = i.alocacaoId || i.escolaId || `${i.professorNome}-${i.turmaNome}-${i.disciplinaNome}`;
        const texto = rotuloPctAteHoje(i);
        return (
          <div className="carga-chart-row" key={key}>
            <div className="carga-chart-label">{rotulo ? rotulo(i) : (i.disciplinaNome || i.escolaNome)}</div>
            <div className="carga-bar" title={texto}>
              <div className="carga-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="muted">{bruto == null ? texto : `${bruto}%`}</span>
          </div>
        );
      })}
    </div>
  );
}

export function TabelaAcompanhamento({ itens, onEditar }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Professor</th>
            <th>Turma</th>
            <th>Disciplina</th>
            <th>Carga anual</th>
            <th>Previstas até hoje</th>
            <th>Validadas</th>
            <th>Pendentes</th>
            <th>Invalidadas</th>
            <th>% até hoje</th>
            <th>Progresso anual</th>
            {onEditar && <th></th>}
          </tr>
        </thead>
        <tbody>
          {(itens || []).map((i) => (
            <tr key={i.alocacaoId || `${i.professorId}-${i.turmaId}-${i.disciplinaId}`}>
              <td>{i.professorNome}</td>
              <td>{i.turmaNome}</td>
              <td>{i.disciplinaNome}</td>
              <td>{i.cargaHorariaNaoConfigurada || i.cargaPrevista == null ? "Carga horária não configurada" : i.cargaPrevista}</td>
              <td>{i.aulasPrevistasAteHoje == null ? "—" : i.aulasPrevistasAteHoje}</td>
              <td>{i.aulasValidadas}</td>
              <td>{i.aulasPendentes ?? 0}</td>
              <td>{i.aulasInvalidadas}</td>
              <td>{rotuloPctAteHoje(i)}</td>
              <td>{i.progressoAnual == null ? "—" : `${i.progressoAnual}%`}</td>
              {onEditar && (
                <td>
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => onEditar(i)}>Carga / grade</button>
                </td>
              )}
            </tr>
          ))}
          {!(itens || []).length && (
            <tr><td colSpan={onEditar ? 11 : 10}><div className="empty-state">Nenhuma alocação para acompanhar.</div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function TabelaEducacaoInfantil({ itens }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Turma</th>
            <th>Jornada</th>
            <th>Carga diária</th>
            <th>Carga anual</th>
            <th>Dias letivos até hoje</th>
            <th>Dias com registro validado</th>
            <th>% registros</th>
          </tr>
        </thead>
        <tbody>
          {(itens || []).map((i) => (
            <tr key={i.turmaId}>
              <td>
                <strong>{i.turmaNome}</strong>
                {i.professores?.length ? <div className="muted">{i.professores.join(", ")}</div> : null}
              </td>
              <td>{i.tipoJornada || "—"}</td>
              <td>{i.cargaHorariaDiaria != null ? `${i.cargaHorariaDiaria}h` : "—"}</td>
              <td>{i.cargaHorariaAnual != null ? `${i.cargaHorariaAnual}h` : "—"}</td>
              <td>{i.diasLetivosAteHoje == null ? "Sem previsão até a data" : i.diasLetivosAteHoje}</td>
              <td>{i.diasComRegistroValidado}</td>
              <td>{i.percentualRegistros == null ? "—" : `${i.percentualRegistros}%`}</td>
            </tr>
          ))}
          {!(itens || []).length && (
            <tr><td colSpan="7"><div className="empty-state">Nenhuma turma de Educação Infantil nesta escola.</div></td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
