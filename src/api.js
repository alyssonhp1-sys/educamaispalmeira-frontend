const ROTAS_SEM_REDIRECIONAR_401 = new Set([
  "/api/auth/login",
  "/api/me",
  "/api/auth/definir-senha",
]);

const METODOS_MUTACAO = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let csrfToken = "";

function caminhoDaUrl(url) {
  const bruto = String(url || "");
  try {
    return new URL(bruto, "http://localhost").pathname;
  } catch (_e) {
    return bruto.split("?")[0];
  }
}

function avisarSessaoExpirada(url, status) {
  if (status !== 401 || typeof window === "undefined") return;
  const path = caminhoDaUrl(url);
  if (ROTAS_SEM_REDIRECIONAR_401.has(path)) return;
  window.dispatchEvent(new Event("educamais:sessao-expirada"));
}

function erroCsrf(body) {
  const texto = String((body && body.error) || "");
  return /csrf/i.test(texto);
}

export async function obterCsrfToken(force = false) {
  if (csrfToken && !force) return csrfToken;
  const res = await fetch("/api/csrf-token", { credentials: "include" });
  const body = await res.json().catch(() => ({}));
  csrfToken = (body && body.data && body.data.csrfToken) || "";
  return csrfToken;
}

export function limparCsrfToken() {
  csrfToken = "";
}

export async function request(url, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };
  const isForm = options.body instanceof FormData;
  if (!isForm && options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (METODOS_MUTACAO.has(method) && !headers["X-CSRF-Token"]) {
    headers["X-CSRF-Token"] = await obterCsrfToken();
  }
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 400 && erroCsrf(body) && !options._csrfRetry && METODOS_MUTACAO.has(method)) {
    csrfToken = "";
    return request(url, { ...options, _csrfRetry: true });
  }
  avisarSessaoExpirada(url, res.status);
  if (body && Object.prototype.hasOwnProperty.call(body, "error")) {
    if (!res.ok || body.error) {
      const err = new Error(mensagemAmigavel(res.status, body.error));
      err.status = res.status;
      throw err;
    }
    return body.data;
  }
  if (!res.ok) {
    throw new Error(mensagemAmigavel(res.status, body.erro || body.error));
  }
  return body;
}

function nomeDoPdf(res) {
  const disp = res.headers.get("content-disposition") || "";
  const aspas = /filename=\"([^\"]+)\"/i.exec(disp);
  const simples = /filename=([^;]+)/i.exec(disp);
  if (aspas) return aspas[1];
  if (simples) return simples[1].trim().replace(/^["']|["']$/g, "");
  return "documento.pdf";
}

export async function baixarPdf(url) {
  const janela = typeof window !== "undefined" ? window.open("", "_blank") : null;
  try {
    const res = await fetch(url, { credentials: "include" });
    const tipo = (res.headers.get("content-type") || "").toLowerCase();
    if (res.ok && tipo.includes("application/pdf")) {
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = nomeDoPdf(res);
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (janela) janela.location.href = href;
      setTimeout(() => URL.revokeObjectURL(href), 60000);
      return;
    }
    if (janela) janela.close();
    const body = await res.json().catch(() => ({}));
    avisarSessaoExpirada(url, res.status);
    const err = new Error(mensagemAmigavel(res.status, body && body.error) || "Não foi possível gerar o PDF.");
    err.status = res.status;
    throw err;
  } catch (e) {
    if (janela && !e.status) janela.close();
    throw e;
  }
}

export function jsonBody(payload) {
  return JSON.stringify(payload);
}

function mensagemTecnica(texto) {
  const raw = String(texto || "").trim();
  if (!raw) return true;
  return /^(erro|error)\s*\d+$/i.test(raw)
    || /bad request/i.test(raw)
    || /internal server error/i.test(raw)
    || /request failed/i.test(raw)
    || /^http\/\d/i.test(raw);
}

function mensagemAmigavel(status, bruto) {
  const texto = String(bruto || "").trim();
  if (texto && !mensagemTecnica(texto)) return texto;
  if (status === 403) return "Você não tem permissão para esta ação.";
  if (status === 404) return "Registro não encontrado.";
  if (status === 401) return "Sessão expirada. Entre novamente.";
  if (status >= 500) return "Não foi possível concluir a operação. Tente novamente.";
  return "Não foi possível concluir a operação. Verifique os dados e tente novamente.";
}
