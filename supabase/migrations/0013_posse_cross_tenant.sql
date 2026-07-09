-- 0013 — Posse cross-tenant garantida no BANCO (rodar no SQL Editor).
--
-- As policies de INSERT checavam só professor_id = auth.uid(); o aluno_id
-- passava com qualquer FK válida — inclusive aluno de OUTRO professor. Com o
-- unique global (aluno_id, data, tipo) de registros_aula, uma linha plantada
-- por terceiro faria faltas/aulas da vítima falharem em silêncio (fechamento
-- errado). FK composta (aluno_id, professor_id) → alunos (id, professor_id)
-- transforma qualquer insert cross-tenant em erro de FK, independente da app.

alter table alunos
  add constraint alunos_id_professor_unique unique (id, professor_id);

alter table registros_aula
  add constraint registros_aula_aluno_professor_fk
  foreign key (aluno_id, professor_id)
  references alunos (id, professor_id)
  on delete cascade;

alter table pacotes_creditos
  add constraint pacotes_creditos_aluno_professor_fk
  foreign key (aluno_id, professor_id)
  references alunos (id, professor_id)
  on delete cascade;

alter table fechamentos
  add constraint fechamentos_aluno_professor_fk
  foreign key (aluno_id, professor_id)
  references alunos (id, professor_id)
  on delete cascade;
