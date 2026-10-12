import { useRef, useState } from "react";
import { baixarPdf, jsonBody, request } from "../api.js";
import Modal from "./Modal.jsx";
import { FeedbackMessage } from "./uiKit.jsx";

export function historicoTransferenciaVisivel(aluno, turma) {
  const etapa = (aluno && aluno.etapaEnsino) || (turma && turma.etapaEnsino);
  const status = String((aluno && aluno.turmaStatus) || (turma && turma.status) || "").toLowerCase();
  const temTurma = (aluno && aluno.turmaId) || (turma && turma.id);
  if (!temTurma) return false;
  if (etapa === "infantil") return false;
  if (etapa !== "fundamental") return false;
  if (status === "concluida") return false;
  return true;
}

function etapaDo(aluno, turma) {
  return (aluno && aluno.etapaEnsino) || (turma && turma.etapaEnsino) || "";
}

function temTurma(aluno, turma) {
  return Boolean((aluno && aluno.turmaId) || (turma && turma.id));
}

export function BotaoPdf({ url, className, children, disabled, onErro }) {
  const [gerando, setGerando] = useState(false);
  const lock = useRef(false);

  async function gerar() {
    if (lock.current || disabled) return;
    lock.current = true;
    if (onErro) onErro("");
    setGerando(true);
    try {
      await baixarPdf(url);
    } catch (e) {
      if (onErro) onErro(e.message || "Não foi possível gerar o PDF.");
    } finally {
      lock.current = false;
      setGerando(false);
    }
  }

  return (
    <button
      type="button"
      className={className || "btn btn-sm btn-outline"}
      disabled={disabled || gerando}
      onClick={gerar}
    >
      {gerando ? (
        <>
          <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
          Gerando PDF...
        </>
      ) : (
        <>
          <i className="fas fa-file-pdf" aria-hidden="true" />
          {children}
        </>
      )}
    </button>
  );
}

function textoNota(valor) {
  if (valor == null || valor === "") return "";
  const numero = Number(valor);
  if (Number.isNaN(numero)) return String(valor);
  return numero.toFixed(1).replace(".", ",");
}

function chaveCampo(nome, numero, campo) {
  return `${nome}::${numero}::${campo}`;
}

