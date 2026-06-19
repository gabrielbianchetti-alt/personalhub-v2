-- PersonalHub v2 — migração 0007: horário POR DIA.
-- Antes: alunos.horario era UM time só pro aluno. Agora cada dia pode ter
-- sua hora (ex.: Felipe seg 06:00, ter 07:00) num jsonb {diaSemana: "HH:MM"}
-- com a mesma convenção getDay (0=dom … 6=sáb) de dias_semana.
-- Rodar manual no SQL Editor. NÃO dropar `horario` agora (fica de fallback;
-- drop só numa 0009 depois de validar em produção).

alter table alunos
  add column if not exists horarios jsonb not null default '{}'::jsonb;

-- Backfill: espalha o horário único atual pra cada dia já marcado do aluno.
update alunos a
set horarios = (
  select coalesce(jsonb_object_agg(d::text, to_char(a.horario, 'HH24:MI')), '{}'::jsonb)
  from unnest(a.dias_semana) as d
)
where a.horario is not null
  and a.horarios = '{}'::jsonb;
