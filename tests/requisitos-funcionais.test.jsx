import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { request } from "../src/api.js";
import { resumoLinha } from "../src/components/GradeNotas.jsx";
import GradeNotas from "../src/components/GradeNotas.jsx";
import { RegistrarAulaPanel } from "../src/components/DiarioAula.jsx";
import DashboardEscola from "../src/pages/DashboardEscola.jsx";
import DashboardMunicipal from "../src/pages/DashboardMunicipal.jsx";
import DashboardCoordenador from "../src/pages/DashboardCoordenador.jsx";
import Monitoramento from "../src/pages/Monitoramento.jsx";

vi.mock("../src/api.js", async () => {
  const atual = await vi.importActual("../src/api.js");
  return {
    ...atual,
    request: vi.fn(),
  };
});

function renderRota(element, entrada = "/", caminho = "/") {
  const router = createMemoryRouter(
    [{ path: caminho, element }],
    { initialEntries: [entrada] },
  );
  return render(<RouterProvider router={router} />);
}

function valorKpi(rotulo) {
  const alvo = screen.getAllByText(rotulo).find(
    (el) => el.tagName === "SPAN" && el.parentElement?.querySelector("strong"),
  );
  if (!alvo) throw new Error(`Indicador não encontrado: ${rotulo}`);
  return alvo.parentElement.querySelector("strong").textContent;
}

function textoNormalizado(el) {
  return (el?.textContent || "").replace(/\s+/g, " ").trim();
}

function elementoComTexto(trecho) {
  return screen.getByText((_, el) => {
    if (!el || !textoNormalizado(el).includes(trecho)) return false;
    return ![...el.children].some((filho) => textoNormalizado(filho).includes(trecho));
  });
}

function dadosEscola(extra = {}) {
  return {
    escola: {
      nome: "Escola Municipal Castro Alves",
      inep: "22012345",
      ofertaFundamental: true,
      ofertaInfantil: true,
    },
    indicadores: {
      alunosAtivos: 4,
      turmasAtivas: 2,
      totalProfessores: 2,
      alunosSemTurma: 1,
      alunosEmRisco: 0,
      registrosAulaPendentes: 0,
      diariosPendentes: 0,
      faltasDocentesAtivas: 0,
    },
    turmas: [
      {
        id: 10,
        nome: "5º Ano A",
        etapaEnsino: "fundamental",
        anoLetivo: 2026,
        qtdAlunos: 28,
        capacidade: 30,
      },
      {
        id: 11,
        nome: "Maternal I",
        etapaEnsino: "infantil",
        tipoJornada: "INTEGRAL",
        anoLetivo: 2026,
        qtdAlunos: 12,
        capacidade: null,
      },
    ],
    historico: [
      { id: 20, nome: "4º Ano C", anoLetivo: 2025 },
    ],
    alunos: [
      { id: 1, nome: "Ana Souza", cpf: "111.222.333-44", turmaId: 10, turmaNome: "5º Ano A", situacao: "ativo" },
      { id: 2, nome: "Bruno Lima", cpf: "555.666.777-88", turmaId: 10, turmaNome: "5º Ano A", situacao: "cursando" },
      { id: 3, nome: "Carla Dias", cpf: "999.888.777-66", turmaId: null, turmaNome: "", situacao: "ativo" },
      { id: 4, nome: "Diego Nunes", cpf: "123.456.789-00", turmaId: 11, turmaNome: "Maternal I", situacao: "inativo" },
    ],
    professores: [
      { id: 9, nome: "Paulo Henrique", cpf: "000.111.222-33", usuarioId: 20 },
      { id: 8, nome: "Lúcia Andrade", cpf: "444.555.666-77", usuarioId: null },
    ],
    disciplinas: [{ id: 4, nome: "Matemática" }],
    acompanhamentoPedagogico: { itens: [], aulasPendentes: 0 },
    ...extra,
  };
}

