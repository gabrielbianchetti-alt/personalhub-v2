// View-model da tela Hoje, montado no servidor a partir de alunos +
// registros_aula (só exceções) + dias_resolvidos.

import type { Aluno, RegistroAula } from "./tipos";
import { addDias, dowDeIso, horarioCurto } from "./datas";

export interface AlunoHojeVM {
  id: string;
  nome: string;
  horario: string; // "HH:MM" ou ""
  faltou: boolean;
  extras: number;
  /** entrou na lista apenas como extra, fora do dia esperado */
  avulso: boolean;
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
  ativos: Pick<Aluno, "id" | "nome" | "horario" | "dias_semana">[],
  registrosHoje: Pick<RegistroAula, "aluno_id" | "tipo" | "quantidade">[],
  dowHoje: number,
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
    .sort(
      (a, b) =>
        (a.horario ?? "99").localeCompare(b.horario ?? "99") ||
        a.nome.localeCompare(b.nome),
    )
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      horario: horarioCurto(a.horario),
      faltou: faltas.has(a.id),
      extras: extras.get(a.id) ?? 0,
      avulso: false,
    }));

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

  return [...esperados, ...avulsos];
}

/**
 * Dias recentes (até 7) com alunos esperados mas SEM nenhuma interação e
 * ainda não confirmados — vira a pergunta "todos fizeram?" (§4.1).
 */
export function montaPendencias(args: {
  hojeIso: string;
  ativos: Pick<Aluno, "id" | "nome" | "dias_semana" | "created_at">[];
  registrosJanela: Pick<RegistroAula, "data">[];
  diasResolvidos: string[];
  professorDesdeIso: string;
}): PendenciaVM[] {
  const { hojeIso, ativos, registrosJanela, diasResolvidos, professorDesdeIso } = args;
  const diasComRegistro = new Set(registrosJanela.map((r) => r.data));
  const resolvidos = new Set(diasResolvidos);
  const pendencias: PendenciaVM[] = [];

  for (let i = 1; i <= 7; i++) {
    const dia = addDias(hojeIso, -i);
    if (dia < professorDesdeIso) break;
    if (diasComRegistro.has(dia) || resolvidos.has(dia)) continue;
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