export function AcoesDocumentosAluno({
  alunoId,
  aluno,
  turma,
  historicoTransferencia,
  administrativo = true,
  parecer = true,
}) {
  const [erro, setErro] = useState("");
  const [complemento, setComplemento] = useState(null);
  const [rascunho, setRascunho] = useState({});
  const [gerandoTransf, setGerandoTransf] = useState(false);
  const [salvandoTransf, setSalvandoTransf] = useState(false);
  const lockTransf = useRef(false);

  if (!alunoId) return null;
  const etapa = etapaDo(aluno, turma);
  const comTurma = temTurma(aluno, turma);
  const mostrarTransferencia = historicoTransferencia ?? historicoTransferenciaVisivel(aluno, turma);
  const fundamental = etapa === "fundamental";
  const infantil = etapa === "infantil";

  async function gerarTransferencia() {
    if (lockTransf.current) return;
    lockTransf.current = true;
    setErro("");
    setGerandoTransf(true);
    try {
      const dados = await request(
        `/api/alunos/${alunoId}/documentos/historico-transferencia/complemento`,
      );
      if (dados.completo && !dados.complemento_id) {
        await baixarPdf(`/api/alunos/${alunoId}/documentos/historico-transferencia.pdf`);
      } else {
        setRascunho(rascunhoDe(dados));
        setComplemento(dados);
      }
    } catch (e) {
      setErro(e.message || "Não foi possível gerar o histórico para transferência.");
    } finally {
      lockTransf.current = false;
      setGerandoTransf(false);
    }
  }

  function alterarRascunho(nome, numero, campo, valor) {
    setRascunho((atual) => ({ ...atual, [chaveCampo(nome, numero, campo)]: valor }));
  }

  async function salvarEGerar() {
    if (!complemento || salvandoTransf) return;
    setErro("");
    setSalvandoTransf(true);
    try {
      const itens = [];
      for (const comp of complemento.componentes || []) {
        for (const periodo of comp.periodos || []) {
          if (periodo.futuro) continue;
          const nota = periodo.editavel_nota
            ? (rascunho[chaveCampo(comp.nome, periodo.numero, "nota")] ?? "")
            : null;
          const faltas = periodo.editavel_faltas
            ? (rascunho[chaveCampo(comp.nome, periodo.numero, "faltas")] ?? "")
            : null;
          if ((nota == null || nota === "") && (faltas == null || faltas === "")) continue;
          itens.push({
            nome: comp.nome,
            disciplina_id: comp.disciplina_id,
            periodo: periodo.numero,
            nota: periodo.editavel_nota ? (nota === "" ? null : nota) : null,
            faltas: periodo.editavel_faltas ? (faltas === "" ? null : faltas) : null,
          });
        }
      }
      await request(
        `/api/alunos/${alunoId}/documentos/historico-transferencia/complemento`,
        { method: "PUT", body: jsonBody({ itens }) },
      );
      await baixarPdf(`/api/alunos/${alunoId}/documentos/historico-transferencia.pdf`);
      setComplemento(null);
    } catch (e) {
      setErro(e.message || "Não foi possível gerar o histórico para transferência.");
    } finally {
      setSalvandoTransf(false);
    }
  }

  return (
    <div className="docs-panel">
      <FeedbackMessage type="danger">{erro}</FeedbackMessage>
      <div className="docs-actions">
        {administrativo && !infantil && (
          <BotaoPdf
            url={`/api/alunos/${alunoId}/documentos/historico.pdf`}
            onErro={setErro}
          >
            Gerar histórico escolar
          </BotaoPdf>
        )}
        {administrativo && mostrarTransferencia && (
          <button
            type="button"
            className="btn btn-sm btn-outline"
            disabled={gerandoTransf || salvandoTransf}
            onClick={gerarTransferencia}
          >
            {gerandoTransf ? (
              <>
                <i className="fas fa-circle-notch fa-spin" aria-hidden="true" />
                Gerando PDF...
              </>
            ) : (
              <>
                <i className="fas fa-file-pdf" aria-hidden="true" />
                Gerar histórico para transferência
              </>
            )}
          </button>
        )}
        {administrativo && fundamental && comTurma && (
          <BotaoPdf url={`/api/alunos/${alunoId}/documentos/boletim.pdf`} onErro={setErro}>
            Gerar boletim
          </BotaoPdf>
        )}
        {administrativo && comTurma && (
          <BotaoPdf url={`/api/alunos/${alunoId}/documentos/declaracao/cursando.pdf`} onErro={setErro}>
            Gerar declaração de matrícula
          </BotaoPdf>
        )}
        {administrativo && fundamental && comTurma && (
          <BotaoPdf url={`/api/alunos/${alunoId}/documentos/declaracao/conclusao.pdf`} onErro={setErro}>
            Gerar declaração de conclusão
          </BotaoPdf>
        )}
        {parecer && infantil && comTurma && (
          <BotaoPdf url={`/api/alunos/${alunoId}/documentos/parecer.pdf`} onErro={setErro}>
            Gerar parecer da Educação Infantil
          </BotaoPdf>
        )}
        {administrativo && comTurma && (
          <BotaoPdf url={`/api/alunos/${alunoId}/documentos/comprovante-matricula.pdf`} onErro={setErro}>
            Gerar ficha de matrícula
          </BotaoPdf>
        )}
      </div>
      {complemento && (
        <Modal
          title="DADOS COMPLEMENTARES PARA TRANSFERÊNCIA"
          large
          onClose={() => !salvandoTransf && setComplemento(null)}
          footer={(
            <>
              <button type="button" className="btn btn-outline" onClick={() => setComplemento(null)} disabled={salvandoTransf}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={salvarEGerar} disabled={salvandoTransf}>
                {salvandoTransf ? "Gerando PDF..." : "Salvar e gerar PDF"}
              </button>
            </>
          )}
        >
          <p className="trajetoria-aviso">
            Informações transcritas para emitir o histórico de transferência durante a implantação do Educa+.
            Não são nota oficial lançada no diário. O que já existe no sistema permanece e não é substituído.
            Períodos que ainda não começaram ficam em branco.
          </p>
          <p className="muted">
            {complemento.turma_nome} · {complemento.ano_letivo}
          </p>
          <div className="comp-transf">
            {(complemento.componentes || []).map((comp) => (
              <section key={comp.nome} className="comp-transf-item">
                <strong>{comp.nome}</strong>
                {(comp.periodos || []).map((periodo) => (
                  <div key={periodo.numero} className="comp-periodo">
                    <span className="comp-periodo-nome">{periodo.nome}</span>
                    <label className="field">
                      <span className="label">Nota</span>
                      {periodo.futuro || !periodo.editavel_nota ? (
                        <input
                          className="input"
                          value={periodo.futuro ? "—" : textoNota(periodo.nota_oficial)}
                          disabled
                          readOnly
                        />
                      ) : (
                        <input
                          className="input"
                          inputMode="decimal"
                          value={rascunho[chaveCampo(comp.nome, periodo.numero, "nota")] ?? ""}
                          onChange={(e) => alterarRascunho(comp.nome, periodo.numero, "nota", e.target.value)}
                          aria-label={`Nota de ${comp.nome} no ${periodo.nome}`}
                        />
                      )}
                    </label>
                    <label className="field">
                      <span className="label">Faltas</span>
                      {periodo.futuro || !periodo.editavel_faltas ? (
                        <input
                          className="input"
                          value={periodo.futuro ? "—" : (periodo.faltas_oficiais == null ? "" : String(periodo.faltas_oficiais))}
                          disabled
                          readOnly
                        />
                      ) : (
                        <input
                          className="input"
                          inputMode="numeric"
                          value={rascunho[chaveCampo(comp.nome, periodo.numero, "faltas")] ?? ""}
                          onChange={(e) => alterarRascunho(comp.nome, periodo.numero, "faltas", e.target.value)}
                          aria-label={`Faltas de ${comp.nome} no ${periodo.nome}`}
                        />
                      )}
                    </label>
                  </div>
                ))}
              </section>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function rascunhoDe(dados) {
  const rascunho = {};
  for (const comp of dados.componentes || []) {
    for (const periodo of comp.periodos || []) {
      if (periodo.editavel_nota && periodo.nota_complementar != null) {
        rascunho[chaveCampo(comp.nome, periodo.numero, "nota")] = textoNota(periodo.nota_complementar);
      }
      if (periodo.editavel_faltas && periodo.faltas_complementares != null) {
        rascunho[chaveCampo(comp.nome, periodo.numero, "faltas")] = String(periodo.faltas_complementares);
      }
    }
  }
  return rascunho;
}
