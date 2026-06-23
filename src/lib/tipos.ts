// Tipos de domínio espelhando o schema (§5 da SPEC).

// mensalidade: valor fixo/mês · por_aula: valor da aula × realizadas ·
// creditos: pacote pré-pago que debita por aula feita.
export type ModoCobranca = "mensalidade" | "por_aula" | "creditos";
export type AlunoStatus = "ativo" | "suspenso";
// falta/extra/desmarcada = exceções de aluno com agenda fixa.
// aula = aula marcada de aluno de PACOTE (sem agenda fixa; cada aula é evento).
// NOTA: `desmarcada` é RESERVADO p/ v2.x — não é código morto. O motor já
// agrega/desconta corretamente, mas o spec adia "desmarcação com reposição é
// neutra" + regra configurável por professor (§5) p/ v2.x; por isso ainda não
// há UI de check-in pra registrá-la, de propósito.
export type RegistroTipo = "falta" | "extra" | "desmarcada" | "aula";
export type RegistroOrigem = "checkin" | "retroativo" | "ajuste";
export type FechamentoStatus = "aberto" | "enviado" | "pago";

// Turma de um dia: dupla/trio com o nome do parceiro (pode não ser aluno).
// Dia ausente do mapa = solo.
export type TipoTurma = "dupla" | "trio";
export interface TurmaDia {
  tipo: TipoTurma;
  nome?: string;
}

export interface Aluno {
  id: string;
  professor_id: string;
  nome: string;
  valor_mensal: number | null; // por_aula: este é o valor SOLO da aula
  valor_dupla: number | null; // por_aula: R$/aula nos dias de dupla
  valor_trio: number | null; // por_aula: R$/aula nos dias de trio
  modo_cobranca: ModoCobranca;
  dias_semana: number[]; // 0=dom … 6=sáb (convenção getDay)
  horarios: Record<string, string>; // diaSemana(0..6) -> "HH:MM" (por dia)
  turmas: Record<string, TurmaDia>; // diaSemana(0..6) -> dupla/trio (ausente = solo)
  horario: string | null; // legado/fallback (um time só) — migração 0007
  telefone: string | null;
  status: AlunoStatus;
  detalhes: { observacoes?: string; data_inicio?: string };
  created_at: string;
}

export interface RegistroAula {
  id: string;
  professor_id: string;
  aluno_id: string;
  data: string; // "YYYY-MM-DD"
  tipo: RegistroTipo;
  origem: RegistroOrigem;
  quantidade: number;
  valor: number | null; // extra: valor cobrado naquela aula (null = valor solo)
  horario: string | null; // hora da aula de pacote agendada ("HH:MM:SS")
  created_at: string;
}

export interface Fechamento {
  id: string;
  professor_id: string;
  aluno_id: string;
  mes_referencia: string; // "YYYY-MM-01"
  aulas_esperadas: number;
  faltas: number;
  extras: number;
  ajuste_manual: number;
  ajuste_motivo: string | null;
  valor_final: number;
  status: FechamentoStatus;
  enviado_em: string | null;
  pago_em: string | null;
}

export interface PacoteCreditos {
  id: string;
  professor_id: string;
  aluno_id: string;
  qtd_aulas: number;
  valor: number;
  saldo: number;
  created_at: string;
}

export interface Professor {
  id: string;
  nome: string | null;
  template_mensagem: string | null;
  preferencias: { tema?: "claro" | "escuro" | "auto" };
}
