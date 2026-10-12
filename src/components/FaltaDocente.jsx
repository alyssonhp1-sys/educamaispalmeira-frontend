import { useEffect, useRef, useState } from "react";
import Modal from "./Modal.jsx";
import { EmptyState, FeedbackMessage, Field, LoadingState, DateInput } from "./uiKit.jsx";
import { request, jsonBody } from "../api.js";
import { DIAS_SEMANA } from "../ui.js";

function hojeISO() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function rotuloDia(n) {
  return DIAS_SEMANA.find((d) => d.value === n)?.label || "";
}

function rotuloEstado(estado) {
  return {
    validada: "Validada",
    pendente: "Pendente",
    registrada: "Registrada",
    nao_ministrada: "Não ministrada",
    sem_registro: "Sem registro",
  }[estado] || estado || "";
}

function rotuloStatusOcc(status) {
  return status === "CANCELADA" ? "Cancelada" : "Ativa";
}

export function RegistrarFaltaDocenteModal({ onClose, onSaved }) {
  const [data, setData] = useState(hojeISO);
  const [aulas, setAulas] = useState([]);
  const [meta, setMeta] = useState(null);
  const [selecionada, setSelecionada] = useState("");
  const [observacao, setObservacao] = useState("");
  const [erro, setErro] = useState("");
  const [erroAulas, setErroAulas] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const cargaId = useRef(0);

  async function carregar(dataIso) {
    const id = cargaId.current + 1;
    cargaId.current = id;
    setCarregando(true);
    setErroAulas("");
    setSelecionada("");
    setAulas([]);
    setMeta(null);
    try {
      const payload = await request(`/api/faltas-docentes/aulas-previstas?data=${encodeURIComponent(dataIso)}`);
      if (cargaId.current !== id) return;
      setMeta(payload);
      setAulas(payload.aulas || []);
    } catch (e) {
      if (cargaId.current !== id) return;
      setErroAulas(e.message || "Não foi possível carregar as aulas previstas.");
      setAulas([]);
      setMeta(null);
    } finally {
      if (cargaId.current === id) setCarregando(false);
    }
  }

  useEffect(() => {
    carregar(data);
  }, [data]);

  const aula = aulas.find((a) => String(a.horarioAlocacaoId) === String(selecionada));

  async function registrar() {
    if (!aula || salvando) return;
    setErro("");
    setSalvando(true);
    try {
      await request("/api/faltas-docentes", {
        method: "POST",
        body: jsonBody({
          data,
          horario_alocacao_id: aula.horarioAlocacaoId,
          observacao,
        }),
      });
      onSaved("Falta docente registrada.");
    } catch (e) {
      setErro(e.message || "Não foi possível registrar a falta docente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title="Registrar falta docente"
      onClose={() => !salvando && onClose()}
      footer={(
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={salvando}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={registrar} disabled={salvando || carregando || !!erroAulas || !aula || !aula.podeRegistrarFalta}>
            {salvando ? "Registrando..." : "Registrar falta"}
          </button>
        </>
      )}
    >
      <FeedbackMessage type="danger">{erroAulas || erro}</FeedbackMessage>
      {meta?.diaNaoLetivo ? (
        <FeedbackMessage type="danger">{meta.mensagemCalendario}</FeedbackMessage>
      ) : null}
      <Field id="falta-data" label="Data da aula prevista" required>
        <DateInput
          id="falta-data"
          value={data}
          onChange={(e) => {
            cargaId.current += 1;
            setCarregando(true);
            setErroAulas("");
            setSelecionada("");
            setAulas([]);
            setMeta(null);
            setData(e.target.value);
          }}
        />
      </Field>
      <Field id="falta-aula" label="Aula prevista" required>
        {carregando ? <LoadingState texto="Carregando aulas previstas..." /> : null}
        <select
          id="falta-aula"
          className="input"
          value={selecionada}
          onChange={(e) => setSelecionada(e.target.value)}
          disabled={carregando || !!erroAulas || !aulas.length}
        >
          <option value="">
            {carregando
              ? "Carregando aulas previstas..."
              : erroAulas
                ? "Não foi possível carregar as aulas previstas"
                : aulas.length
                  ? "Selecione a aula"
                  : "Nenhuma aula prevista neste dia."}
          </option>
          {carregando || erroAulas ? null : aulas.map((a) => (
            <option key={a.horarioAlocacaoId} value={a.horarioAlocacaoId}>
              {a.quantidadeAulas} aula{a.quantidadeAulas === 1 ? "" : "s"} · {a.turmaNome} · {a.disciplinaNome} · {a.professorNome} · {rotuloEstado(a.estado)}
            </option>
          ))}
        </select>
      </Field>
      <p className="muted">Motivo: Falta do professor</p>
      {aula ? (
        <div className="confirm-aula">
          <p><strong>Confirme a aula</strong></p>
          <p>{aula.professorNome}</p>
          <p className="muted">
            {aula.turmaNome} · {aula.disciplinaNome} · {data.split("-").reverse().join("/")}
            {aula.diaSemana != null ? ` · ${rotuloDia(aula.diaSemana)}` : ""}
            {` · ${aula.quantidadeAulas} aula${aula.quantidadeAulas === 1 ? "" : "s"}`}
          </p>
          {!aula.podeRegistrarFalta ? (
            <p className="field-error">Esta aula já possui registro ou ocorrência ativa.</p>
          ) : null}
        </div>
      ) : null}
      <Field id="falta-obs" label="Observação">
        <textarea id="falta-obs" className="input" rows="3" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
      </Field>
    </Modal>
  );
}

export function CancelarOcorrenciaModal({ ocorrencia, onClose, onSaved }) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function cancelar() {
    if (salvando) return;
    if (!motivo.trim()) {
      setErro("Informe o motivo do cancelamento.");
      return;
    }
    setErro("");
    setSalvando(true);
    try {
      await request(`/api/faltas-docentes/${ocorrencia.id}/cancelar`, {
        method: "POST",
        body: jsonBody({ motivo_cancelamento: motivo }),
      });
      onSaved("Ocorrência cancelada.");
    } catch (e) {
      setErro(e.message || "Não foi possível cancelar a ocorrência.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      title="Cancelar ocorrência"
      variant="danger"
      onClose={() => !salvando && onClose()}
      footer={(
        <>
          <button type="button" className="btn btn-outline" onClick={onClose} disabled={salvando}>Voltar</button>
          <button type="button" className="btn btn-danger" onClick={cancelar} disabled={salvando || !motivo.trim()}>
            {salvando ? "Cancelando..." : "Cancelar ocorrência"}
          </button>
        </>
      )}
    >
      <FeedbackMessage type="danger">{erro}</FeedbackMessage>
      <p>{ocorrencia.professorNome} · {ocorrencia.turmaNome} · {ocorrencia.disciplinaNome} · {ocorrencia.data}</p>
      <Field id="motivo-canc-occ" label="Motivo do cancelamento" required>
        <textarea id="motivo-canc-occ" className="input" rows="4" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
      </Field>
    </Modal>
  );
}

export function ListaOcorrenciasEscola({ recarregarChave, aviso, onChanged }) {
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState("");
  const [cancelar, setCancelar] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (aviso) setMsg(aviso);
  }, [aviso]);

  async function carregar() {
    setErro("");
    try {
      const y = new Date().getFullYear();
      const payload = await request(`/api/faltas-docentes?status=TODAS&data_inicio=${y}-01-01&data_fim=${y}-12-31`);
      setItens(payload.ocorrencias || []);
    } catch (e) {
      setErro(e.message || "Não foi possível carregar as ocorrências.");
    }
  }

  useEffect(() => {
    carregar();
  }, [recarregarChave]);

  return (
    <>
      <FeedbackMessage type="success">{msg}</FeedbackMessage>
      <FeedbackMessage type="danger">{erro}</FeedbackMessage>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Professor</th>
              <th>Turma</th>
              <th>Disciplina</th>
              <th>Qtd. aulas</th>
              <th>Situação</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((o) => (
              <tr key={o.id}>
                <td>{o.data}</td>
                <td>{o.professorNome}</td>
                <td>{o.turmaNome}</td>
                <td>{o.disciplinaNome}</td>
                <td>{o.quantidadeAulas}</td>
                <td>
                  <span className={`badge ${o.status === "CANCELADA" ? "badge-light" : "badge-warn"}`}>
                    {rotuloStatusOcc(o.status)}
                  </span>
                </td>
                <td>
                  {o.status === "ATIVA" ? (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => setCancelar(o)}>
                      Cancelar ocorrência
                    </button>
                  ) : "—"}
                </td>
              </tr>
            ))}
            {!itens.length && (
              <tr>
                <td colSpan="7">
                  <EmptyState title="Nenhuma ocorrência nesta escola">
                    A ausência de diário não é falta docente. Só entram aqui as aulas previstas registradas pela gestão.
                  </EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {cancelar ? (
        <CancelarOcorrenciaModal
          ocorrencia={cancelar}
          onClose={() => setCancelar(null)}
          onSaved={(texto) => {
            setCancelar(null);
            setMsg(texto);
            carregar();
            if (onChanged) onChanged();
          }}
        />
      ) : null}
    </>
  );
}
