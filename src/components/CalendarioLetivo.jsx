import { useEffect, useMemo, useState } from "react";
import { request, jsonBody } from "../api.js";
import { rotuloTipoDia } from "../ui.js";
import { FeedbackMessage, DateInput } from "./uiKit.jsx";

const TIPOS = ["LETIVO", "FERIADO", "RECESSO", "NAO_LETIVO", "REPOSICAO"];
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DOW = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function iso(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function diasDoMes(ano, mes) {
  const primeiro = new Date(ano, mes, 1);
  const offset = (primeiro.getDay() + 6) % 7;
  const last = new Date(ano, mes + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push(null);
  for (let d = 1; d <= last; d += 1) cells.push(new Date(ano, mes, d));
  return cells;
}

function periodoVazio(n) {
  return { numero: n, nome: `${n}º Bimestre`, data_inicio: "", data_fim: "" };
}

export default function CalendarioLetivo({ somenteLeitura }) {
  const [anos, setAnos] = useState([]);
  const [anoId, setAnoId] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [form, setForm] = useState({
    ano: new Date().getFullYear(),
    data_inicio: "",
    data_fim: "",
    ativo: true,
    periodos: [1, 2, 3, 4].map(periodoVazio),
  });
  const [mes, setMes] = useState(new Date().getMonth());
  const [anoMes, setAnoMes] = useState(new Date().getFullYear());
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [diaAberto, setDiaAberto] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const mapaDias = useMemo(() => {
    const m = {};
    (detalhe?.dias || []).forEach((d) => { m[d.data] = d; });
    return m;
  }, [detalhe]);

  async function carregarLista() {
    const data = await request("/api/anos-letivos");
    setAnos(data.anos || []);
    return data;
  }

  async function carregarAno(id, m = mes, am = anoMes) {
    if (!id) {
      setDetalhe(null);
      return;
    }
    const data = await request(`/api/anos-letivos/${id}?mes=${m + 1}&ano=${am}`);
    setDetalhe(data);
    setForm({
      ano: data.ano,
      data_inicio: data.dataInicio || "",
      data_fim: data.dataFim || "",
      ativo: !!data.ativo,
      periodos: [1, 2, 3, 4].map((n) => {
        const p = (data.periodos || []).find((x) => x.numero === n);
        return p
          ? { numero: n, nome: p.nome, data_inicio: p.dataInicio, data_fim: p.dataFim }
          : periodoVazio(n);
      }),
    });
    return data;
  }

  useEffect(() => {
    carregarLista()
      .then((data) => {
        const ativo = data.ativo || (data.anos || [])[0];
        if (ativo) {
          setAnoId(String(ativo.id));
          const inicio = ativo.dataInicio ? new Date(`${ativo.dataInicio}T00:00:00`) : new Date();
          setMes(inicio.getMonth());
          setAnoMes(inicio.getFullYear());
          return carregarAno(ativo.id, inicio.getMonth(), inicio.getFullYear());
        }
        return null;
      })
      .catch((e) => setErro(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function recarregar(id = anoId, m = mes, am = anoMes) {
    setErro("");
    await carregarLista();
    if (id) await carregarAno(id, m, am);
  }

  async function salvarAno() {
    setErro("");
    setMsg("");
    setSalvando(true);
    try {
      const payload = {
        ano: Number(form.ano),
        data_inicio: form.data_inicio,
        data_fim: form.data_fim,
        ativo: !!form.ativo,
        periodos: form.periodos.filter((p) => p.data_inicio && p.data_fim),
      };
      let salvo;
      if (anoId) {
        salvo = await request(`/api/anos-letivos/${anoId}`, { method: "PUT", body: jsonBody(payload) });
      } else {
        salvo = await request("/api/anos-letivos", { method: "POST", body: jsonBody(payload) });
        setAnoId(String(salvo.id));
      }
      setMsg(salvo.mensagem || "Ano letivo salvo.");
      const inicio = form.data_inicio ? new Date(`${form.data_inicio}T00:00:00`) : new Date();
      setMes(inicio.getMonth());
      setAnoMes(inicio.getFullYear());
      await recarregar(salvo.id, inicio.getMonth(), inicio.getFullYear());
    } catch (e) {
      setErro(e.message || "Não foi possível salvar o ano letivo.");
    } finally {
      setSalvando(false);
    }
  }

  async function gerar() {
    if (!anoId) return setErro("Salve o ano letivo antes de gerar o calendário.");
    setErro("");
    setMsg("");
    setSalvando(true);
    try {
      const r = await request(`/api/anos-letivos/${anoId}/gerar-calendario`, { method: "POST" });
      setMsg(r.mensagem || "Calendário gerado.");
      await recarregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function marcarDia(dataIso, tipo, descricao) {
    if (somenteLeitura || !anoId) return;
    setErro("");
    try {
      await request(`/api/anos-letivos/${anoId}/dias`, {
        method: "PUT",
        body: jsonBody({ data: dataIso, tipo, descricao }),
      });
      setDiaAberto(null);
      await recarregar();
    } catch (e) {
      setErro(e.message);
    }
  }

  function setPeriodo(n, campo, valor) {
    setForm({
      ...form,
      periodos: form.periodos.map((p) => (p.numero === n ? { ...p, [campo]: valor } : p)),
    });
  }

  function navegar(delta) {
    let m = mes + delta;
    let a = anoMes;
    if (m < 0) { m = 11; a -= 1; }
    if (m > 11) { m = 0; a += 1; }
    setMes(m);
    setAnoMes(a);
    if (anoId) carregarAno(anoId, m, a).catch((e) => setErro(e.message));
  }

  const cells = diasDoMes(anoMes, mes);

  return (
    <section className="section">
      <div className="section-head">
        <div>
          <h2 className="section-title">Calendário letivo</h2>
          <p className="section-sub">
            {somenteLeitura
              ? "Consulta da rede. Somente a Secretaria altera o calendário."
              : "Defina o ano, os bimestres e marque dias letivos, feriados, recessos e reposições."}
          </p>
        </div>
      </div>
      <FeedbackMessage type="success">{msg}</FeedbackMessage>
      <FeedbackMessage type="danger">{erro}</FeedbackMessage>

      <div className="cal-layout">
      <div className="card mb">
        <div className="card-body">
          <div className="grid grid-3 mb">
            <div>
              <label className="label" htmlFor="cal-ano-cadastrado">Ano cadastrado</label>
              <select
                id="cal-ano-cadastrado"
                className="input"
                value={anoId}
                onChange={(e) => {
                  const id = e.target.value;
                  setAnoId(id);
                  if (id) recarregar(id);
                  else setDetalhe(null);
                }}
              >
                <option value="">{somenteLeitura ? "Nenhum ano letivo" : "Novo ano letivo"}</option>
                {anos.map((a) => (
                  <option key={a.id} value={a.id}>{a.ano}{a.ativo ? " (ativo)" : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="cal-ano">Ano</label>
              <input id="cal-ano" className="input" type="number" disabled={somenteLeitura} value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} />
            </div>
            <div>
              <label className="label">Ativo na rede</label>
              <label className="check">
                <input type="checkbox" disabled={somenteLeitura} checked={!!form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
                Ano letivo vigente
              </label>
            </div>
          </div>
          <div className="grid grid-2 mb">
            <div>
              <label className="label" htmlFor="cal-data-inicio">Início</label>
              <DateInput id="cal-data-inicio" disabled={somenteLeitura} value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
            </div>
            <div>
              <label className="label" htmlFor="cal-data-fim">Término</label>
              <DateInput id="cal-data-fim" disabled={somenteLeitura} value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
            </div>
          </div>
          <h3 className="ficha-title">Bimestres</h3>
          <div className="table-wrap mb">
            <table>
              <thead><tr><th>Período</th><th>Nome</th><th>Início</th><th>Fim</th></tr></thead>
              <tbody>
                {form.periodos.map((p) => (
                  <tr key={p.numero}>
                    <td>{p.numero}º</td>
                    <td><input className="input" disabled={somenteLeitura} value={p.nome} onChange={(e) => setPeriodo(p.numero, "nome", e.target.value)} /></td>
                    <td><input className="input" type="date" disabled={somenteLeitura} value={p.data_inicio} onChange={(e) => setPeriodo(p.numero, "data_inicio", e.target.value)} /></td>
                    <td><input className="input" type="date" disabled={somenteLeitura} value={p.data_fim} onChange={(e) => setPeriodo(p.numero, "data_fim", e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!somenteLeitura && (
            <div className="flex flex-wrap">
              <button type="button" className="btn btn-primary" onClick={salvarAno} disabled={salvando}>{salvando ? "Salvando..." : "Salvar ano e bimestres"}</button>
              <button type="button" className="btn btn-outline" onClick={gerar} disabled={!anoId || salvando}>{salvando ? "Gerando..." : "Gerar dias úteis (seg–sex)"}</button>
            </div>
          )}
          {detalhe && (
            <p className="muted mt">
              Dias letivos previstos: <strong>{detalhe.diasLetivosPrevistos ?? "—"}</strong>
              {" "}(LETIVO e REPOSIÇÃO). Alterar um dia passado não apaga registros de aula.
            </p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header toolbar">
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => navegar(-1)} aria-label="Mês anterior" title="Mês anterior">&larr;</button>
          <strong>{MESES[mes]} {anoMes}</strong>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => navegar(1)} aria-label="Próximo mês" title="Próximo mês">&rarr;</button>
        </div>
        <div className="card-body">
          <div className="cal-legend mb">
            {TIPOS.map((t) => <span key={t} className={`cal-chip cal-${t}`}>{rotuloTipoDia(t)}</span>)}
          </div>
          <div className="cal-grid">
            {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} className="cal-cell empty" />;
              const key = iso(d);
              const info = mapaDias[key];
              const tipo = info?.tipo || "";
              return (
                <button
                  key={key}
                  type="button"
                  className={`cal-cell ${tipo ? `cal-${tipo}` : ""} ${diaAberto === key ? "open" : ""}`}
                  onClick={() => setDiaAberto(diaAberto === key ? null : key)}
                  title={info?.descricao || rotuloTipoDia(tipo) || "Sem tipo"}
                >
                  <span>{d.getDate()}</span>
                  {tipo && <small>{rotuloTipoDia(tipo)}</small>}
                </button>
              );
            })}
          </div>
          {diaAberto && (
            <div className="cal-editor mt">
              <strong>{diaAberto}</strong>
              {somenteLeitura ? (
                <p className="muted">{rotuloTipoDia(mapaDias[diaAberto]?.tipo) || "Dia ainda não classificado."}</p>
              ) : (
                <div className="flex flex-wrap mt">
                  {TIPOS.map((t) => (
                    <button key={t} type="button" className={`btn btn-sm ${mapaDias[diaAberto]?.tipo === t ? "btn-primary" : "btn-outline"}`} onClick={() => marcarDia(diaAberto, t, mapaDias[diaAberto]?.descricao)}>
                      {rotuloTipoDia(t)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </section>
  );
}
