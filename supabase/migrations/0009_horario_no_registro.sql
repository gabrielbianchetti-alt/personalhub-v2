-- PersonalHub v2 — migração 0009: horário na aula marcada.
-- Alunos de PACOTE não têm agenda fixa — cada aula é marcada/agendada como
-- um evento. Guardamos o horário da aula agendada aqui pra ela aparecer no
-- Hoje com a hora certa. Rodar manual no SQL Editor.

alter table registros_aula
  add column if not exists horario time;
