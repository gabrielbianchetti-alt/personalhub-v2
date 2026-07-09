-- 0014 — RLS com (select auth.uid()) (rodar no SQL Editor).
--
-- auth.uid() "pelado" numa policy é reavaliado LINHA A LINHA; embrulhado em
-- select vira InitPlan (avaliado 1x por query). Recomendação oficial do
-- Supabase; ganho cresce com o volume de registros_aula.

alter policy professores_select on professores using (id = (select auth.uid()));
alter policy professores_insert on professores with check (id = (select auth.uid()));
alter policy professores_update on professores
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
alter policy professores_delete on professores using (id = (select auth.uid()));

alter policy alunos_select on alunos using (professor_id = (select auth.uid()));
alter policy alunos_insert on alunos with check (professor_id = (select auth.uid()));
alter policy alunos_update on alunos
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));
alter policy alunos_delete on alunos using (professor_id = (select auth.uid()));

alter policy registros_aula_select on registros_aula
  using (professor_id = (select auth.uid()));
alter policy registros_aula_insert on registros_aula
  with check (professor_id = (select auth.uid()));
alter policy registros_aula_update on registros_aula
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));
alter policy registros_aula_delete on registros_aula
  using (professor_id = (select auth.uid()));

alter policy pacotes_creditos_select on pacotes_creditos
  using (professor_id = (select auth.uid()));
alter policy pacotes_creditos_insert on pacotes_creditos
  with check (professor_id = (select auth.uid()));
alter policy pacotes_creditos_update on pacotes_creditos
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));
alter policy pacotes_creditos_delete on pacotes_creditos
  using (professor_id = (select auth.uid()));

alter policy fechamentos_select on fechamentos
  using (professor_id = (select auth.uid()));
alter policy fechamentos_insert on fechamentos
  with check (professor_id = (select auth.uid()));
alter policy fechamentos_update on fechamentos
  using (professor_id = (select auth.uid()))
  with check (professor_id = (select auth.uid()));
alter policy fechamentos_delete on fechamentos
  using (professor_id = (select auth.uid()));

-- dias_resolvidos (migração 0004) — mesmas policies, mesmo ajuste.
-- Se os nomes diferirem no seu banco, confira com: select policyname from
-- pg_policies where tablename = 'dias_resolvidos';
alter policy dias_resolvidos_select on dias_resolvidos
  using (professor_id = (select auth.uid()));
alter policy dias_resolvidos_insert on dias_resolvidos
  with check (professor_id = (select auth.uid()));
alter policy dias_resolvidos_delete on dias_resolvidos
  using (professor_id = (select auth.uid()));
