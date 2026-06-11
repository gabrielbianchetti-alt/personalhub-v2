// Tipos de domínio espelhando o schema (§5 da SPEC).

// mensalidade: valor fixo/mês · por_aula: valor da aula × realizadas ·
// creditos: pacote pré-pago que debita por aula feita.
export type ModoCobranca = "mensalidade" | "por_aula" | "creditos";
export type AlunoStatus = "ativo" | "suspenso";
export type RegistroTipo = "falta" | "extra" | "desmarcada";
export type RegistroOrigem = "checkin" | "retroativo" | "ajuste";
export type FechamentoStatus = "aberto" | "enviado" | "pago";

export interface Aluno {
  id: string;
  professor_id: string;
  nome: string;
  valor_mensal: number | null;
  modo_cobranca: ModoCobranca;
  dias_semana: number[]; // 0=dom … 6=sáb (convenção getDay)
  horario: string | null; // "HH:MM:SS" do Postgres
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
