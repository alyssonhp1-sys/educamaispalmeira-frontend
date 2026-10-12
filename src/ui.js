export function rotuloPapel(papel) {
  return {
    dirigente: "Secretaria Municipal",
    secretaria: "Secretaria Municipal",
    gestor_escolar: "Gestor Escolar",
    coordenador_pedagogico: "Coordenação Pedagógica",
    professor: "Professor",
  }[papel] || papel || "";
}

export function rotuloQuantidade(n, singular, plural) {
  return Number(n) === 1 ? singular : plural;
}

export function rotuloStatusPlano(status) {
  return {
    pendente: "Em análise",
    aprovado: "Aprovado",
    revisar: "Devolvido para revisão",
  }[status] || status || "";
}

export function classeStatusPlano(status) {
  return {
    pendente: "badge-warn",
    aprovado: "badge-ok",
    revisar: "badge-danger",
  }[status] || "";
}

export function rotuloSituacaoAluno(situacao) {
  return {
    ativo: "Ativo",
    cursando: "Ativo",
    inativo: "Inativo",
    transferido: "Transferido",
  }[situacao] || situacao || "";
}

export function rotuloStatusAula(status) {
  return {
    pendente: "Pendente",
    validada: "Validada",
    invalidada: "Invalidada",
  }[status] || status || "";
}

export function classeStatusAula(status) {
  return {
    pendente: "badge-warn",
    validada: "badge-ok",
    invalidada: "badge-danger",
  }[status] || "";
}

export function rotuloEtapa(etapa) {
  return {
    fundamental: "Ensino Fundamental",
    infantil: "Educação Infantil",
    eja: "EJA",
  }[etapa] || etapa || "";
}

export function rotuloTipoDia(tipo) {
  return {
    LETIVO: "Letivo",
    FERIADO: "Feriado",
    RECESSO: "Recesso",
    NAO_LETIVO: "Não letivo",
    REPOSICAO: "Reposição",
  }[tipo] || tipo || "";
}

export function rotuloJornada(tipo) {
  return {
    PARCIAL: "Parcial",
    INTEGRAL: "Integral",
  }[tipo] || tipo || "Não configurada";
}

export const DIAS_SEMANA = [
  { value: 0, label: "Segunda" },
  { value: 1, label: "Terça" },
  { value: 2, label: "Quarta" },
  { value: 3, label: "Quinta" },
  { value: 4, label: "Sexta" },
  { value: 5, label: "Sábado" },
  { value: 6, label: "Domingo" },
];

export function formatarDataBr(iso) {
  if (!iso) return "";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatarDataHora(iso) {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
  const soData = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (soData) return `${soData[3]}/${soData[2]}/${soData[1]}`;
  return String(iso);
}

export function avisarSenhaTemporaria(data, contexto) {
  const senha = data && (data.senhaTemporaria || data.senha_temporaria);
  if (!senha) return;
  const titulo = contexto === "reset" ? "Senha redefinida" : "Usuário criado";
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("educamais:senha-temporaria", {
    detail: {
      titulo,
      senha,
      mensagem: "Informe esta senha ao usuário. Ela não poderá ser consultada novamente.",
    },
  }));
}
