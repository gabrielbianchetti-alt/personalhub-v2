// View-model da Cobrança (§4.3). Fechamento ABERTO é sempre derivado ao vivo
// da fonte única (lib/aulas) — o snapshot só congela quando vira enviado/pago.
// Lição da v1: nunca duas contagens.

import {
  agregaExcecoes,
  contagemMes,
  resumoContagem,
  valorFechamento,
  type ExcecoesMes,
  type ProgressoPacote,
} from "./aulas.ts";
import type {
  Aluno,
  Fechamento,
  FechamentoStatus,
  RegistroAula,
} from "./tipos.ts";

export interface CobrancaItemVM {
  alunoId: string;
  nome: string;
  telefone: string | null;
  modo: "mensalidade" | "por_aula" | "creditos";
  status: FechamentoStatus;
  /** valor a cobrar (mensalidade/por_aula) ou do último pacote (créditos) */
  valor: number;
  resumo: string;
  realizadas: number;
  ajuste: number;
  ajusteMotivo: string | null;
  /** só por_aula — legenda "R$ X/aula" sob o valor-herói */
  valorAula: number | null;
  /** quando a cobrança foi mandada — alimenta o follow-up de esquecidas */
  enviadoEm: string | null;
  /** só créditos */
  saldo: number | null;
  progresso: ProgressoPacote | null;
  ultimoPacote: { qtd: number; valor: number } | null;
}

/** Mensalidade e por_aula fecham mês igual; muda só a fórmula do valor. */
export function montaItemFechamento(
  aluno: Pick<
    Aluno,
    "id" | "nome" | "telefone" | "valor_mensal" | "dias_semana" | "modo_cobranca"
  >,
  registrosDoMes: Pick<RegistroAula, "tipo" | "quantidade">[],
  fechamento: Fechamento | null,
  year: number,
  month0: number,
): CobrancaItemVM {
  const modo = aluno.modo_cobranca === "por_aula" ? "por_aula" : "mensalidade";
  const status = fechamento?.status ?? "aberto";
  const ajuste = fechamento?.ajuste_manual ?? 0;

  let excecoes: ExcecoesMes;
  let contagem;
  let valor;
  if (status === "aberto") {
    // Derivado ao vivo: correções de hoje entram na hora.
    excecoes = agregaExcecoes(registrosDoMes);
    contagem = contagemMes(aluno.dias_semana, year, month0, excecoes, ajuste);
    valor = valorFechamento(modo, aluno.valor_mensal, contagem.realizadas);
  } else {
    // Congelado no envio: o que foi cobrado não muda sozinho depois.
    excecoes = {
      faltas: fechamento!.faltas,
      extras: fechamento!.extras,
      desmarcadas: 0,
    };
    contagem = {
      esperadas: fechamento!.aulas_esperadas,
      realizadas: Math.max(
        0,
        fechamento!.aulas_esperadas - fechamento!.faltas + fechamento!.extras + ajuste,
      ),
    };
    valor = Number(fechamento!.valor_final);
  }

  return {
    alunoId: aluno.id,
    nome: aluno.nome,
    telefone: aluno.telefone,
    modo,
    status,
    valor,
    resumo: resumoContagem(contagem, excecoes, ajuste),
    realizadas: contagem.realizadas,
    ajuste,
    ajusteMotivo: fechamento?.ajuste_motivo ?? null,
    valorAula: modo === "por_aula" ? Number(aluno.valor_mensal ?? 0) : null,
    enviadoEm: fechamento?.enviado_em ?? null,
    saldo: null,
    progresso: null,
    ultimoPacote: null,
  };
}

export function montaItemCreditos(
  aluno: Pick<Aluno, "id" | "nome" | "telefone">,
  progresso: ProgressoPacote | null,
  ultimoPacote: { qtd: number; valor: number } | null,
): CobrancaItemVM {
  const restantes = progresso?.restantes ?? null;
  return {
    alunoId: aluno.id,
    nome: aluno.nome,
    telefone: aluno.telefone,
    modo: "creditos",
    status: "aberto",
    valor: ultimoPacote?.valor ?? 0,
    resumo:
      progresso === null
        ? "sem pacote ainda"
        : `${progresso.usadas} de ${progresso.qtd} usadas${
            progresso.agendadas > 0 ? ` · ${progresso.agendadas} agendada${progresso.agendadas === 1 ? "" : "s"}` : ""
          }`,
    realizadas: 0,
    ajuste: 0,
    ajusteMotivo: null,
    valorAula: null,
    enviadoEm: null,
    saldo: restantes,
    progresso,
    ultimoPacote,
  };
}

export interface ResumoMesVM {
  totalPrevisto: number;
  totalRecebido: number; // soma do que já foi pago — "quanto entrou"
  abertos: number;
  enviados: number;
  pagos: number;
}

export function resumoMes(itens: CobrancaItemVM[]): ResumoMesVM {
  // Créditos fica fora do total: a receita dele é a venda de pacote.
  const fecham = itens.filter((i) => i.modo !== "creditos");
  return {
    totalPrevisto: fecham.reduce((s, i) => s + i.valor, 0),
    totalRecebido: fecham
      .filter((i) => i.status === "pago")
      .reduce((s, i) => s + i.valor, 0),
    abertos: fecham.filter((i) => i.status === "aberto").length,
    enviados: fecham.filter((i) => i.status === "enviado").length,
    pagos: fecham.filter((i) => i.status === "pago").length,
  };
}
