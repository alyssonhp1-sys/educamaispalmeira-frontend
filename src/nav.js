export function itensNavegacao(papel) {
  if (papel === "gestor_escolar") {
    return [
      { to: "/", label: "Visão da escola", kind: "home", homeSecoes: ["turmas", "historico"] },
      { to: "/?secao=alunos", label: "Alunos", secao: "alunos" },
      { to: "/?secao=professores", label: "Professores", secao: "professores", alsoSecoes: ["disciplinas"] },
      { to: "/?secao=docs", label: "Documentos", secao: "docs" },
      { to: "/?secao=calendario", label: "Calendário", secao: "calendario" },
      { to: "/?secao=acompanhamento", label: "Acompanhamento", secao: "acompanhamento" },
      { to: "/auditoria", label: "Auditoria" },
    ];
  }
  if (papel === "professor") {
    return [
      { to: "/", label: "Minhas turmas", kind: "home", homeSecoes: ["diarios"] },
    ];
  }
  if (papel === "coordenador_pedagogico") {
    return [
      { to: "/", label: "Visão pedagógica", kind: "home", homeSecoes: ["visao", "registros"] },
      { to: "/?secao=calendario", label: "Calendário", secao: "calendario" },
    ];
  }
  if (papel === "dirigente" || papel === "secretaria") {
    return [
      { to: "/", label: "Visão da rede", kind: "home", homeSecoes: ["rede", "escolas"] },
      { to: "/?secao=usuarios", label: "Usuários", secao: "usuarios" },
      { to: "/?secao=docs", label: "Documentos", secao: "docs" },
      { to: "/?secao=calendario", label: "Calendário", secao: "calendario" },
      { to: "/faltas-docentes", label: "Faltas docentes" },
      { to: "/auditoria", label: "Auditoria" },
    ];
  }
  return [{ to: "/", label: "Início", kind: "home", homeSecoes: [] }];
}

export function navAtivo(item, pathname, search) {
  const destino = item.to || "";
  if (destino.startsWith("/") && destino !== "/" && !destino.startsWith("/?")) {
    return pathname === destino;
  }
  if (item.kind === "home" && (pathname.startsWith("/turma/") || pathname.startsWith("/monitorar/") || pathname.startsWith("/faltas-docentes"))) {
    return pathname.startsWith("/turma/") || pathname.startsWith("/monitorar/");
  }
  if (pathname !== "/") return false;
  const secao = new URLSearchParams(search).get("secao") || "";
  if (item.kind === "home") {
    return !secao || (item.homeSecoes || []).includes(secao);
  }
  if (secao === item.secao) return true;
  return (item.alsoSecoes || []).includes(secao);
}
