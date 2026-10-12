import { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { request, jsonBody } from "../api.js";
import { ConfirmModal, EmptyState, FeedbackMessage, LoadingState } from "./uiKit.jsx";

function componenteVazio() {
  return { nome: "", carga_horaria: "", nota_conceito: "", situacao: "", categoria: "" };
}

function formVazio() {
  return {
    ano_letivo: "",
    serie: "",
    estabelecimento: "",
    municipio: "",
    uf: "",
    carga_horaria_total: "",
    resultado: "",
    observacao: "",
    componentes: [componenteVazio()],
  };
}

function deRegistro(item) {
  const comps = (item.componentes || []).map((c) => ({
    nome: c.nome || "",
    carga_horaria: c.carga_horaria == null ? "" : String(c.carga_horaria),
    nota_conceito: c.nota_conceito || "",
    situacao: c.situacao || "",
    categoria: c.categoria || "",
  }));
  return {
    ano_letivo: item.ano_letivo == null ? "" : String(item.ano_letivo),
    serie: item.serie == null ? "" : String(item.serie),
    estabelecimento: item.estabelecimento || "",
    municipio: item.municipio || "",
    uf: item.uf || "",
    carga_horaria_total: item.carga_horaria_total == null ? "" : String(item.carga_horaria_total),
    resultado: item.resultado || "",
    observacao: item.observacao || "",
    componentes: comps.length ? comps : [componenteVazio()],
  };
}

function payloadDe(form) {
  const componentes = (form.componentes || [])
    .filter((c) => (c.nome || "").trim())
    .map((c) => ({
      nome: c.nome.trim(),
      carga_horaria: c.carga_horaria === "" ? null : Number(c.carga_horaria),
      nota_conceito: (c.nota_conceito || "").trim() || null,
      situacao: (c.situacao || "").trim() || null,
      categoria: c.categoria || null,
    }));
  return {
    ano_letivo: form.ano_letivo === "" ? null : Number(form.ano_letivo),
    serie: form.serie === "" ? null : Number(form.serie),
    estabelecimento: (form.estabelecimento || "").trim() || null,
    municipio: (form.municipio || "").trim() || null,
    uf: (form.uf || "").trim() || null,
    carga_horaria_total: form.carga_horaria_total === "" ? null : Number(form.carga_horaria_total),
    resultado: (form.resultado || "").trim() || null,
    observacao: (form.observacao || "").trim() || null,
    componentes,
  };
}

function municipioUf(item) {
  const mun = item.municipio || "";
  const uf = item.uf || "";
  if (mun && uf) return `${mun}/${uf}`;
  return mun || uf || "—";
}

export default function TrajetoriaLegadaAluno({ alunoId }) {
  const [itens, setItens] = useState([]);
  const [anoInicio, setAnoInicio] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(formVazio());
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmacao, setConfirmacao] = useState(null);
  const [confirmando, setConfirmando] = useState(false);

  async function carregar() {
    if (!alunoId) return;
    setCarregando(true);
    setErro("");
    try {
      const data = await request(`/api/alunos/${alunoId}/trajetoria-legada`);
      setItens(Array.isArray(data && data.itens) ? data.itens : []);
      setAnoInicio(data && data.ano_inicio_automatico);
    } catch (e) {
      setErro(e.message || "Não foi possível carregar a trajetória anterior.");
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [alunoId]);

  function abrirNovo() {
    setEditandoId(null);
    setForm(formVazio());
    setErro("");
    setModal("form");
  }

  function abrirEditar(item) {
    setEditandoId(item.id);
    setForm(deRegistro(item));
    setErro("");
    setModal("form");
  }

  function setCampo(chave, valor) {
    setForm({ ...form, [chave]: valor });
  }

  function setComponente(idx, chave, valor) {
    const comps = form.componentes.slice();
    comps[idx] = { ...comps[idx], [chave]: valor };
    setForm({ ...form, componentes: comps });
  }

  function addComponente() {
    setForm({ ...form, componentes: [...form.componentes, componenteVazio()] });
  }

  function removerComponente(idx) {
    const comps = form.componentes.filter((_, i) => i !== idx);
    setForm({ ...form, componentes: comps.length ? comps : [componenteVazio()] });
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const body = payloadDe(form);
      if (editandoId) {
        await request(`/api/trajetoria-legada/${editandoId}`, {
          method: "PUT",
          body: jsonBody(body),
        });
      } else {
        await request(`/api/alunos/${alunoId}/trajetoria-legada`, {
          method: "POST",
          body: jsonBody(body),
        });
      }
      setModal(null);
      setMsg("Dados anteriores ao Educa+ salvos.");
      await carregar();
    } catch (err) {
      setErro(err.message || "Não foi possível salvar a trajetória anterior.");
    } finally {
      setSalvando(false);
    }
  }

  function excluir(item) {
    setConfirmacao({
      title: "Remover trajetória anterior",
      message: `Remover a trajetória anterior de ${item.ano_letivo} (${item.serie}º ano)? Esta ação não altera dados do Educa+.`,
      item,
    });
  }

  async function confirmarExclusao() {
    if (!confirmacao?.item) return;
    setConfirmando(true);
    setErro("");
    try {
      await request(`/api/trajetoria-legada/${confirmacao.item.id}`, { method: "DELETE" });
      setConfirmacao(null);
      setMsg("Registro anterior removido.");
      await carregar();
    } catch (err) {
      setErro(err.message || "Não foi possível excluir o registro.");
    } finally {
      setConfirmando(false);
    }
  }

  if (!alunoId) return null;

  return (
    <div className="trajetoria-legada">
      <h3 className="section-title">Dados anteriores ao Educa+</h3>
      <p className="trajetoria-aviso">
        Dados anteriores ao Educa+ — preenchimento manual. Transcreva exatamente o que consta no
        histórico/documento apresentado. Não complete com a matriz curricular vigente.
        {anoInicio ? ` A partir de ${anoInicio} os dados vêm automaticamente do sistema.` : ""}
      </p>
      <FeedbackMessage type="danger">{erro && modal !== "form" ? erro : ""}</FeedbackMessage>
      <FeedbackMessage type="success">{msg}</FeedbackMessage>
      <div className="flex mb flex-wrap">
        <strong>Trajetória anterior cadastrada</strong>
        <button type="button" className="btn btn-sm btn-primary" onClick={abrirNovo}>
          Adicionar ano anterior
        </button>
      </div>
      {carregando ? <LoadingState texto="Carregando dados anteriores..." /> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ano</th>
              <th>Série</th>
              <th>Escola</th>
              <th>Município/UF</th>
              <th>Resultado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id}>
                <td>{item.ano_letivo}</td>
                <td>{item.serie ? `${item.serie}º` : "—"}</td>
                <td>{item.estabelecimento || "—"}</td>
                <td>{municipioUf(item)}</td>
                <td>{item.resultado || "—"}</td>
                <td className="row-actions">
                  <button type="button" className="btn btn-sm btn-outline" onClick={() => abrirEditar(item)}>
                    Editar
                  </button>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => excluir(item)}>
                    Excluir
                  </button>
                </td>
              </tr>
            ))}
            {!carregando && !itens.length && (
              <tr>
                <td colSpan={6}>
                  <EmptyState title="Nenhum ano anterior cadastrado">Cadastre os dados anteriores ao Educa+ quando houver histórico em papel.</EmptyState>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal === "form" && (
        <Modal
          title={editandoId ? "Editar ano anterior" : "Adicionar ano anterior"}
          large
          onClose={() => !salvando && setModal(null)}
          footer={
            <>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" form="form-trajetoria-legada" className="btn btn-primary" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </>
          }
        >
          {erro && <div className="alert alert-danger">{erro}</div>}
          <p className="muted">
            Informe a escola e a localidade uma vez para o ano. Depois acrescente só os componentes
            efetivamente cursados. Deixe em branco CH, nota ou situação que não constem no documento.
          </p>
          <form id="form-trajetoria-legada" onSubmit={salvar}>
            <div className="ficha-grid">
              <div>
                <label className="label">Ano letivo *</label>
                <input className="input" type="number" required value={form.ano_letivo} onChange={(e) => setCampo("ano_letivo", e.target.value)} />
              </div>
              <div>
                <label className="label">Série/Ano (1º ao 9º) *</label>
                <input className="input" type="number" min="1" max="9" required value={form.serie} onChange={(e) => setCampo("serie", e.target.value)} />
              </div>
              <div>
                <label className="label">Estabelecimento de ensino *</label>
                <input className="input" required value={form.estabelecimento} onChange={(e) => setCampo("estabelecimento", e.target.value)} />
              </div>
              <div>
                <label className="label">Município *</label>
                <input className="input" required value={form.municipio} onChange={(e) => setCampo("municipio", e.target.value)} />
              </div>
              <div>
                <label className="label">UF *</label>
                <input className="input" maxLength={2} required value={form.uf} onChange={(e) => setCampo("uf", e.target.value)} />
              </div>
              <div>
                <label className="label">Carga horária total do ano</label>
                <input className="input" type="number" value={form.carga_horaria_total} onChange={(e) => setCampo("carga_horaria_total", e.target.value)} />
              </div>
              <div>
                <label className="label">Resultado final do ano</label>
                <input className="input" value={form.resultado} onChange={(e) => setCampo("resultado", e.target.value)} placeholder="Aprovado, etc." />
              </div>
              <div className="span">
                <label className="label">Observação</label>
                <input className="input" value={form.observacao} onChange={(e) => setCampo("observacao", e.target.value)} />
              </div>
            </div>
            <h4 className="ficha-title componentes-titulo">Componentes curriculares</h4>
            {(form.componentes || []).map((c, idx) => (
              <div key={idx} className="trajetoria-comp">
                <input className="input" placeholder="Componente curricular *" value={c.nome} onChange={(e) => setComponente(idx, "nome", e.target.value)} />
                <input className="input" placeholder="CH" value={c.carga_horaria} onChange={(e) => setComponente(idx, "carga_horaria", e.target.value)} />
                <input className="input" placeholder="Nota/Conceito" value={c.nota_conceito} onChange={(e) => setComponente(idx, "nota_conceito", e.target.value)} />
                <input className="input" placeholder="Situação" value={c.situacao} onChange={(e) => setComponente(idx, "situacao", e.target.value)} />
                <select className="input" value={c.categoria} onChange={(e) => setComponente(idx, "categoria", e.target.value)}>
                  <option value="">Categoria (opcional)</option>
                  <option value="BASE_COMUM">Base comum</option>
                  <option value="BASE_DIVERSIFICADA">Base diversificada</option>
                </select>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => removerComponente(idx)}>Remover</button>
              </div>
            ))}
            <button type="button" className="btn btn-sm btn-outline" onClick={addComponente}>Adicionar componente</button>
          </form>
        </Modal>
      )}
      <ConfirmModal
        open={!!confirmacao}
        title={confirmacao?.title}
        message={confirmacao?.message}
        confirmLabel="Remover"
        danger
        busy={confirmando}
        onCancel={() => !confirmando && setConfirmacao(null)}
        onConfirm={confirmarExclusao}
      />
    </div>
  );
}
