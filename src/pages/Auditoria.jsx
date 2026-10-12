import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/Modal.jsx";
import { request } from "../api.js";
import { formatarDataHora, rotuloPapel } from "../ui.js";
import { EmptyState, FeedbackMessage, LoadingState, PageHeader, DateInput } from "../components/uiKit.jsx";

const FILTROS_VAZIOS = {
  data_inicial: "",
  data_final: "",
  usuario_id: "",
  acao: "",
  entidade: "",
  entidade_id: "",
  escola_id: "",
  request_id: "",
};

function formatarJson(valor) {
  if (valor == null) return "—";
  try {
    return JSON.stringify(valor, null, 2);
  } catch (_e) {
    return String(valor);
  }
}

function Campo({ id, label, children }) {
  return (
    <div className="ficha-field">
      <label className="label" htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}

function LinhaDetalhe({ rotulo, valor }) {
  if (valor == null || valor === "") {
    return (
      <p>
        <strong>{rotulo}</strong>
        —
      </p>
    );
  }
  return (
    <p>
      <strong>{rotulo}</strong>
      {valor}
    </p>
  );
}

export default function Auditoria({ user }) {
  const nav = useNavigate();
  const municipal = user?.papel === "dirigente" || user?.papel === "secretaria";
  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [aplicados, setAplicados] = useState(FILTROS_VAZIOS);
  const [opcoes, setOpcoes] = useState({ acoes: [], entidades: [], escolas: [] });
  const [page, setPage] = useState(1);
  const [lista, setLista] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [acessoNegado, setAcessoNegado] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  const carregar = useCallback(async (pagina, filtro) => {
    setLoading(true);
    setErro("");
    const q = new URLSearchParams();
    q.set("page", String(pagina));
    q.set("per_page", "25");
    Object.entries(filtro).forEach(([chave, valor]) => {
      const texto = String(valor || "").trim();
      if (texto) q.set(chave, texto);
    });
    try {
      const data = await request(`/api/auditoria?${q.toString()}`);
      setLista(data);
      setAcessoNegado(false);
    } catch (e) {
      setLista(null);
      if (e.status === 403) {
        setAcessoNegado(true);
        setErro("Acesso negado.");
      } else {
        setErro(e.message || "Não foi possível carregar a auditoria.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    request("/api/auditoria/filtros")
      .then((data) => setOpcoes({
        acoes: data.acoes || [],
        entidades: data.entidades || [],
        escolas: data.escolas || [],
      }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    carregar(page, aplicados);
  }, [carregar, page, aplicados]);

  function onFiltro(chave, valor) {
    setFiltros({ ...filtros, [chave]: valor });
  }

  function filtrar(e) {
    e.preventDefault();
    setPage(1);
    setAplicados({ ...filtros });
  }

  function limpar() {
    setFiltros(FILTROS_VAZIOS);
    setPage(1);
    setAplicados(FILTROS_VAZIOS);
  }

  const items = lista?.items || [];
  const total = lista?.total ?? 0;
  const pages = lista?.pages ?? 0;
  const paginaAtual = lista?.page ?? page;

  return (
    <>
      <PageHeader
        kicker="Registro de operações"
        title="Auditoria"
        description="Consulta somente leitura dos eventos registrados no sistema."
        actions={<button type="button" className="btn btn-outline" onClick={() => nav("/")}>Voltar</button>}
      />

      <FeedbackMessage type="danger">{erro}</FeedbackMessage>

      {!acessoNegado && (
        <>
          <section className="section">
            <div className="card">
              <div className="card-body">
                <form onSubmit={filtrar}>
                  <div className="ficha-grid">
                    <Campo id="aud-di" label="Data inicial">
                      <DateInput id="aud-di" value={filtros.data_inicial} onChange={(e) => onFiltro("data_inicial", e.target.value)} />
                    </Campo>
                    <Campo id="aud-df" label="Data final">
                      <DateInput id="aud-df" value={filtros.data_final} onChange={(e) => onFiltro("data_final", e.target.value)} />
                    </Campo>
                    <Campo id="aud-uid" label="Usuário (ID)">
                      <input id="aud-uid" className="input" type="number" min="1" value={filtros.usuario_id} onChange={(e) => onFiltro("usuario_id", e.target.value)} />
                    </Campo>
                    <Campo id="aud-acao" label="Ação">
                      <select id="aud-acao" className="input" value={filtros.acao} onChange={(e) => onFiltro("acao", e.target.value)}>
                        <option value="">Todas</option>
                        {(opcoes.acoes || []).map((a) => (
                          <option key={a.valor} value={a.valor}>{a.rotulo}</option>
                        ))}
                      </select>
                    </Campo>
                    <Campo id="aud-ent" label="Entidade">
                      <select id="aud-ent" className="input" value={filtros.entidade} onChange={(e) => onFiltro("entidade", e.target.value)}>
                        <option value="">Todas</option>
                        {(opcoes.entidades || []).map((ent) => (
                          <option key={ent} value={ent}>{ent}</option>
                        ))}
                      </select>
                    </Campo>
                    <Campo id="aud-eid" label="ID da entidade">
                      <input id="aud-eid" className="input" type="number" value={filtros.entidade_id} onChange={(e) => onFiltro("entidade_id", e.target.value)} />
                    </Campo>
                    {municipal && (
                      <Campo id="aud-escola" label="Escola">
                        <select id="aud-escola" className="input" value={filtros.escola_id} onChange={(e) => onFiltro("escola_id", e.target.value)}>
                          <option value="">Toda a rede</option>
                          {(opcoes.escolas || []).map((e) => (
                            <option key={e.id} value={e.id}>{e.nome}</option>
                          ))}
                        </select>
                      </Campo>
                    )}
                    <Campo id="aud-req" label="Identificador da requisição">
                      <input id="aud-req" className="input" value={filtros.request_id} onChange={(e) => onFiltro("request_id", e.target.value)} autoComplete="off" />
                    </Campo>
                  </div>
                  <div className="flex mt">
                    <button className="btn btn-primary" type="submit">Filtrar</button>
                    <button className="btn btn-outline" type="button" onClick={limpar}>Limpar</button>
                  </div>
                </form>
              </div>
            </div>
          </section>

          <section className="section">
            <div className="card">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Data/Hora</th>
                      <th>Usuário</th>
                      <th>Ação</th>
                      <th>Entidade</th>
                      {municipal && <th>Escola</th>}
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan={municipal ? 6 : 5}>
                          <LoadingState texto="Carregando auditoria..." />
                        </td>
                      </tr>
                    )}
                    {!loading && items.map((item) => (
                      <tr key={item.id}>
                        <td>{formatarDataHora(item.data_hora)}</td>
                        <td>{item.usuario_nome || "—"}</td>
                        <td>
                          <span className="badge badge-light">{item.acao_rotulo || item.acao}</span>
                        </td>
                        <td>
                          {item.entidade}
                          {item.entidade_id != null ? ` #${item.entidade_id}` : ""}
                        </td>
                        {municipal && <td>{item.escola_nome || "Rede"}</td>}
                        <td>
                          <div className="row-actions">
                            <button type="button" className="btn btn-sm btn-outline" onClick={() => setDetalhe(item)}>
                              Detalhes
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {!loading && !items.length && (
                      <tr>
                        <td colSpan={municipal ? 6 : 5}>
                          <EmptyState title="Nenhum registro de auditoria encontrado.">
                            Nenhum registro corresponde aos filtros selecionados.
                          </EmptyState>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {!loading && total > 0 && (
              <div className="toolbar mt">
                <span className="muted">Página {paginaAtual} de {pages} · {total} registros</span>
                <div className="flex">
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={paginaAtual <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={pages > 0 && paginaAtual >= pages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {detalhe && (
        <Modal title="Detalhe do evento" large closeOnOverlay onClose={() => setDetalhe(null)}>
          <div className="aula-detalhe">
            <LinhaDetalhe rotulo="ID" valor={detalhe.id} />
            <LinhaDetalhe rotulo="Data/Hora" valor={formatarDataHora(detalhe.data_hora)} />
            <LinhaDetalhe rotulo="Ação" valor={`${detalhe.acao_rotulo || detalhe.acao} (${detalhe.acao})`} />
            <LinhaDetalhe rotulo="Entidade" valor={detalhe.entidade} />
            <LinhaDetalhe rotulo="ID da entidade" valor={detalhe.entidade_id} />
            <LinhaDetalhe rotulo="Ator" valor={detalhe.usuario_nome} />
            {detalhe.usuario_papel && (
              <LinhaDetalhe rotulo="Papel" valor={rotuloPapel(detalhe.usuario_papel)} />
            )}
            <LinhaDetalhe rotulo="Escola" valor={detalhe.escola_nome || (detalhe.escola_id == null ? "Rede" : null)} />
            <LinhaDetalhe rotulo="Request ID" valor={detalhe.request_id} />
            {Object.prototype.hasOwnProperty.call(detalhe, "ip") && (
              <LinhaDetalhe rotulo="IP" valor={detalhe.ip} />
            )}
            <p><strong>Dados anteriores</strong></p>
            <pre className="json-view">{formatarJson(detalhe.dados_anteriores)}</pre>
            <p><strong>Dados novos</strong></p>
            <pre className="json-view">{formatarJson(detalhe.dados_novos)}</pre>
          </div>
        </Modal>
      )}
    </>
  );
}
