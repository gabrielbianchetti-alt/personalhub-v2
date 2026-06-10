// Dados mockados da Sessão 1 — sem backend. Serão substituídos pelo Supabase (§5).

// "A exceção é registrada; a regra é presumida" (§2.2):
// todo card nasce "presumido". Só toques marcam exceção.
export type StatusHoje = "presumido" | "faltou" | "extra";

export interface AlunoHoje {
  id: string;
  nome: string;
  horario: string; // "HH:MM" — opcional; vazio quando não cadastrado
  status: StatusHoje;
  /** aula extra avulsa, adicionada fora do dia esperado */
  avulso?: boolean;
}

export const alunosHoje: AlunoHoje[] = [
  { id: "1", nome: "Marina Lopes", horario: "06:30", status: "presumido" },
  { id: "2", nome: "Rafael Augusto", horario: "07:30", status: "presumido" },
  { id: "3", nome: "Juliana Reis", horario: "09:00", status: "presumido" },
  { id: "4", nome: "Pedro Henrique", horario: "17:00", status: "presumido" },
  { id: "5", nome: "Camila Duarte", horario: "18:30", status: "presumido" },
];
