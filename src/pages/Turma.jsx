import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { request, jsonBody } from "../api.js";
import { rotuloEtapa } from "../ui.js";
import { HistoricoAulasPanel, RegistrarAulaPanel } from "../components/DiarioAula.jsx";
import { AcoesDocumentosAluno, BotaoPdf } from "../components/DocumentosAluno.jsx";
import { Breadcrumb, ConfirmModal, FeedbackMessage, LoadingState } from "../components/uiKit.jsx";
import GradeNotas, { emptyRow, notaInvalida, temDirty } from "../components/GradeNotas.jsx";

const EIXOS = [
  "Eu, o outro e o nós",
  "Corpo, gestos e movimentos",
  "Traços, sons, cores e formas",
  "Escuta, fala, pensamento e imaginação",
  "Espaços, tempos, quantidades, relações e transformações",
];

function DocumentosTurma({ painel, discId }) {
  const { turma, docsAdministrativos, docsParecer, docsRendimento } = painel;
  const discNome = (painel.disciplinas || []).find((d) => String(d.id) === String(discId))?.nome;
  return (
    <div className="card-body">
      <p className="muted">Documentos oficiais gerados em PDF pelo sistema.</p>
      {docsRendimento && (
        <div className="flex mb flex-wrap">
          <BotaoPdf
            url={`/api/turmas/${turma.id}/documentos/rendimento/${discId}.pdf`}
            disabled={!discId}
          >
            Gerar ficha de rendimento{discNome ? ` — ${discNome}` : ""}
          </BotaoPdf>
        </div>
      )}
      {docsRendimento && !discId && <p className="muted">Selecione a disciplina para emitir a ficha de rendimento.</p>}
      {(docsAdministrativos || docsParecer) && (
        <div className="table-wrap">
        <table>
          <thead><tr><th>Aluno</th><th></th></tr></thead>
          <tbody>
            {turma.alunos.map((a) => (
              <tr key={a.id}>
                <td>{a.nome}</td>
                <td className="row-actions">
                  <AcoesDocumentosAluno
                    alunoId={a.id}
                    aluno={a}
                    turma={turma}
                    administrativo={!!docsAdministrativos}
                    parecer={!!docsParecer}
                  />
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

function DiarioFundamental({ painel, aba, setAba, discInicial }) {
  const { podeEditar, isCoord, disciplinas, turma, mediaMinima, podeChamada } = painel;
  const [discId, setDiscId] = useState(discInicial || "");
  const [rows, setRows] = useState({});
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [periodo, setPeriodo] = useState("b1");
  const [busca, setBusca] = useState("");
  const [pendencia, setPendencia] = useState(null);

  useEffect(() => {
    const wanted = discInicial || (disciplinas.length === 1 ? String(disciplinas[0].id) : "");
    if (wanted) {
      carregar(String(wanted));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setAluno(id, patch) {
    setRows((prev) => ({ ...prev, [id]: { ...emptyRow(), ...(prev[id] || {}), ...patch } }));
  }

  async function carregar(id) {
    setDiscId(id);
    setMsg("");
    setErro("");
    const base = {};
    turma.alunos.forEach((a) => {
      base[a.id] = { ...emptyRow(), transferido: a.situacao === "transferido" };
    });
    if (!id) { setRows(base); return; }
    const dados = await request(`/api/monitoramento/turma/${turma.id}/disciplina/${id}`);
    dados.forEach((d) => {
      const notas = {};
      (d.notas || []).forEach((n) => { notas[n.bimestre] = n.valor; });
      const faltas = {};
      (d.faltas || []).forEach((f) => { faltas[f.bimestre] = f.quantidade; });
      base[d.id] = {
        notas,
        faltas,
        transferido: d.situacao === "transferido",
        dirty: false,
        oficial: d.resumo || null,
      };
    });
    setRows(base);
  }

  function setNota(id, cod, raw) {
    if (String(raw).toUpperCase() === "T") {
      return;
    }
    setRows((prev) => {
      const row = prev[id] || emptyRow();
      return {
        ...prev,
        [id]: { ...emptyRow(), ...row, notas: { ...row.notas, [cod]: raw }, dirty: true },
      };
    });
    setMsg("");
  }

  function pedirAba(prox) {
    if (prox === aba) return;
    if (aba === "notas" && temDirty(rows)) {
      setPendencia({ tipo: "aba", valor: prox });
      return;
    }
    setAba(prox);
  }

  function pedirDisciplina(id) {
    if (String(id) === String(discId)) return;
    if (temDirty(rows)) {
      setPendencia({ tipo: "disciplina", valor: id });
      return;
    }
    carregar(id);
  }

  function confirmarPendencia() {
    if (pendencia?.tipo === "aba") setAba(pendencia.valor);
    if (pendencia?.tipo === "disciplina") carregar(pendencia.valor);
    setPendencia(null);
  }

  async function salvarNotas() {
    if (!podeEditar) return setErro("Este diário está em modo leitura.");
    if (salvando) return;
    let invalida = false;
    turma.alunos.forEach((a) => {
      const row = rows[a.id] || emptyRow();
      if (row.transferido) return;
      Object.values(row.notas || {}).forEach((valor) => {
        if (notaInvalida(valor)) invalida = true;
      });
    });
    if (invalida) {
      setErro("Há notas inválidas. Informe um número de 0 a 10.");
      return;
    }
    setErro("");
    setMsg("");
    const dados = [];
    turma.alunos.forEach((a) => {
      const row = rows[a.id] || emptyRow();
      if (row.transferido) return;
      Object.entries(row.notas).forEach(([cod, valor]) => {
        if (String(valor).toUpperCase() === "T") return;
        const vazio = valor == null || (typeof valor === "string" && valor.trim() === "");
        dados.push({
          aluno_id: a.id,
          bimestre: Number(cod),
          valor: vazio ? null : valor,
          tipo: "nota",
        });
      });
    });
    setSalvando(true);
    try {
      await request(`/api/turmas/${turma.id}/disciplinas/${discId}/notas`, { method: "POST", body: jsonBody(dados) });
      await carregar(String(discId));
      setMsg("Notas salvas");
    } catch (e) {
      setErro(e.message || "Não foi possível salvar as notas.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarFaltas() {
    if (!podeEditar) return setErro("Este diário está em modo leitura.");
    setErro("");
    const dados = [];
    turma.alunos.forEach((a) => {
      const row = rows[a.id] || emptyRow();
      if (row.transferido) return;
      [1, 2, 3, 4].forEach((b) => {
        const bruto = row.faltas[b];
        const valor = bruto === "" || bruto == null ? 0 : bruto;
        dados.push({ aluno_id: a.id, bimestre: b, valor, tipo: "falta" });
      });
    });
    setSalvando(true);
    try {
      await request(`/api/turmas/${turma.id}/disciplinas/${discId}/notas`, { method: "POST", body: jsonBody(dados) });
      setMsg("Faltas bimestrais salvas. As notas desta disciplina foram preservadas.");
    } catch (e) {
      setErro(e.message || "Não foi possível salvar as faltas.");
    } finally {
      setSalvando(false);
    }
  }

  const discNome = disciplinas.find((d) => String(d.id) === String(discId))?.nome;
  const professorNome = (turma.alocacoes || []).find((a) => String(a.disciplinaId) === String(discId))?.professorNome;
  const tabs = [];
  tabs.push(["notas", "Notas"]);
  if (podeChamada) tabs.push(["aula", "Registrar aula"]);
  tabs.push(["historico", "Histórico de aulas"]);
  if (!podeChamada) tabs.push(["frequencia", "Frequência"]);
  tabs.push(["documentos", "Documentos"]);

  return (
    <>
      <div className="card-body toolbar diario-toolbar">
        <select className="input input-filter" value={discId} onChange={(e) => pedirDisciplina(e.target.value)} aria-label="Disciplina">
          <option value="">Selecione a disciplina...</option>
          {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
        </select>
        <div className="tabs">
          {tabs.map(([k, l]) => (
            <button key={k} type="button" className={`tab ${aba === k ? "active" : ""}`} onClick={() => pedirAba(k)}>{l}</button>
          ))}
        </div>
      </div>
      {aba !== "notas" && msg ? <div className="alert alert-success diario-alert">{msg}</div> : null}
      {aba !== "notas" && erro ? <div className="alert alert-danger diario-alert">{erro}</div> : null}

      {aba === "frequencia" && (
        <div className="card-body">
          <div className="alert alert-info">
            Totais de faltas bimestrais legados. Quando houver chamada diária ou registro de aula validado no bimestre, o total oficial do boletim usa a frequência, sem apagar estes registros.
          </div>
          {!discId && <p className="muted">Selecione a disciplina para lançar ou consultar as faltas. Somente o professor alocado pode alterar.</p>}
          {!!discId && (
            <>
              <div className="toolbar mb">
                <p className="muted mb-0">Disciplina: <strong>{discNome}</strong></p>
                {podeEditar && <button className="btn btn-primary" onClick={salvarFaltas} disabled={salvando}>{salvando ? "Salvando..." : "Salvar faltas"}</button>}
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>1º bim.</th>
                      <th>2º bim.</th>
                      <th>3º bim.</th>
                      <th>4º bim.</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turma.alunos.map((a) => {
                      const row = rows[a.id] || emptyRow();
                      const lock = !podeEditar || row.transferido;
                      const q = (b) => Number(row.faltas[b] || 0) || 0;
                      const total = q(1) + q(2) + q(3) + q(4);
                      return (
                        <tr key={a.id}>
                          <td>
                            <strong>{a.nome}</strong>
                            {row.transferido && <span className="badge badge-warn">Transferido</span>}
                          </td>
                          {[1, 2, 3, 4].map((b) => (
                            <td key={b}>
                              <input
                                className="input input-faltas"
                                type="number"
                                min="0"
                                disabled={lock}
                                value={row.faltas[b] ?? ""}
                                onChange={(e) => setAluno(a.id, { faltas: { ...row.faltas, [b]: e.target.value } })}
                              />
                            </td>
                          ))}
                          <td><strong>{total}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {aba === "aula" && <RegistrarAulaPanel painel={painel} discId={discId} />}
      {aba === "historico" && <HistoricoAulasPanel painel={painel} discId={discId} />}

      {aba === "documentos" && (
        <DocumentosTurma painel={painel} discId={discId} />
      )}

      {aba === "notas" && (
        <GradeNotas
          turma={turma}
          discId={discId}
          discNome={discNome}
          professorNome={professorNome}
          rows={rows}
          setAluno={setAluno}
          setNota={setNota}
          podeEditar={podeEditar}
          isCoord={isCoord}
          mediaMinima={mediaMinima}
          salvando={salvando}
          onSalvar={salvarNotas}
          onReverter={async (alunoId) => {
            await request(`/api/alunos/${alunoId}/reverter-transferencia`, { method: "POST" });
            setAluno(alunoId, { transferido: false });
          }}
          msg={msg}
          erro={erro}
          periodo={periodo}
          onPeriodo={setPeriodo}
          busca={busca}
          onBusca={setBusca}
        />
      )}
      <ConfirmModal
        open={!!pendencia}
        title="Alterações não salvas"
        message={
          pendencia?.tipo === "disciplina"
            ? "Há notas alteradas que ainda não foram salvas. Trocar de disciplina descarta o que não foi gravado."
            : "Há notas alteradas que ainda não foram salvas. Trocar de aba agora? As edições permanecem até você salvar ou trocar de disciplina."
        }
        confirmLabel={pendencia?.tipo === "disciplina" ? "Trocar disciplina" : "Trocar aba"}
        cancelLabel="Continuar editando"
        danger
        onConfirm={confirmarPendencia}
        onCancel={() => setPendencia(null)}
      />
    </>
  );
}

function DiarioInfantil({ painel, aba, setAba }) {
  const { podeEditar, turma, podeChamada } = painel;
  const [eixo, setEixo] = useState("");
  const [bim, setBim] = useState("1");
  const [rows, setRows] = useState({});
  const [pareceres, setPareceres] = useState({});
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    request(`/api/monitoramento/turma/${turma.id}/disciplina/0`).then((dados) => {
      const map = {};
      dados.forEach((d) => { map[d.id] = d; });
      setPareceres(map);
    });
  }, [turma.id]);

  useEffect(() => {
    const next = {};
    turma.alunos.forEach((a) => {
      const p = (pareceres[a.id]?.pareceres || []).find((x) => x.eixo === eixo && String(x.bim) === String(bim));
      next[a.id] = { avaliacao: p?.aval || "", observacao: p?.obs || "", transferido: pareceres[a.id]?.situacao === "transferido" || a.situacao === "transferido" };
    });
    setRows(next);
  }, [eixo, bim, pareceres, turma.alunos]);

  async function salvar() {
    if (!eixo) return setErro("Selecione o eixo.");
    setErro("");
    const dados = turma.alunos.map((a) => {
      const r = rows[a.id] || {};
      if (r.transferido) return null;
      const aval = (r.avaliacao || "").trim();
      return {
        aluno_id: a.id,
        eixo,
        bimestre: bim,
        avaliacao: aval || null,
        observacao: r.observacao || "",
      };
    }).filter(Boolean);
    setSalvando(true);
    try {
      await request(`/api/turmas/${turma.id}/disciplinas/0/notas`, { method: "POST", body: jsonBody(dados) });
      const atual = await request(`/api/monitoramento/turma/${turma.id}/disciplina/0`);
      const map = {};
      atual.forEach((d) => { map[d.id] = d; });
      setPareceres(map);
      setMsg("Pareceres salvos.");
    } catch (e) {
      setErro(e.message || "Não foi possível salvar os pareceres.");
    } finally {
      setSalvando(false);
    }
  }

  const tabs = [];
  tabs.push(["pareceres", "Pareceres"]);
  if (podeChamada) tabs.push(["aula", "Registrar aula"]);
  tabs.push(["historico", "Histórico de registros"]);
  if (painel.docsAdministrativos || painel.docsParecer) tabs.push(["documentos", "Documentos"]);
  const abaAtual = aba === "notas" ? "pareceres" : aba;

  return (
    <>
      <div className="card-body toolbar diario-toolbar">
        <div className="tabs">
          {tabs.map(([k, l]) => (
            <button key={k} className={`tab ${abaAtual === k ? "active" : ""}`} onClick={() => setAba(k)}>{l}</button>
          ))}
        </div>
      </div>
      {abaAtual === "aula" && <RegistrarAulaPanel painel={painel} discId="" />}
      {abaAtual === "historico" && <HistoricoAulasPanel painel={painel} discId="" />}
      {abaAtual === "documentos" && <DocumentosTurma painel={painel} discId="" />}
      {abaAtual === "pareceres" && (
    <div className="card-body">
      {msg && <div className="alert alert-success">{msg}</div>}
      {erro && <div className="alert alert-danger">{erro}</div>}
      <div className="alert alert-info">
        Educação Infantil: registro por eixos (parecer descritivo). A frequência diária está em Registrar aula.
      </div>
      <div className="grid grid-3 mb">
        <div>
          <label className="label">Eixo</label>
          <select className="input" value={eixo} onChange={(e) => setEixo(e.target.value)}>
            <option value="">Selecione o Eixo...</option>
            {EIXOS.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Período</label>
          <select className="input" value={bim} onChange={(e) => setBim(e.target.value)}>
            <option value="1">1º Bimestre</option>
            <option value="2">2º Bimestre</option>
            <option value="3">3º Bimestre</option>
            <option value="4">4º Bimestre</option>
          </select>
        </div>
        {podeEditar && <div className="field-actions"><button className="btn btn-primary" onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar pareceres"}</button></div>}
      </div>
      <div className="table-wrap">
      <table>
        <thead><tr><th>Aluno</th><th>Conceito</th><th>Observações</th><th></th></tr></thead>
        <tbody>
          {turma.alunos.map((a) => {
            const r = rows[a.id] || {};
            const lock = !eixo || !podeEditar || r.transferido;
            return (
              <tr key={a.id}>
                <td><strong>{a.nome}</strong>{r.transferido && <span className="badge badge-warn">Transferido</span>}</td>
                <td>
                  <select className="input" disabled={lock} value={r.avaliacao || ""} onChange={(e) => setRows({ ...rows, [a.id]: { ...r, avaliacao: e.target.value } })}>
                    <option value="">Não Avaliado</option>
                    <option>Não Trabalhado</option>
                    <option>Em Desenvolvimento</option>
                    <option>Desenvolvido</option>
                    <option>Consolidado</option>
                  </select>
                </td>
                <td>
                  <textarea className="input" disabled={lock} value={r.observacao || ""} onChange={(e) => setRows({ ...rows, [a.id]: { ...r, observacao: e.target.value } })} />
                </td>
                <td className="row-actions">
                  <AcoesDocumentosAluno
                    alunoId={a.id}
                    aluno={a}
                    turma={painel.turma}
                    administrativo={!!painel.docsAdministrativos}
                    parecer={!!painel.docsParecer}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
      )}
    </>
  );
}

export default function Turma() {
  const { id } = useParams();
  const nav = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [painel, setPainel] = useState(null);
  const [erro, setErro] = useState("");

  function setAba(prox) {
    const next = new URLSearchParams(params);
    next.set("aba", prox);
    setParams(next, { replace: true });
  }

  useEffect(() => {
    request(`/api/turmas/${id}/painel`).then(setPainel).catch((e) => setErro(e.message));
  }, [id]);

  if (erro) return <FeedbackMessage type="danger">{erro}</FeedbackMessage>;
  if (!painel) return <LoadingState texto="Carregando diário..." />;

  const infantil = painel.turma.etapaEnsino === "infantil";
  let aba = params.get("aba") || (infantil ? "pareceres" : "notas");
  if (aba === "chamada") aba = "aula";
  if (painel.podeChamada && aba === "frequencia") aba = "aula";
  if (!painel.podeChamada && aba === "aula") aba = "historico";
  const discInicial = params.get("disc") || "";
  const voltarPara = location.state?.voltarPara || "/";
  const voltarRotulo = location.state?.voltarRotulo || painel.turma.escolaNome || "Início";

  return (
    <>
      <Breadcrumb
        items={[
          { label: voltarRotulo, onClick: () => nav(voltarPara) },
          { label: painel.turma.nome },
        ]}
      />
    <div className="card">
      <div className={infantil ? "infantil-header" : "journal-header"}>
        <div>
          <small>{rotuloEtapa(painel.turma.etapaEnsino)} · Diário de classe</small>
          <h3>{painel.turma.nome}</h3>
          <small>
            {painel.turma.anoLetivo} · {painel.turma.escolaNome}
            {infantil && painel.turma.tipoJornada ? ` · Jornada ${painel.turma.tipoJornada === "INTEGRAL" ? "integral" : "parcial"}` : ""}
            {infantil && painel.turma.cargaHorariaDiaria != null ? ` · ${painel.turma.cargaHorariaDiaria}h/dia` : ""}
          </small>
        </div>
        <div className="flex">
          {!painel.podeEditar && <span className="badge badge-light">Somente leitura</span>}
          <button className="btn btn-outline" onClick={() => nav(voltarPara)}>Voltar</button>
        </div>
      </div>
      {infantil
        ? <DiarioInfantil painel={painel} aba={aba} setAba={setAba} />
        : <DiarioFundamental painel={painel} aba={aba} setAba={setAba} discInicial={discInicial} />}
    </div>
    </>
  );
}
