// View-model da tela Hoje, montado no servidor a partir de alunos +
// registros_aula (só exceções) + dias_resolvidos.

import type { Aluno, RegistroAula } from "./tipos.ts";
import { addDias, dowDeIso, horarioDoDia } from "./datas.ts";

export interface AlunoHojeVM {
  id: string;
  nome: string;
  horario: string; // "HH:MM" ou ""
  faltou: boolean;
  extras: number;
  /** entrou na lista apenas como extra, fora do dia esperado */
  avulso: boolean;
  /** aula de PACOTE marcada pra hoje (sem "Faltou"; já consumiu o crédito) */
  pacote?: boolean;
  /** id do registro da aula de pacote — permite cancelar direto no Hoje */
  pacoteRegistroId?: string;
}

export interface AulaPacoteHoje {
  id: string;
  aluno_id: string;
  horario: string | null;
}

export interface RosterVM {
  id: string;
  nome: string;
}

export interface PendenciaVM {
  dataIso: string;
  esperados: RosterVM[];
}

export function montaAlunosHoje(
  ativos: Pick<Aluno, "id" | "nome" | "horario" | "horarios" | "dias_semana">[],
  registrosHoje: Pick<RegistroAula, "aluno_id" | "tipo" | "quantidade">[],
  dowHoje: number,
  aulasPacoteHoje: AulaPacoteHoje[] = [],
): AlunoHojeVM[] {
  const faltas = new Set(
    registrosHoje.filter((r) => r.tipo === "falta").map((r) => r.aluno_id),
  );
  const extras = new Map<string, number>();
  for (const r of registrosHoje) {
    if (r.tipo === "extra")
      extras.set(r.aluno_id, (extras.get(r.aluno_id) ?? 0) + (r.quantidade ?? 1));
  }

  const esperados = ativos
    .filter((a) => a.dias_semana.includes(dowHoje))
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      horario: horarioDoDia(a, dowHoje), // hora DAQUELE dia (não a única)
      faltou: faltas.has(a.id),
      extras: extras.get(a.id) ?? 0,
      avulso: false,
    }))
    .sort(
      (a, b) =>
        (a.horario || "99").localeCompare(b.horario || "99") ||
        a.nome.localeCompare(b.nome),
    );

  const idsEsperados = new Set(esperados.map((a) => a.id));
  const avulsos = ativos
    .filter((a) => !idsEsperados.has(a.id) && (extras.get(a.id) ?? 0) > 0)
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      horario: "",
      faltou: false,
      extras: extras.get(a.id) ?? 0,
      avulso: true,
    }));

  // Aulas de pacote marcadas pra hoje (alunos sem agenda fixa).
  const porId = new Map(ativos.map((a) => [a.id, a.nome]));
  const pacoteHoje = aulasPacoteHoje
    .filter((p) => porId.has(p.aluno_id))
    .map((p) => ({
      id: p.aluno_id,
      nome: porId.get(p.aluno_id)!,
      horario: p.horario ? p.horario.slice(0, 5) : "",
      faltou: false,
      extras: 0,
      avulso: false,
      pacote: true,
      pacoteRegistroId: p.id,
    }));

  return [...esperados, ...pacoteHoje, ...avulsos].sort(
    (a, b) =>
      (a.horario || "99").localeCompare(b.horario || "99") ||
      a.nome.localeCompare(b.nome),
  );
}

/**
 * Dias recentes (até 7) com alunos esperados mas SEM nenhuma interação e
 * ainda não confirmados — vira a pergunta "todos fizeram?" (§4.1).
 */
export function montaPendencias(args: {
  hojeIso: string;
  ativos: Pick<Aluno, "id" | "nome" | "dias_semana" | "created_at">[];
  diasResolvidos: string[];
  professorDesdeIso: string;
}): PendenciaVM[] {
  const { hojeIso, ativos, diasResolvidos, professorDesdeIso } = args;
  // Um dia só sai da pergunta quando é CONFIRMADO explicitamente
  // (dias_resolvidos). Marcar uma falta avulsa no Hoje NÃO resolve o dia —
  // senão os outros faltantes daquele dia entrariam como presumidos-fizeram
  // (furo que cobra errado). A confirmação preserva as exceções já marcadas.
  const resolvidos = new Set(diasResolvidos);
  const pendencias: PendenciaVM[] = [];

  for (let i = 1; i <= 7; i++) {
    const dia = addDias(hojeIso, -i);
    if (dia < professorDesdeIso) break;
    if (resolvidos.has(dia)) continue;
    const dow = dowDeIso(dia);
    const esperados = ativos
      .filter(
        (a) => a.dias_semana.includes(dow) && a.created_at.slice(0, 10) <= dia,
      )
      .map((a) => ({ id: a.id, nome: a.nome }));
    if (esperados.length > 0) pendencias.push({ dataIso: dia, esperados });
  }
  return pendencias; // ontem primeiro
}
