import { useEffect, useMemo, useState } from "react";
import { useBlocker } from "react-router-dom";
import { calcAnual, calcBimestre, calcSemestre, parseNota } from "../notas.js";
import { ConfirmModal, Field, FeedbackMessage } from "./uiKit.jsx";

export const PERIODOS_NOTA = [
  { id: "b1", label: "Bimestre 1" },
  { id: "b2", label: "Bimestre 2" },
  { id: "b3", label: "Bimestre 3" },
  { id: "b4", label: "Bimestre 4" },
  { id: "anual", label: "Resumo anual" },
];

function fromOficial(oficial) {
  if (!oficial) return null;
  return {
    b1: { mb: oficial.mb1, precisaRp: !!oficial.precisa_rp1 },
    b2: { mb: oficial.mb2, precisaRp: !!oficial.precisa_rp2 },
    b3: { mb: oficial.mb3, precisaRp: !!oficial.precisa_rp3 },
    b4: { mb: oficial.mb4, precisaRp: !!oficial.precisa_rp4 },
    s1: { ms: oficial.ms1, precisaRs: !!oficial.precisa_rs1 },
    s2: { ms: oficial.ms2, precisaRs: !!oficial.precisa_rs2 },
    an: {
      ma: oficial.ma,
      situacao: oficial.situacao,
      precisaPf: !!oficial.precisa_pf,
    },
  };
}

export function emptyRow() {
  return { notas: {}, faltas: {}, transferido: false, dirty: false, oficial: null };
}

export function notaInvalida(raw) {
  if (raw == null || String(raw).trim() === "") return false;
  if (String(raw).toUpperCase() === "T") return false;
  return parseNota(raw) == null;
}

export function temDirty(rows) {
  return Object.values(rows || {}).some((r) => r && r.dirty);
}

function fmt(v) {
  if (v == null || v === "") return "—";
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(1) : "—";
}

function RowStatus({ situacao }) {
  const cls = situacao === "APROVADO" ? "aprovado"
    : situacao === "REPROVADO" ? "reprovado"
    : situacao === "EM RECUPERAÇÃO" ? "recuperacao"
    : situacao === "TRANSFERIDO" ? "transferido"
    : "cursando";
  return <span className={`status-badge ${cls}`}>{situacao || "CURSANDO"}</span>;
}

