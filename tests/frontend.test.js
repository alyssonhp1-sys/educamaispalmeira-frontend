import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  request,
  obterCsrfToken,
  limparCsrfToken,
  jsonBody
} from "../src/api.js";

function resposta(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body)
  };
}

describe("Educa+ Palmeira - Testes reais do Frontend", () => {

  beforeEach(() => {
    limparCsrfToken();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("01 - consulta dados da API com sucesso", async () => {
    fetch.mockResolvedValue(resposta(200, {
      data: { totalAlunos: 117 },
      error: null
    }));

    const dados = await request("/api/dashboard");

    expect(dados.totalAlunos).toBe(117);
  });

  it("02 - envia cookies nas requisições", async () => {
    fetch.mockResolvedValue(resposta(200, {
      data: [],
      error: null
    }));

    await request("/api/alunos");

    expect(fetch).toHaveBeenCalledWith(
      "/api/alunos",
      expect.objectContaining({
        credentials: "include"
      })
    );
  });

  it("03 - trata sessão expirada com HTTP 401", async () => {
    fetch.mockResolvedValue(resposta(401, {
      data: null,
      error: "Não autenticado"
    }));

    await expect(request("/api/dashboard"))
      .rejects.toMatchObject({ status: 401 });
  });

  it("04 - trata acesso proibido HTTP 403", async () => {
    fetch.mockResolvedValue(resposta(403, {
      data: null,
      error: "Acesso negado"
    }));

    await expect(request("/api/escolas"))
      .rejects.toThrow("Acesso negado");
  });

  it("05 - trata registro inexistente HTTP 404", async () => {
    fetch.mockResolvedValue(resposta(404, {
      data: null,
      error: "Registro não encontrado"
    }));

    await expect(request("/api/alunos/999"))
      .rejects.toThrow("Registro não encontrado");
  });

  it("06 - trata falha interna HTTP 500", async () => {
    fetch.mockResolvedValue(resposta(500, {
      data: null,
      error: "Internal Server Error"
    }));

    await expect(request("/api/dashboard"))
      .rejects.toThrow("Não foi possível concluir");
  });

  it("07 - envia Content-Type JSON em POST", async () => {
    fetch
      .mockResolvedValueOnce(resposta(200, {
        data: { csrfToken: "token-teste" }
      }))
      .mockResolvedValueOnce(resposta(201, {
        data: { id: 1 },
        error: null
      }));

    await request("/api/escolas", {
      method: "POST",
      body: JSON.stringify({ nome: "Escola Teste" })
    });

    expect(fetch).toHaveBeenLastCalledWith(
      "/api/escolas",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json"
        })
      })
    );
  });

  it("08 - obtém token CSRF da API", async () => {
    fetch.mockResolvedValue(resposta(200, {
      data: { csrfToken: "abc123" }
    }));

    const token = await obterCsrfToken();

    expect(token).toBe("abc123");
  });

  it("09 - reutiliza token CSRF armazenado", async () => {
    fetch.mockResolvedValue(resposta(200, {
      data: { csrfToken: "abc123" }
    }));

    await obterCsrfToken();
    await obterCsrfToken();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("10 - envia token CSRF em POST", async () => {
    fetch
      .mockResolvedValueOnce(resposta(200, {
        data: { csrfToken: "seguro123" }
      }))
      .mockResolvedValueOnce(resposta(201, {
        data: { id: 1 },
        error: null
      }));

    await request("/api/alunos", {
      method: "POST",
      body: JSON.stringify({ nome: "Aluno Teste" })
    });

    expect(fetch).toHaveBeenLastCalledWith(
      "/api/alunos",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-CSRF-Token": "seguro123"
        })
      })
    );
  });

  it("11 - serializa dados corretamente", () => {
    const resultado = jsonBody({
      nome: "Escola Demo",
      ativo: true
    });

    expect(JSON.parse(resultado)).toEqual({
      nome: "Escola Demo",
      ativo: true
    });
  });

  it("12 - reconhece respostas JSON sem envelope data", async () => {
    fetch.mockResolvedValue(resposta(200, {
      mensagem: "Operação realizada"
    }));

    const resultado = await request("/api/teste");

    expect(resultado.mensagem).toBe("Operação realizada");
  });

});