function dadosRede(extra = {}) {
  return {
    configuracaoAcademica: { mediaMinima: 6 },
    indicadores: {
      totalEscolas: 2,
      alunosAtivos: 117,
      turmasAtivas: 8,
      totalProfessores: 2,
      alunosEmRisco: 3,
      alunosSemTurma: 2,
      registrosAulaPendentes: 4,
      faltasDocentesAtivas: 1,
    },
    escolas: [
      {
        id: 3,
        nome: "Escola Municipal Castro Alves",
        inep: "22012345",
        ofertaFundamental: true,
        ofertaInfantil: true,
      },
      {
        id: 4,
        nome: "Escola Municipal João XXIII",
        inep: "22099887",
        ofertaFundamental: false,
        ofertaInfantil: true,
      },
    ],
    professores: [
      { id: 9, nome: "Paulo Henrique", cpf: "000.111.222-33", escolaNome: "Escola Municipal Castro Alves", usuarioId: 20 },
      { id: 8, nome: "Lúcia Andrade", cpf: "444.555.666-77", escolaNome: "Escola Municipal João XXIII", usuarioId: 21 },
    ],
    gestores: [
      { id: 1, nome: "Marta Reis", login: "marta.reis", escolaNome: "Escola Municipal Castro Alves" },
    ],
    coordenadores: [
      { id: 2, nome: "Rui Matos", login: "rui.matos", escolaNome: "Escola Municipal Castro Alves" },
    ],
    acompanhamentoPedagogico: {
      escolas: [
        {
          escolaId: 3,
          escolaNome: "Escola Municipal Castro Alves",
          cargaPrevista: 800,
          aulasPrevistasAteHoje: 120,
          aulasValidadas: 90,
          aulasInvalidadas: 2,
          percentualCumprimentoAteHoje: 75,
          aulasPendentes: 4,
        },
        {
          escolaId: 4,
          escolaNome: "Escola Municipal João XXIII",
          cargaPrevista: 400,
          aulasPrevistasAteHoje: 40,
          aulasValidadas: 40,
          aulasInvalidadas: 0,
          percentualCumprimentoAteHoje: 100,
          aulasPendentes: 0,
        },
      ],
    },
    totalAlunos: 117,
    ...extra,
  };
}

function tabelaAlunos() {
  const tabela = screen.getAllByRole("table").find((item) =>
    within(item).queryByRole("columnheader", { name: "Situação" }),
  );
  if (!tabela) throw new Error("Tabela de alunos não encontrada");
  return tabela;
}

function GradeControlada({ notasIniciais, periodo = "b1" }) {
  const [rows, setRows] = useState({
    1: {
      notas: notasIniciais,
      faltas: {},
      transferido: false,
      dirty: true,
      oficial: null,
    },
  });

  function setNota(id, cod, raw) {
    setRows((prev) => {
      const row = prev[id];
      return {
        ...prev,
        [id]: { ...row, notas: { ...row.notas, [cod]: raw }, dirty: true },
      };
    });
  }

  return (
    <GradeNotas
      turma={{
        nome: "5º Ano A",
        anoLetivo: 2026,
        escolaNome: "Escola Municipal Castro Alves",
        alunos: [{ id: 1, nome: "Ana Souza" }],
      }}
      discId="4"
      discNome="Matemática"
      professorNome="Paulo Henrique"
      rows={rows}
      setAluno={() => {}}
      setNota={setNota}
      podeEditar
      isCoord={false}
      mediaMinima={6}
      salvando={false}
      onSalvar={() => {}}
      onReverter={() => {}}
      msg=""
      erro=""
      periodo={periodo}
      onPeriodo={() => {}}
      busca=""
      onBusca={() => {}}
    />
  );
}