function GradeInput({ value, disabled, invalid, onChange, ariaLabel }) {
  return (
    <input
      className={`input-grade${invalid ? " is-invalid" : ""}`}
      value={value ?? ""}
      disabled={disabled}
      inputMode="decimal"
      min="0"
      max="10"
      step="0.1"
      aria-invalid={invalid || undefined}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function resumoLinha(row, corte) {
  if (row.transferido) return { an: { situacao: "TRANSFERIDO" } };
  if (!row.dirty && row.oficial) {
    return fromOficial(row.oficial);
  }
  const n = (cod) => parseNota(row.notas[cod]);
  const b1 = calcBimestre(n(11), n(12), n(13), corte);
  const b2 = calcBimestre(n(21), n(22), n(23), corte);
  const b3 = calcBimestre(n(31), n(32), n(33), corte);
  const b4 = calcBimestre(n(41), n(42), n(43), corte);
  const s1 = calcSemestre(b1.mb, b2.mb, n(51), corte);
  const s2 = calcSemestre(b3.mb, b4.mb, n(52), corte);
  const an = calcAnual(s1.ms, s2.ms, n(99), corte);
  return { b1, b2, b3, b4, s1, s2, an };
}

export default function GradeNotas({
  turma,
  discId,
  discNome,
  professorNome,
  rows,
  setAluno,
  setNota,
  podeEditar,
  isCoord,
  mediaMinima,
  salvando,
  onSalvar,
  onReverter,
  msg,
  erro,
  periodo,
  onPeriodo,
  busca,
  onBusca,
}) {
  const dirty = temDirty(rows);
  const [pendencia, setPendencia] = useState(null);
  const blocker = useBlocker(dirty);

  useEffect(() => {
    function beforeUnload(e) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const alunos = useMemo(() => {
    const termo = (busca || "").trim().toLowerCase();
    const lista = turma.alunos || [];
    if (!termo) return lista;
    return lista.filter((a) => (a.nome || "").toLowerCase().includes(termo));
  }, [turma.alunos, busca]);

  function pedirPeriodo(prox) {
    if (prox === periodo) return;
    if (dirty) {
      setPendencia({ tipo: "periodo", valor: prox });
      return;
    }
    onPeriodo(prox);
  }

  function confirmarPendencia() {
    if (pendencia?.tipo === "periodo") onPeriodo(pendencia.valor);
    if (blocker.state === "blocked") blocker.proceed();
    setPendencia(null);
  }

  function cancelarPendencia() {
    if (blocker.state === "blocked") blocker.reset();
    setPendencia(null);
  }

  const periodoAtual = PERIODOS_NOTA.find((p) => p.id === periodo) || PERIODOS_NOTA[0];
  const statusSave = salvando
    ? "Salvando..."
    : dirty
      ? "Alterações não salvas"
      : (msg || "");

  return (
    <>
      <div className="card-body grade-toolbar">
        <div className="grade-contexto">
          <p className="grade-contexto-linha">
            <strong>{turma.nome}</strong>
            {discNome ? <> · {discNome}</> : null}
            {professorNome ? <> · {professorNome}</> : null}
          </p>
          <p className="muted mb-0">
            Ano letivo {turma.anoLetivo}
            {turma.escolaNome ? ` · ${turma.escolaNome}` : ""}
            {" · "}
            {periodoAtual.label}
          </p>
        </div>
        <div className="grade-acoes">
          {dirty ? <span className="badge badge-warn" role="status">Alterações não salvas</span> : null}
          {!dirty && msg ? <span className="badge badge-ok" role="status">{msg}</span> : null}
          {podeEditar && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onSalvar}
              disabled={!discId || salvando}
            >
              {salvando ? "Salvando..." : "Salvar notas"}
            </button>
          )}
        </div>
      </div>
      {erro ? <FeedbackMessage type="danger">{erro}</FeedbackMessage> : null}
      <div className="card-body pt-0">
        <div className="tabs mb" role="tablist" aria-label="Período da grade">
          {PERIODOS_NOTA.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`tab ${periodo === p.id ? "active" : ""}`}
              onClick={() => pedirPeriodo(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <Field id="busca-aluno-grade" label="Localizar aluno">
          <input
            id="busca-aluno-grade"
            className="input input-filter"
            value={busca}
            onChange={(e) => onBusca(e.target.value)}
            placeholder="Filtrar por nome"
          />
        </Field>
        <p className="grade-legenda" aria-label="Legenda das colunas">
          N1 e N2 — notas do bimestre · RP — recuperação paralela · MB — média do bimestre ·
          RS — recuperação semestral · MS — média semestral · PF — prova final · MA — média anual
        </p>
        <div className="table-wrap table-wrap-grade">
          {periodo === "anual"
            ? (
              <TabelaAnual
                alunos={alunos}
                rows={rows}
                mediaMinima={mediaMinima}
                discId={discId}
                podeEditar={podeEditar}
                isCoord={isCoord}
                setNota={setNota}
                onReverter={onReverter}
              />
            ) : (
              <TabelaPeriodo
                periodo={periodo}
                alunos={alunos}
                rows={rows}
                mediaMinima={mediaMinima}
                discId={discId}
                podeEditar={podeEditar}
                setNota={setNota}
              />
            )}
        </div>
        <p className="sr-only" aria-live="polite">{statusSave}</p>
      </div>
      <ConfirmModal
        open={!!pendencia || blocker.state === "blocked"}
        title="Alterações não salvas"
        message={
          pendencia?.tipo === "periodo"
            ? "Há alterações não salvas. Trocar de período agora? As edições permanecem até você salvar."
            : "Há notas alteradas que ainda não foram salvas. Sair desta página descarta o que não foi gravado."
        }
        confirmLabel={pendencia?.tipo === "periodo" ? "Trocar período" : "Sair sem salvar"}
        cancelLabel="Continuar editando"
        danger
        onConfirm={confirmarPendencia}
        onCancel={cancelarPendencia}
      />
    </>
  );
}

function TabelaPeriodo({ periodo, alunos, rows, mediaMinima, discId, podeEditar, setNota }) {
  const corte = mediaMinima == null || mediaMinima === "" ? null : Number(mediaMinima);
  const cfg = {
    b1: { n1: 11, n2: 12, rp: 13, mbKey: "b1", rs: null, msKey: null, titulo: "1º bimestre" },
    b2: { n1: 21, n2: 22, rp: 23, mbKey: "b2", rs: 51, msKey: "s1", titulo: "2º bimestre" },
    b3: { n1: 31, n2: 32, rp: 33, mbKey: "b3", rs: null, msKey: null, titulo: "3º bimestre" },
    b4: { n1: 41, n2: 42, rp: 43, mbKey: "b4", rs: 52, msKey: "s2", titulo: "4º bimestre" },
  }[periodo];
  const colCount = 1 + 4 + (cfg.rs ? 2 : 0);

  return (
    <table className="table-journal">
      <thead>
        <tr>
          <th className="sticky-name" scope="col">Aluno</th>
          <th scope="col">N1</th>
          <th scope="col">N2</th>
          <th scope="col" className="bg-rp">RP</th>
          <th scope="col" className="bg-mb">MB</th>
          {cfg.rs ? <th scope="col" className="bg-rs">RS</th> : null}
          {cfg.msKey ? <th scope="col" className="bg-ms">{cfg.msKey === "s1" ? "MS1" : "MS2"}</th> : null}
        </tr>
      </thead>
      <tbody>
        {alunos.map((a) => {
          const row = rows[a.id] || emptyRow();
          const r = resumoLinha(row, corte);
          const lock = !discId || !podeEditar || row.transferido;
          const bim = r[cfg.mbKey] || {};
          const sem = cfg.msKey ? r[cfg.msKey] : null;
          const n = (cod) => row.notas[cod] ?? "";
          return (
            <tr key={a.id}>
              <th className="sticky-name" scope="row">
                <strong>{a.nome}</strong>
                {row.transferido ? <span className="badge badge-warn">Transferido</span> : null}
              </th>
              <td>
                <GradeInput
                  value={n(cfg.n1)}
                  disabled={lock}
                  invalid={notaInvalida(n(cfg.n1))}
                  ariaLabel={`N1 de ${a.nome}`}
                  onChange={(v) => setNota(a.id, cfg.n1, v)}
                />
              </td>
              <td>
                <GradeInput
                  value={n(cfg.n2)}
                  disabled={lock}
                  invalid={notaInvalida(n(cfg.n2))}
                  ariaLabel={`N2 de ${a.nome}`}
                  onChange={(v) => setNota(a.id, cfg.n2, v)}
                />
              </td>
              <td className="bg-rp">
                <GradeInput
                  value={n(cfg.rp)}
                  disabled={lock || !bim.precisaRp}
                  invalid={notaInvalida(n(cfg.rp))}
                  ariaLabel={`Recuperação paralela de ${a.nome}`}
                  onChange={(v) => setNota(a.id, cfg.rp, v)}
                />
              </td>
              <td className="bg-mb grade-calc" title="Média do bimestre, calculada">{fmt(bim.mb)}</td>
              {cfg.rs ? (
                <td className="bg-rs">
                  <GradeInput
                    value={n(cfg.rs)}
                    disabled={lock || !sem?.precisaRs}
                    invalid={notaInvalida(n(cfg.rs))}
                    ariaLabel={`Recuperação semestral de ${a.nome}`}
                    onChange={(v) => setNota(a.id, cfg.rs, v)}
                  />
                </td>
              ) : null}
              {cfg.msKey ? (
                <td className="bg-ms grade-calc" title="Média semestral, calculada">{fmt(sem?.ms)}</td>
              ) : null}
            </tr>
          );
        })}
        {!alunos.length && (
          <tr><td colSpan={colCount}><div className="empty-state">Nenhum aluno neste filtro.</div></td></tr>
        )}
      </tbody>
    </table>
  );
}

function TabelaAnual({ alunos, rows, mediaMinima, discId, podeEditar, isCoord, setNota, onReverter }) {
  const corte = mediaMinima == null || mediaMinima === "" ? null : Number(mediaMinima);
  return (
    <table className="table-journal">
      <thead>
        <tr>
          <th className="sticky-name" scope="col">Aluno</th>
          <th className="bg-mb" scope="col">MB1</th>
          <th className="bg-mb" scope="col">MB2</th>
          <th className="bg-rs" scope="col">RS</th>
          <th className="bg-ms" scope="col">MS1</th>
          <th className="bg-mb" scope="col">MB3</th>
          <th className="bg-mb" scope="col">MB4</th>
          <th className="bg-rs" scope="col">RS</th>
          <th className="bg-ms" scope="col">MS2</th>
          <th scope="col">PF</th>
          <th className="bg-final" scope="col">MA</th>
          <th scope="col">Situação</th>
        </tr>
      </thead>
      <tbody>
        {alunos.map((a) => {
          const row = rows[a.id] || emptyRow();
          const r = resumoLinha(row, corte);
          const lock = !discId || !podeEditar || row.transferido;
          const situacao = row.oficial?.situacao || (row.transferido ? "TRANSFERIDO" : "CURSANDO");
          const n = (cod) => row.notas[cod] ?? "";
          return (
            <tr key={a.id}>
              <th className="sticky-name" scope="row">
                <strong>{a.nome}</strong>
                {row.transferido ? <span className="badge badge-warn">Transferido</span> : null}
              </th>
              <td className="bg-mb grade-calc">{fmt(r.b1?.mb)}</td>
              <td className="bg-mb grade-calc">{fmt(r.b2?.mb)}</td>
              <td className="bg-rs grade-calc">{fmt(row.oficial && !row.dirty ? row.oficial.rs1 : parseNota(n(51)))}</td>
              <td className="bg-ms grade-calc">{fmt(r.s1?.ms)}</td>
              <td className="bg-mb grade-calc">{fmt(r.b3?.mb)}</td>
              <td className="bg-mb grade-calc">{fmt(r.b4?.mb)}</td>
              <td className="bg-rs grade-calc">{fmt(row.oficial && !row.dirty ? row.oficial.rs2 : parseNota(n(52)))}</td>
              <td className="bg-ms grade-calc">{fmt(r.s2?.ms)}</td>
              <td>
                <GradeInput
                  value={n(99)}
                  disabled={lock || !r.an?.precisaPf}
                  invalid={notaInvalida(n(99))}
                  ariaLabel={`Prova final de ${a.nome}`}
                  onChange={(v) => setNota(a.id, 99, v)}
                />
              </td>
              <td className="bg-final grade-calc">{fmt(r.an?.ma)}</td>
              <td>
                <RowStatus situacao={situacao} />
                {isCoord && row.transferido && onReverter ? (
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => onReverter(a.id)}>Desfazer T</button>
                ) : null}
              </td>
            </tr>
          );
        })}
        {!alunos.length && (
          <tr><td colSpan="12"><div className="empty-state">Nenhum aluno neste filtro.</div></td></tr>
        )}
      </tbody>
    </table>
  );
}
