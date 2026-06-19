-- PersonalHub v2 — migração 0008: índices para as queries quentes.
-- Casam com os filtros de Hoje e Cobrança (status do aluno e range de data
-- por professor via RLS). Rodar manual no SQL Editor.

create index if not exists alunos_prof_status_idx
  on alunos (professor_id, status);

create index if not exists registros_prof_data_idx
  on registros_aula (professor_id, data);
