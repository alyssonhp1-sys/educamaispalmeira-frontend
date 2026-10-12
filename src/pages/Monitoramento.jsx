import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Kpi from "../components/Kpi.jsx";
import { GraficoCarga, TabelaAcompanhamento, TabelaEducacaoInfantil, rotuloPctAteHoje } from "../components/DiarioAula.jsx";
import { request } from "../api.js";
import { Breadcrumb, EmptyState, FeedbackMessage, LoadingState, PageHeader } from "../components/uiKit.jsx";

export default function Monitoramento() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    request(`/api/escolas/${id}/painel`).then(setData).catch((e) => setErro(e.message));
  }, [id]);

  if (erro) return <FeedbackMessage type="danger">{erro}</FeedbackMessage>;
  if (!data) return <LoadingState texto="Carregando escola..." />;

  const acomp = data.acompanhamentoPedagogico || {};
  const porTurma = [];
  (acomp.itens || []).forEach((i) => {
    let g = porTurma.find((x) => x.turmaId === i.turmaId);
    if (!g) {
      g = { turmaId: i.turmaId, turmaNome: i.turmaNome, itens: [] };
      porTurma.push(g);
    }
    g.itens.push(i);
  });

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Visão da rede", to: "/" },
          { label: data.escola.nome },
        ]}
      />
      <PageHeader
        kicker="Acompanhamento da Secretaria"
        title={data.escola.nome}
        description={`INEP ${data.escola.inep}`}
        actions={<button className="btn btn-outline" onClick={() => nav("/")}>Voltar à visão da rede</button>}
      />
      <div className="grid-stats mb">
        <Kpi icon="fa-clock" value={acomp.cargaPrevista ?? "—"} label="Carga anual" />
        <Kpi icon="fa-calendar-check" value={acomp.aulasPrevistasAteHoje ?? "—"} label="Previstas até hoje" />
        <Kpi icon="fa-check" value={acomp.aulasValidadas ?? 0} label="Validadas" />
        <Kpi icon="fa-percent" value={rotuloPctAteHoje(acomp)} label="% até hoje" />
      </div>
      {acomp.limitacaoCalendario && (
        <div className="alert alert-info mb">{acomp.observacaoCalendario}</div>
      )}
      <div className="card mb">
        <div className="card-header">Cumprimento até hoje</div>
        <div className="card-body">
          <GraficoCarga itens={acomp.itens} rotulo={(i) => `${i.turmaNome} · ${i.disciplinaNome}`} />
        </div>
      </div>
      <div className="card mb">
        <TabelaAcompanhamento itens={acomp.itens} />
      </div>
      {(acomp.educacaoInfantil || []).length > 0 && (
        <div className="card mb">
          <div className="card-header">Educação Infantil</div>
          <TabelaEducacaoInfantil itens={acomp.educacaoInfantil} />
        </div>
      )}
      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">Turmas, disciplinas e professores</div>
          <div className="card-body">
            {porTurma.map((t) => (
              <div className="class-item class-item-top" key={t.turmaId}>
                <div className="class-item-body">
                  <strong>{t.turmaNome}</strong>
                  {t.itens.map((a) => (
                    <div className="muted" key={a.alocacaoId}>
                      {a.disciplinaNome} · {a.professorNome} · previstas {a.aulasPrevistasAteHoje ?? "—"} · validadas {a.aulasValidadas}
                      {a.percentualCumprimentoAteHoje != null ? ` (${a.percentualCumprimentoAteHoje}%)` : " (sem previsão até a data)"}
                    </div>
                  ))}
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => nav(`/turma/${t.turmaId}`, { state: { voltarPara: `/monitorar/${id}`, voltarRotulo: data.escola.nome } })}>Abrir</button>
              </div>
            ))}
            {!porTurma.length && data.turmas.map((t) => (
              <div className="class-item" key={t.id}>
                <div>
                  <strong>{t.nome}</strong> <span className="badge badge-light">{t.etapaEnsino}</span>
                  <div className="muted">{t.anoLetivo} • {t.qtdAlunos} alunos</div>
                  <div>
                    {t.alocacoes.map((a) => (
                      <span key={a.id} className="badge badge-light badge-gap">{a.disciplinaNome}: {a.professorNome}</span>
                    ))}
                  </div>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => nav(`/turma/${t.id}`, { state: { voltarPara: `/monitorar/${id}`, voltarRotulo: data.escola.nome } })}>Abrir</button>
              </div>
            ))}
            {!data.turmas.length && <EmptyState title="Nenhuma turma nesta escola" />}
          </div>
        </div>
        <div className="card">
          <div className="card-header">Professores</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Nome</th><th>CPF</th></tr></thead>
              <tbody>
                {data.professores.map((p) => (
                  <tr key={p.id}><td>{p.nome}</td><td>{p.cpf}</td></tr>
                ))}
                {!data.professores.length && <tr><td colSpan="2"><EmptyState title="Nenhum professor" /></td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
