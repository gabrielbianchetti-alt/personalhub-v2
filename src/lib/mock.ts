// Dados mockados da Sessão 1 — sem backend. Serão substituídos pelo Supabase (§5).

// "A exceção é registrada; a regra é presumida" (§2.2):
// todo card nasce "presumido". Só o toque em "Faltou" registra exceção.
export type StatusHoje = "presumido" | "faltou";

export interface AlunoHoje {
  id: string;
  nome: string;
  horario: string; // "HH:MM" — vazio quando não cadastrado / aula avulsa
  status: StatusHoje;
  /** aulas extras somadas no dia (badge "+N extra") */
  extras: number;
  /** entrou na lista apenas como extra, fora do dia esperado */
  avulso?: boolean;
}

// Alunos esperados hoje (derivados de dias_semana na v2 real).
export const alunosHoje: AlunoHoje[] = [
  { id: "1", nome: "Marina Lopes", horario: "06:30", status: "presumido", extras: 0 },
  { id: "2", nome: "Rafael Augusto", horario: "07:30", status: "presumido", extras: 0 },
  { id: "3", nome: "Juliana Reis", horario: "09:00", status: "presumido", extras: 0 },
  { id: "4", nome: "Pedro Henrique", horario: "17:00", status: "presumido", extras: 0 },
  { id: "5", nome: "Camila Duarte", horario: "18:30", status: "presumido", extras: 0 },
];

// Roster completo do professor — fonte do bottom sheet de aula extra.
// Inclui os esperados hoje (segunda aula é possível) e alunos de outros dias.
export interface RosterAluno {
  id: string;
  nome: string;
}

export const todosAlunos: RosterAluno[] = [
  { id: "1", nome: "Marina Lopes" },
  { id: "2", nome: "Rafael Augusto" },
  { id: "3", nome: "Juliana Reis" },
  { id: "4", nome: "Pedro Henrique" },
  { id: "5", nome: "Camila Duarte" },
  { id: "6", nome: "Bruno Tavares" },
  { id: "7", nome: "Letícia Moraes" },
  { id: "8", nome: "Diego Salles" },
];
