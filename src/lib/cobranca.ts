// View-model da Cobrança (§4.3). Fechamento ABERTO é sempre derivado ao vivo
// da fonte única (lib/aulas) — o snapshot só congela quando vira enviado/pago.
// Lição da v1: nunca duas contagens.

import {
  agregaExcecoes,
  contagemMes,
  resumoContagem,
  valorMensalidade,
  type ExcecoesMes,
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
  modo: "mensalidade" | "creditos";
  status: FechamentoStatus;
  /** valor a cobrar (mensalidade) ou do último pacote (créditos) */
  valor: number;
  resumo: string;
  realizadas: number;
  ajuste: number;
  ajusteMotivo: string | null;
  /** só créditos */
  saldo: number | null;
  ultimoPacote: { qtd: number; valor: number } | null;
}

export function montaItemMensalidade(
  aluno: Pick<Aluno, "id" | "nome" | "telefone" | "valor_mensal" | "dias_semana">,
  registrosDoMes: Pick<RegistroAula, "tipo" | "quantidade">[],
  fechamento: Fechamento | null,
  year: number,
  month0: number,
): CobrancaItemVM {
  const status = fechamento?.status ?? "aberto";
  const ajuste = fechamento?.ajuste_manual ?? 0;

  let excecoes: ExcecoesMes;
  let contagem;
  let valor;
  if (status === "aberto") {
    // Derivado ao vivo: correções de hoje entram na hora.
    excecoes = agregaExcecoes(registrosDoMes);
    contagem = contagemMes(aluno.dias_semana, year, month0, excecoes, ajuste);
    valor = valorMensalidade(aluno.valor_mensal);
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
    modo: "mensalidade",
    status,
    valor,
    resumo: resumoContagem(contagem, excecoes, ajuste),
    realizadas: contagem.realizadas,
    ajuste,
    ajusteMotivo: fechamento?.ajuste_motivo ?? null,
    saldo: null,
    ultimoPacote: null,
  };
}

export function montaItemCreditos(
  aluno: Pick<Aluno, "id" | "nome" | "telefone">,
  saldo: number | null,
  ultimoPacote: { qtd: number; valor: number } | null,
): CobrancaItemVM {
  return {
    alunoId: aluno.id,
    nome: aluno.nome,
    telefone: aluno.telefone,
    modo: "creditos",
    status: "aberto",
    valor: ultimoPacote?.valor ?? 0,
    resumo:
      saldo === null
        ? "sem pacote ainda"
        : `${saldo} ${saldo === 1 || saldo === -1 ? "aula restante" : "aulas restantes"}`,
    realizadas: 0,
    ajuste: 0,
    ajusteMotivo: null,
    saldo,
    ultimoPacote,
  };
}

export interface ResumoMesVM {
  totalPrevisto: number;
  abertos: number;
  enviados: number;
  pagos: number;
}

export function resumoMes(itens: CobrancaItemVM[]): ResumoMesVM {
  const mensais = itens.filter((i) => i.modo === "mensalidade");
  return {
    totalPrevisto: mensais.reduce((s, i) => s + i.valor, 0),
    abertos: mensais.filter((i) => i.status === "aberto").length,
    enviados: mensais.filter((i) => i.status === "enviado").length,
    pagos: mensais.filter((i) => i.status === "pago").length,
  };
}
