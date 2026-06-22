-- PersonalHub v2 — migração 0011: índices para as queries quentes que faltavam.
-- Casam com: o "último pacote por aluno" (Cobrança/perfil), as aulas de pacote
-- por aluno+tipo (Hoje/perfil/saldo) e os fechamentos do mês por professor.
-- Rodar manual no SQL Editor. Só índices — seguro e idempotente.

-- Cobrança/perfil: pacote mais recente de um aluno (order by created_at desc).
create index if not exists pacotes_aluno_recente_idx
  on pacotes_creditos (aluno_id, created_at desc);

-- Hoje/perfil/saldo: aulas de pacote (tipo='aula') por aluno e data.
create index if not exists registros_aluno_tipo_data_idx
  on registros_aula (aluno_id, tipo, data);

-- Cobrança: fechamentos do mês em foco (filtra por mes_referencia sob RLS).
create index if not exists fechamentos_prof_mes_idx
  on fechamentos (professor_id, mes_referencia);
