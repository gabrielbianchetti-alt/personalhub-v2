-- PersonalHub v2 — migração 0012: aula em dupla/trio.
-- por_aula: valores menores de dupla/trio + tipo da turma por dia (com o nome
-- do parceiro). Aula extra ganha um valor próprio (o cobrado naquela aula).
-- mensalidade: turmas serve só de rótulo (o valor mensal segue um número só).
-- Rodar manual no SQL Editor.

alter table alunos
  add column if not exists valor_dupla numeric,   -- R$/aula quando o dia é dupla
  add column if not exists valor_trio  numeric,   -- R$/aula quando o dia é trio
  -- turmas: { "<dia 0..6>": { "tipo": "dupla"|"trio", "nome": "Carlos" } }
  -- dias ausentes = solo. Espelha o formato de `horarios`.
  add column if not exists turmas jsonb not null default '{}'::jsonb;

-- Aula extra com valor próprio (default no app = valor solo do aluno).
-- null = aulas antigas / sem valor explícito (caem no valor solo no cálculo).
alter table registros_aula
  add column if not exists valor numeric;