describe("Educa+ Palmeira - Requisitos funcionais", () => {
  beforeEach(() => {
    request.mockReset();
    request.mockImplementation(async () => ({ ocorrencias: [] }));
  });

  it("RF01 - lista os alunos da escola e pesquisa por nome ou CPF", () => {
    renderRota(
      <DashboardEscola data={dadosEscola()} onReload={vi.fn()} />,
      "/?secao=alunos",
    );

    const tabela = tabelaAlunos();
    const ana = within(tabela).getByRole("row", { name: /Ana Souza/ });
    expect(ana).toHaveTextContent("111.222.333-44");
    expect(ana).toHaveTextContent("5º Ano A");
    expect(within(tabela).getByRole("row", { name: /Bruno Lima/ })).toHaveTextContent("Ativo");
    expect(within(tabela).getByRole("row", { name: /Carla Dias/ })).toHaveTextContent("Sem turma");
    expect(within(tabela).getByRole("row", { name: /Diego Nunes/ })).toHaveTextContent("Inativo");

    fireEvent.change(screen.getByLabelText("Buscar aluno"), { target: { value: "ANA" } });
    expect(within(tabelaAlunos()).getByText("Ana Souza")).toBeInTheDocument();
    expect(within(tabelaAlunos()).queryByText("Bruno Lima")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar aluno"), { target: { value: "555.666" } });
    expect(within(tabelaAlunos()).getByText("Bruno Lima")).toBeInTheDocument();
    expect(within(tabelaAlunos()).queryByText("Ana Souza")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Buscar aluno"), { target: { value: "aluno-inexistente" } });
    expect(within(tabelaAlunos()).getByText("Nenhum aluno encontrado")).toBeInTheDocument();
    expect(within(tabelaAlunos()).getByText("Nenhum registro corresponde aos filtros selecionados.")).toBeInTheDocument();
  });

  it("RF02 - filtra alunos ativos, inativos e sem turma", () => {
    renderRota(
      <DashboardEscola data={dadosEscola()} onReload={vi.fn()} />,
      "/?secao=alunos",
    );

    const filtros = screen.getByRole("tablist", { name: "Filtro de alunos" });
    fireEvent.click(within(filtros).getByRole("button", { name: "Ativos" }));
    expect(within(tabelaAlunos()).getByText("Ana Souza")).toBeInTheDocument();
    expect(within(tabelaAlunos()).getByText("Bruno Lima")).toBeInTheDocument();
    expect(within(tabelaAlunos()).getByText("Carla Dias")).toBeInTheDocument();
    expect(within(tabelaAlunos()).queryByText("Diego Nunes")).not.toBeInTheDocument();

    fireEvent.click(within(filtros).getByRole("button", { name: "Inativos" }));
    expect(within(tabelaAlunos()).getByText("Diego Nunes")).toBeInTheDocument();
    expect(within(tabelaAlunos()).queryByText("Ana Souza")).not.toBeInTheDocument();

    fireEvent.click(within(filtros).getByRole("button", { name: "Sem turma" }));
    const tabela = tabelaAlunos();
    expect(within(tabela).getByText("Carla Dias")).toBeInTheDocument();
    expect(within(tabela).queryByText("Ana Souza")).not.toBeInTheDocument();
    expect(within(tabela).queryByText("Diego Nunes")).not.toBeInTheDocument();
  });

  it("RF03 - exibe os professores da escola e a ação disponível para cada um", () => {
    const { unmount } = renderRota(
      <DashboardEscola data={dadosEscola()} onReload={vi.fn()} />,
      "/?secao=professores",
    );

    expect(screen.getByRole("heading", { name: "Professores" })).toBeInTheDocument();
    const paulo = screen.getByRole("row", { name: /Paulo Henrique/ });
    const lucia = screen.getByRole("row", { name: /Lúcia Andrade/ });
    expect(paulo).toHaveTextContent("000.111.222-33");
    expect(within(paulo).getByRole("button", { name: "Redefinir senha" })).toBeInTheDocument();
    expect(lucia).toHaveTextContent("444.555.666-77");
    expect(within(lucia).queryByRole("button", { name: "Redefinir senha" })).not.toBeInTheDocument();

    unmount();
    renderRota(
      <DashboardEscola data={dadosEscola({ professores: [] })} onReload={vi.fn()} />,
      "/?secao=professores",
    );
    expect(screen.getByText("Nenhum professor cadastrado")).toBeInTheDocument();
  });

  it("RF04 - filtra dirigentes, coordenadores e professores na visão da rede", () => {
    renderRota(
      <DashboardMunicipal data={dadosRede()} onReload={vi.fn()} />,
      "/?secao=usuarios",
    );

    expect(screen.getByText("Marta Reis")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Login" })).toBeInTheDocument();
    expect(screen.queryByText("Paulo Henrique")).not.toBeInTheDocument();

    const abas = screen.getByRole("tablist", { name: "Tipo de usuário" });
    fireEvent.click(within(abas).getByRole("button", { name: "Professores (2)" }));

    expect(screen.getByText("Paulo Henrique")).toBeInTheDocument();
    expect(screen.getByText("Lúcia Andrade")).toBeInTheDocument();
    expect(screen.getByText("000.111.222-33")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "CPF" })).toBeInTheDocument();
    expect(screen.queryByText("Marta Reis")).not.toBeInTheDocument();
    expect(screen.queryByText("Rui Matos")).not.toBeInTheDocument();

    fireEvent.click(within(abas).getByRole("button", { name: "Coordenadores (1)" }));
    expect(screen.getByText("Rui Matos")).toBeInTheDocument();
    expect(screen.getByText("rui.matos")).toBeInTheDocument();
    expect(screen.queryByText("Paulo Henrique")).not.toBeInTheDocument();
  });

  it("RF05 - lista as escolas da rede com INEP, etapas e pendências", () => {
    const { unmount } = renderRota(
      <DashboardMunicipal data={dadosRede()} onReload={vi.fn()} />,
    );

    const escolas = document.getElementById("escolas-rede");
    const castro = within(escolas).getByRole("row", { name: /Castro Alves/ });
    const joao = within(escolas).getByRole("row", { name: /João XXIII/ });
    expect(castro).toHaveTextContent("22012345");
    expect(castro).toHaveTextContent("Ensino Fundamental");
    expect(castro).toHaveTextContent("Educação Infantil");
    expect(castro).toHaveTextContent("4 aulas pendentes");
    expect(within(castro).getByRole("button", { name: "Abrir escola" })).toBeInTheDocument();
    expect(joao).toHaveTextContent("22099887");
    expect(joao).toHaveTextContent("Educação Infantil");
    expect(joao).not.toHaveTextContent("Ensino Fundamental");
    expect(joao).not.toHaveTextContent("aulas pendentes");

    unmount();
    renderRota(
      <DashboardMunicipal
        data={dadosRede({
          escolas: [],
          acompanhamentoPedagogico: { escolas: [] },
          indicadores: {
            totalEscolas: 0,
            alunosAtivos: 0,
            turmasAtivas: 0,
            totalProfessores: 0,
            alunosEmRisco: 0,
            alunosSemTurma: 0,
            registrosAulaPendentes: 0,
            faltasDocentesAtivas: 0,
          },
        })}
        onReload={vi.fn()}
      />,
    );
    expect(screen.getByText("Nenhuma escola cadastrada")).toBeInTheDocument();
  });

  it("RF06 - lista turmas em curso e turmas encerradas", () => {
    const { unmount } = renderRota(
      <DashboardEscola data={dadosEscola()} onReload={vi.fn()} />,
    );

    const emCurso = screen.getByRole("heading", { name: "Turmas em curso" }).closest(".section-head").nextElementSibling;
    const fundamental = within(emCurso).getByRole("row", { name: /5º Ano A/ });
    const infantil = within(emCurso).getByRole("row", { name: /Maternal I/ });
    expect(fundamental).toHaveTextContent("Ensino Fundamental");
    expect(fundamental).toHaveTextContent("2026");
    expect(fundamental).toHaveTextContent("28");
    expect(fundamental).toHaveTextContent("30");
    expect(within(fundamental).getByRole("button", { name: "Abrir diário" })).toBeInTheDocument();
    expect(infantil).toHaveTextContent("Educação Infantil");
    expect(infantil).toHaveTextContent("Integral");
    expect(infantil).toHaveTextContent("12");
    expect(screen.queryByText("4º Ano C")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Encerradas" }));
    expect(screen.getByRole("heading", { name: "Turmas encerradas" })).toBeInTheDocument();
    expect(screen.getByText("4º Ano C")).toBeInTheDocument();
    expect(screen.getByText("2025")).toBeInTheDocument();
    expect(screen.queryByText("5º Ano A")).not.toBeInTheDocument();

    unmount();
    renderRota(
      <DashboardEscola data={dadosEscola({ turmas: [], historico: [] })} onReload={vi.fn()} />,
    );
    expect(screen.getByText("Nenhuma turma ativa")).toBeInTheDocument();
  });

  it("RF07 - calcula a média bimestral e libera a recuperação só abaixo do corte", () => {
    renderRota(<GradeControlada notasIniciais={{}} />);

    const media = screen.getByTitle("Média do bimestre, calculada");
    const n1 = screen.getByLabelText("N1 de Ana Souza");
    const n2 = screen.getByLabelText("N2 de Ana Souza");
    const rp = screen.getByLabelText("Recuperação paralela de Ana Souza");

    fireEvent.change(n1, { target: { value: "8,5" } });
    fireEvent.change(n2, { target: { value: "5,5" } });
    expect(media).toHaveTextContent("7.0");
    expect(rp).toBeDisabled();

    fireEvent.change(n1, { target: { value: "3" } });
    fireEvent.change(n2, { target: { value: "5" } });
    expect(media).toHaveTextContent("4.0");
    expect(rp).toBeEnabled();

    fireEvent.change(rp, { target: { value: "9" } });
    expect(media).toHaveTextContent("7.0");

    fireEvent.change(n1, { target: { value: "11" } });
    expect(n1).toHaveAttribute("aria-invalid", "true");
    expect(media).toHaveTextContent("—");
  });

  it("RF08 - calcula a média anual e exibe a situação oficial do aluno", () => {
    const notasBaixas = {
      11: "4", 12: "4", 21: "4", 22: "4", 31: "4", 32: "4", 41: "4", 42: "4",
    };
    const base = { faltas: {}, transferido: false, dirty: true, oficial: null };

    expect(resumoLinha({ ...base, notas: notasBaixas }, 6).an).toMatchObject({
      ma: 4,
      situacao: "EM RECUPERAÇÃO",
      precisaPf: true,
    });
    expect(resumoLinha({ ...base, notas: { ...notasBaixas, 99: "8" } }, 6).an).toMatchObject({
      ma: 6,
      situacao: "APROVADO",
    });
    expect(resumoLinha({ ...base, notas: { ...notasBaixas, 99: "5" } }, 6).an).toMatchObject({
      ma: 4.5,
      situacao: "REPROVADO",
    });
    expect(resumoLinha({ ...base, transferido: true, notas: {} }, 6).an.situacao).toBe("TRANSFERIDO");

    const { unmount } = renderRota(
      <GradeControlada notasIniciais={notasBaixas} periodo="anual" />,
    );
    expect(document.querySelector("td.bg-final")).toHaveTextContent("4.0");
    const provaFinal = screen.getByLabelText("Prova final de Ana Souza");
    expect(provaFinal).toBeEnabled();
    fireEvent.change(provaFinal, { target: { value: "8" } });
    expect(document.querySelector("td.bg-final")).toHaveTextContent("6.0");

    unmount();
    renderRota(
      <GradeNotas
        turma={{
          nome: "5º Ano A",
          anoLetivo: 2026,
          escolaNome: "Escola Municipal Castro Alves",
          alunos: [
            { id: 1, nome: "Carla Dias" },
            { id: 2, nome: "Ana Souza" },
          ],
        }}
        discId="4"
        discNome="Matemática"
        professorNome="Paulo Henrique"
        rows={{
          1: {
            notas: {},
            faltas: {},
            transferido: false,
            dirty: false,
            oficial: { ma: 4.5, mb1: 4, mb2: 5, mb3: 4, mb4: 5, ms1: 4.5, ms2: 4.5, situacao: "EM RECUPERAÇÃO", precisa_pf: true },
          },
          2: {
            notas: {},
            faltas: {},
            transferido: false,
            dirty: false,
            oficial: { ma: 7.5, mb1: 7, mb2: 8, mb3: 7, mb4: 8, ms1: 7.5, ms2: 7.5, situacao: "APROVADO", precisa_pf: false },
          },
        }}
        setAluno={() => {}}
        setNota={() => {}}
        podeEditar={false}
        isCoord={false}
        mediaMinima={6}
        salvando={false}
        onSalvar={() => {}}
        onReverter={() => {}}
        msg=""
        erro=""
        periodo="anual"
        onPeriodo={() => {}}
        busca=""
        onBusca={() => {}}
      />,
    );

    const carla = screen.getByRole("row", { name: /Carla Dias/ });
    const ana = screen.getByRole("row", { name: /Ana Souza/ });
    expect(carla).toHaveTextContent("4.5");
    expect(within(carla).getByText("EM RECUPERAÇÃO")).toBeInTheDocument();
    expect(ana).toHaveTextContent("7.5");
    expect(within(ana).getByText("APROVADO")).toBeInTheDocument();
  });

  it("RF09 - marca presença e falta e envia a frequência no registro da aula", async () => {
    request.mockImplementation(async (url, options = {}) => {
      const metodo = String(options.method || "GET").toUpperCase();
      if (String(url).includes("/calendario/periodo")) {
        return { periodo: { numero: 1, nome: "1º bimestre" } };
      }
      if (String(url).includes("/registros-aula")) {
        if (metodo === "POST") return { id: 50 };
        return {
          disciplinaNome: "Matemática",
          alunos: [
            { id: 1, nome: "Ana Souza" },
            { id: 2, nome: "Bruno Lima" },
          ],
          registros: [],
        };
      }
      return { ocorrencias: [] };
    });

    render(
      <RegistrarAulaPanel
        painel={{
          turma: { id: 10, nome: "5º Ano A", etapaEnsino: "fundamental" },
          podeRegistrarAula: true,
          podeChamada: true,
        }}
        discId="4"
      />,
    );

    expect(await screen.findByRole("row", { name: /Ana Souza/ })).toBeInTheDocument();
    expect(screen.getByText(/Presentes:/)).toHaveTextContent("Presentes: 2");
    expect(screen.getByText(/Faltas:/)).toHaveTextContent("Faltas: 0");
    expect(screen.getByText(/Total:/)).toHaveTextContent("Total: 2");

    const linhaAna = screen.getByRole("row", { name: /Ana Souza/ });
    fireEvent.click(within(linhaAna).getByRole("button", { name: "Presente. Clique para marcar falta" }));
    expect(within(linhaAna).getByRole("button", { name: "Falta. Clique para marcar presente" })).toHaveTextContent("F");
    expect(screen.getByText(/Presentes:/)).toHaveTextContent("Presentes: 1");
    expect(screen.getByText(/Faltas:/)).toHaveTextContent("Faltas: 1");

    fireEvent.click(screen.getByRole("button", { name: "Todos presentes" }));
    expect(screen.getByText(/Faltas:/)).toHaveTextContent("Faltas: 0");
    expect(within(linhaAna).getByRole("button")).toHaveTextContent("P");

    const linhaBruno = screen.getByRole("row", { name: /Bruno Lima/ });
    fireEvent.click(within(linhaBruno).getByRole("button", { name: "Presente. Clique para marcar falta" }));
    fireEvent.change(screen.getByLabelText("Conteúdo"), { target: { value: "Frações equivalentes" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar registro" }));

    await waitFor(() => {
      expect(screen.getByText("Registro de aula salvo.")).toBeInTheDocument();
    });
    expect(screen.getByText("Pendente de validação")).toBeInTheDocument();

    const envio = request.mock.calls.find((chamada) => chamada[1]?.method === "POST");
    expect(envio[0]).toBe("/api/turmas/10/disciplinas/4/registros-aula");
    expect(JSON.parse(envio[1].body)).toMatchObject({
      bimestre: 1,
      quantidade_aulas: 1,
      conteudo: "Frações equivalentes",
      lancamentos: [
        { aluno_id: 1, situacao: "PRESENTE" },
        { aluno_id: 2, situacao: "FALTA" },
      ],
    });
  });

  it("RF10 - exibe e filtra os registros de aula da coordenação", async () => {
    renderRota(
      <DashboardCoordenador
        data={{
          escola: { nome: "Escola Municipal Castro Alves", inep: "22012345" },
          planejamentos: [],
          arquivados: [],
          registrosAula: [
            {
              id: 1,
              status: "pendente",
              professorNome: "Paulo Henrique",
              turmaNome: "5º Ano A",
              disciplinaNome: "Matemática",
              data: "02/03/2026",
              quantidadeAulas: 2,
              conteudo: "Frações equivalentes",
            },
            {
              id: 2,
              status: "validada",
              professorNome: "Lúcia Andrade",
              turmaNome: "3º Ano B",
              disciplinaNome: "Português",
              data: "03/03/2026",
              quantidadeAulas: 1,
              conteudo: "Leitura compartilhada",
            },
            {
              id: 3,
              status: "invalidada",
              professorNome: "Rui Matos",
              turmaNome: "5º Ano A",
              disciplinaNome: "Ciências",
              data: "04/03/2026",
              quantidadeAulas: 1,
              conteudo: "Solo e água",
            },
          ],
          alunosEmRisco: [],
          diariosPendentes: [],
          turmas: [{ id: 10, nome: "5º Ano A", qtdAlunos: 28 }],
          indicadores: { faltasDocentesAtivas: 0 },
        }}
        onReload={vi.fn()}
      />,
    );

    await screen.findByText("Nenhuma ocorrência nesta escola");
    expect(valorKpi("Aulas pendentes")).toBe("1");
    expect(valorKpi("Validadas")).toBe("1");
    expect(valorKpi("Invalidadas")).toBe("1");

    const registros = document.getElementById("registros-aula");
    expect(within(registros).getByText("Paulo Henrique")).toBeInTheDocument();
    expect(within(registros).getByText("Frações equivalentes")).toBeInTheDocument();
    expect(within(registros).queryByText("Lúcia Andrade")).not.toBeInTheDocument();

    const abas = screen.getByRole("tablist", { name: "Situação da aula" });
    fireEvent.click(within(abas).getByRole("button", { name: "Validadas (1)" }));
    expect(within(registros).getByText("Lúcia Andrade")).toBeInTheDocument();
    expect(within(registros).getByText("Validada")).toBeInTheDocument();
    expect(within(registros).queryByText("Paulo Henrique")).not.toBeInTheDocument();

    fireEvent.click(within(abas).getByRole("button", { name: "Invalidadas (1)" }));
    expect(within(registros).getByText("Rui Matos")).toBeInTheDocument();
    expect(within(registros).getByText("Invalidada")).toBeInTheDocument();

    fireEvent.click(within(abas).getByRole("button", { name: "Todas (3)" }));
    expect(within(registros).getByText("Paulo Henrique")).toBeInTheDocument();
    expect(within(registros).getByText("Lúcia Andrade")).toBeInTheDocument();
    expect(within(registros).getByText("Rui Matos")).toBeInTheDocument();
  });

  it("RF11 - exibe alunos em risco e diários sem lançamento", async () => {
    renderRota(
      <DashboardCoordenador
        data={{
          escola: { nome: "Escola Municipal Castro Alves", inep: "22012345" },
          planejamentos: [],
          arquivados: [],
          registrosAula: [],
          alunosEmRisco: [
            { id: 7, nome: "Carla Dias", turmaNome: "5º Ano A", disciplinaNome: "Matemática", ma: 4.5, situacao: "EM RECUPERAÇÃO" },
            { id: 8, nome: "Diego Nunes", turmaNome: "3º Ano B", disciplinaNome: "Português", ma: 3.2, situacao: "REPROVADO" },
          ],
          diariosPendentes: [
            { turmaId: 10, turmaNome: "5º Ano A", disciplinaNome: "História", professorNome: "Paulo Henrique" },
          ],
          turmas: [{ id: 10, nome: "5º Ano A", qtdAlunos: 28 }],
          indicadores: { faltasDocentesAtivas: 0 },
        }}
        onReload={vi.fn()}
      />,
    );

    await screen.findByText("Nenhuma ocorrência nesta escola");
    expect(elementoComTexto("2 alunos em risco")).toBeInTheDocument();

    const risco = document.getElementById("alunos-atencao");
    expect(within(risco).getByText("Carla Dias")).toBeInTheDocument();
    expect(within(risco).getByText(/média 4\.5/)).toBeInTheDocument();
    expect(within(risco).getByText("EM RECUPERAÇÃO")).toBeInTheDocument();
    expect(within(risco).getByText("Diego Nunes")).toBeInTheDocument();
    expect(within(risco).getByText("REPROVADO")).toBeInTheDocument();

    const diarios = document.getElementById("diarios-pendentes");
    expect(within(diarios).getByText("5º Ano A")).toBeInTheDocument();
    expect(within(diarios).getByText(/História/)).toBeInTheDocument();
    expect(within(diarios).getByText(/Paulo Henrique/)).toBeInTheDocument();
  });

  it("RF12 - exibe os indicadores pedagógicos da rede municipal", () => {
    renderRota(<DashboardMunicipal data={dadosRede()} onReload={vi.fn()} />);

    expect(valorKpi("Escolas")).toBe("2");
    expect(valorKpi("Alunos ativos")).toBe("117");
    expect(valorKpi("Turmas")).toBe("8");
    expect(valorKpi("Professores")).toBe("2");
    expect(elementoComTexto("3 alunos em risco")).toBeInTheDocument();
    expect(elementoComTexto("2 alunos sem turma")).toBeInTheDocument();
    expect(elementoComTexto("4 aulas pendentes de validação")).toBeInTheDocument();
    expect(elementoComTexto("1 falta docente registrada")).toBeInTheDocument();

    const acompanhamento = document.getElementById("acompanhamento-rede");
    const castro = within(acompanhamento).getByRole("row", { name: /Castro Alves/ });
    expect(castro).toHaveTextContent("800");
    expect(castro).toHaveTextContent("120");
    expect(castro).toHaveTextContent("90");
    expect(castro).toHaveTextContent("75%");
    expect(within(acompanhamento).getByRole("row", { name: /João XXIII/ })).toHaveTextContent("100%");
  });

  it("RF13 - exibe o cumprimento pedagógico, as turmas e os professores da escola", async () => {
    request.mockImplementation(async (url) => {
      if (String(url) === "/api/escolas/3/painel") {
        return {
          escola: { nome: "Escola Municipal Castro Alves", inep: "22012345" },
          acompanhamentoPedagogico: {
            cargaPrevista: 800,
            aulasPrevistasAteHoje: 120,
            aulasValidadas: 90,
            percentualCumprimentoAteHoje: 75,
            itens: [
              {
                alocacaoId: 1,
                turmaId: 10,
                turmaNome: "5º Ano A",
                disciplinaNome: "Matemática",
                professorNome: "Paulo Henrique",
                cargaPrevista: 200,
                aulasPrevistasAteHoje: 40,
                aulasValidadas: 30,
                aulasPendentes: 2,
                aulasInvalidadas: 1,
                percentualCumprimentoAteHoje: 75,
                progressoAnual: 15,
              },
              {
                alocacaoId: 2,
                turmaId: 10,
                turmaNome: "5º Ano A",
                disciplinaNome: "Ciências",
                professorNome: "Lúcia Andrade",
                cargaPrevista: 160,
                aulasPrevistasAteHoje: null,
                aulasValidadas: 0,
                aulasPendentes: 0,
                aulasInvalidadas: 0,
                percentualCumprimentoAteHoje: null,
                semPrevisaoAteData: true,
                progressoAnual: null,
              },
            ],
            educacaoInfantil: [],
          },
          turmas: [],
          professores: [
            { id: 9, nome: "Paulo Henrique", cpf: "000.111.222-33" },
            { id: 8, nome: "Lúcia Andrade", cpf: "444.555.666-77" },
          ],
        };
      }
      return { ocorrencias: [] };
    });

    renderRota(<Monitoramento />, "/monitorar/3", "/monitorar/:id");

    expect(await screen.findByRole("heading", { name: "Escola Municipal Castro Alves" })).toBeInTheDocument();
    expect(request).toHaveBeenCalledWith("/api/escolas/3/painel");
    expect(screen.getByText("INEP 22012345")).toBeInTheDocument();
    expect(valorKpi("Carga anual")).toBe("800");
    expect(valorKpi("Previstas até hoje")).toBe("120");
    expect(valorKpi("Validadas")).toBe("90");
    expect(valorKpi("% até hoje")).toBe("75%");
    expect(elementoComTexto("Matemática · Paulo Henrique · previstas 40 · validadas 30 (75%)")).toBeInTheDocument();
    expect(elementoComTexto("Ciências · Lúcia Andrade · previstas — · validadas 0 (sem previsão até a data)")).toBeInTheDocument();
    expect(screen.getAllByText("Sem previsão até a data").length).toBeGreaterThan(0);
    expect(screen.getByText("000.111.222-33")).toBeInTheDocument();
    expect(screen.getByText("444.555.666-77")).toBeInTheDocument();
  });
});
