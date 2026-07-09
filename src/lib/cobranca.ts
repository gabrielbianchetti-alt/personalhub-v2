// View-model da Cobrança (§4.3). Fechamento ABERTO é sempre derivado ao vivo
// da fonte única (lib/aulas) — o snapshot só congela quando vira enviado/pago.
// Lição da v1: nunca duas contagens.

import {
  agregaExcecoes,
  contagemMes,
  ocorrenciasNoMes,
  resumoContagem,
  valorFechamento,
  valorPorAulaDetalhado,
  type ExcecoesMes,
  type ProgressoPacote,
  type ValorDetalhado,
} from "./aulas.ts";
import { isoDe } from "./datas.ts";
import type {
  Aluno,
  Fechamento,
  FechamentoStatus,
  RegistroAula,
  TurmaDia,
} from "./tipos.ts";

// Campos do aluno que definem o preço por dia (dupla/trio) no por_aula.
interface CamposTurma {
  dias_semana: number[];
  turmas: Record<string, TurmaDia>;
  valor_mensal: number | null; // = valor SOLO da aula no por_aula
  valor_dupla: number | null;
  valor_trio: number | null;
}

// Valor/contagem do por_aula a partir dos registros DATADOS (falta no preço do
// seu dia; extra no seu valor). Usado pelo VM (aberto) e pelo snapshot.
function detalhadoPorAula(
  c: CamposTurma,
  registros: Pick<RegistroAula, "tipo" | "quantidade" | "data" | "valor">[],
  year: number,
  month0: number,
  ajuste: number,
): ValorDetalhado {
  const faltasIso = registros
    .filter((r) => r.tipo === "falta" || r.tipo === "desmarcada")
    .map((r) => r.data);
  const extras = registros
    .filter((r) => r.tipo === "extra")
    .map((r) => ({ valor: r.valor, quantidade: r.quantidade }));
  return valorPorAulaDetalhado({
    diasSemana: c.dias_semana,
    turmas: c.turmas ?? {},
    valorSolo: c.valor_mensal,
    valorDupla: c.valor_dupla,
    valorTrio: c.valor_trio,
    year,
    month0,
    faltasIso,
    extras,
    ajuste,
  });
}

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
  /** datas de aula do mês ("dd/mm") em que cai a agenda do aluno (placeholder {dias}) */
  diasAula: string[];
  /** quando a cobrança foi mandada — alimenta o follow-up de esquecidas */
  enviadoEm: string | null;
  /** só créditos */
  saldo: number | null;
  progresso: ProgressoPacote | null;
  ultimoPacote: { qtd: number; valor: number } | null;
  /** aluno suspenso mas com fechamento no mês — mostrado p/ não sumir receita */
  suspenso?: boolean;
}

/** Mensalidade e por_aula fecham mês igual; muda só a fórmula do valor. */
export function montaItemFechamento(
  aluno: Pick<
    Aluno,
    | "id"
    | "nome"
    | "telefone"
    | "valor_mensal"
    | "valor_dupla"
    | "valor_trio"
    | "dias_semana"
    | "turmas"
    | "modo_cobranca"
  >,
  registrosDoMes: Pick<RegistroAula, "tipo" | "quantidade" | "data" | "valor">[],
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
    if (modo === "por_aula") {
      // Preço por dia (dupla/trio) — soma data-a-data.
      const det = detalhadoPorAula(aluno, registrosDoMes, year, month0, ajuste);
      contagem = {
        esperadas: ocorrenciasNoMes(aluno.dias_semana, year, month0).length,
        realizadas: det.realizadas,
      };
      valor = det.valor;
    } else {
      contagem = contagemMes(aluno.dias_semana, year, month0, excecoes, ajuste);
      valor = valorFechamento("mensalidade", aluno.valor_mensal, contagem.realizadas);
    }
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

  // {dias} lista as aulas que CONTAM: agenda − faltas/desmarcadas datadas +
  // extras datadas. Antes listava a agenda crua — no por_aula a mensagem
  // cobrava 10 aulas e citava 12 datas, incluindo o dia em que o aluno faltou.
  const naoAconteceu = new Set(
    registrosDoMes
      .filter((r) => r.tipo === "falta" || r.tipo === "desmarcada")
      .map((r) => r.data),
  );
  const diasAulaIso = [
    ...new Set([
      ...ocorrenciasNoMes(aluno.dias_semana, year, month0)
        .map((d) => isoDe(year, month0, d))
        .filter((iso) => !naoAconteceu.has(iso)),
      ...registrosDoMes.filter((r) => r.tipo === "extra").map((r) => r.data),
    ]),
  ].sort();

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
    diasAula: diasAulaIso.map((iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`),
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
    diasAula: [], // pacote não tem agenda fixa
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

export interface SnapshotFechamento {
  professor_id: string;
  aluno_id: string;
  mes_referencia: string;
  aulas_esperadas: number;
  faltas: number;
  extras: number;
  ajuste_manual: number;
  ajuste_motivo: string | null;
  valor_final: number;
}

/**
 * Monta o snapshot do fechamento (caminho do dinheiro) — PURO e testável.
 * A action só busca os dados e chama isto; a conta vem da fonte única (aulas).
 * `faltas` no snapshot soma falta + desmarcada (ambas descontam realizadas).
 */
export function montaSnapshotFechamento(args: {
  professorId: string;
  alunoId: string;
  mesRef: string;
  year: number;
  month0: number;
  diasSemana: number[];
  turmas: Record<string, TurmaDia>;
  valorMensal: number | null; // = valor SOLO no por_aula
  valorDupla: number | null;
  valorTrio: number | null;
  modo: "mensalidade" | "por_aula";
  registros: Pick<RegistroAula, "tipo" | "quantidade" | "data" | "valor">[];
  ajuste: number;
  motivo: string | null;
}): SnapshotFechamento {
  const excecoes = agregaExcecoes(args.registros);
  const esperadas = ocorrenciasNoMes(args.diasSemana, args.year, args.month0).length;
  const valorFinal =
    args.modo === "por_aula"
      ? detalhadoPorAula(
          {
            dias_semana: args.diasSemana,
            turmas: args.turmas,
            valor_mensal: args.valorMensal,
            valor_dupla: args.valorDupla,
            valor_trio: args.valorTrio,
          },
          args.registros,
          args.year,
          args.month0,
          args.ajuste,
        ).valor
      : valorFechamento("mensalidade", args.valorMensal, 0);
  return {
    professor_id: args.professorId,
    aluno_id: args.alunoId,
    mes_referencia: args.mesRef,
    aulas_esperadas: esperadas,
    faltas: excecoes.faltas + excecoes.desmarcadas,
    extras: excecoes.extras,
    ajuste_manual: args.ajuste,
    ajuste_motivo: args.motivo,
    valor_final: valorFinal,
  };
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
