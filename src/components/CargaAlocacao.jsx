import { DIAS_SEMANA } from "../ui.js";

export function camposCargaDe(aloc = {}) {
  const grade = {};
  DIAS_SEMANA.forEach((d) => { grade[d.value] = ""; });
  (aloc.grade || []).forEach((h) => {
    grade[h.diaSemana] = h.quantidadeAulas;
  });
  return {
    professor_id: aloc.professorId || aloc.professor_id || "",
    turma_id: aloc.turmaId || aloc.turma_id || "",
    disciplina_id: aloc.disciplinaId || aloc.disciplina_id || "",
    aulas_semanais: aloc.aulasSemanais || aloc.aulas_semanais || "",
    duracao_aula_minutos: aloc.duracaoAulaMinutos || aloc.duracao_aula_minutos || "",
    carga_horaria_prevista: aloc.cargaHorariaPrevista || aloc.carga_horaria_prevista || aloc.cargaPrevista || "",
    cargaSugerida: aloc.cargaSugerida || "",
    grade,
  };
}

export function payloadCarga(form) {
  const grade = DIAS_SEMANA
    .map((d) => ({ dia_semana: d.value, quantidade_aulas: Number(form.grade?.[d.value] || 0) }))
    .filter((h) => h.quantidade_aulas > 0);
  const body = {
    professor_id: form.professor_id || undefined,
    turma_id: form.turma_id || undefined,
    disciplina_id: form.disciplina_id || undefined,
    aulas_semanais: form.aulas_semanais || undefined,
    duracao_aula_minutos: form.duracao_aula_minutos || undefined,
    carga_horaria_prevista: form.carga_horaria_prevista || undefined,
    grade,
  };
  Object.keys(body).forEach((k) => {
    if (body[k] === undefined || body[k] === "") delete body[k];
  });
  return body;
}

export function CamposCargaAlocacao({ form, setForm, professores, turmas, disciplinas, infantil }) {
  function set(k, v) {
    setForm({ ...form, [k]: v });
  }
  function setDia(dia, qtd) {
    setForm({ ...form, grade: { ...(form.grade || {}), [dia]: qtd } });
  }
  const somaGrade = Object.values(form.grade || {}).reduce((acc, v) => acc + (Number(v) || 0), 0);
  return (
    <>
      {professores && (
        <>
          <label className="label">Professor</label>
          <select className="input field" value={form.professor_id || ""} onChange={(e) => set("professor_id", e.target.value)}>
            <option value="">Selecione</option>
            {professores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </>
      )}
      {turmas && (
        <>
          <label className="label">Turma</label>
          <select className="input field" value={form.turma_id || ""} onChange={(e) => set("turma_id", e.target.value)}>
            <option value="">Selecione</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </>
      )}
      {disciplinas && !infantil && (
        <>
          <label className="label">Disciplina</label>
          <select className="input field" value={form.disciplina_id || ""} onChange={(e) => set("disciplina_id", e.target.value)}>
            <option value="">Selecione</option>
            {disciplinas.map((d) => <option key={d.id} value={d.id}>{d.nome}</option>)}
          </select>
        </>
      )}
      {!infantil && (
        <>
          <div className="grid grid-3">
            <div>
              <label className="label">Aulas por semana</label>
              <input className="input" type="number" min="1" value={form.aulas_semanais || ""} onChange={(e) => set("aulas_semanais", e.target.value)} />
            </div>
            <div>
              <label className="label">Duração (minutos)</label>
              <input className="input" type="number" min="1" value={form.duracao_aula_minutos || ""} onChange={(e) => set("duracao_aula_minutos", e.target.value)} />
            </div>
            <div>
              <label className="label">Carga anual prevista (aulas)</label>
              <input className="input" type="number" min="1" placeholder="Opcional" value={form.carga_horaria_prevista || ""} onChange={(e) => set("carga_horaria_prevista", e.target.value)} />
            </div>
          </div>
          {form.cargaSugerida ? (
            <p className="muted">
              Sugestão com o calendário/grade: {form.cargaSugerida} aulas.
              <button type="button" className="text-link" onClick={() => set("carga_horaria_prevista", form.cargaSugerida)}>Usar sugestão</button>
            </p>
          ) : (
            <p className="muted">A sugestão anual não é obrigatória. A Secretaria/gestão pode ajustar a carga final.</p>
          )}
          <label className="label">Grade semanal (aulas por dia)</label>
          <div className="grade-semana">
            {DIAS_SEMANA.map((d) => (
              <div key={d.value}>
                <label className="label">{d.label}</label>
                <input className="input" type="number" min="0" value={form.grade?.[d.value] ?? ""} onChange={(e) => setDia(d.value, e.target.value)} />
              </div>
            ))}
          </div>
          {somaGrade > 0 && <p className="muted">Total na grade: {somaGrade} aula(s) por semana.</p>}
        </>
      )}
    </>
  );
}
