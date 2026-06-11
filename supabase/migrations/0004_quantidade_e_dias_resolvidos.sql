-- PersonalHub v2 — migração 0004.
-- Rodar no SQL Editor depois da 0002 (a 0003 é só template de seed, opcional).
--
-- 1. registros_aula.quantidade: a UI permite mais de uma aula extra no mesmo
--    dia ("+2 extra"), mas UNIQUE (aluno_id, data, tipo) limitava a 1 linha.
--    Mantemos a unicidade (boa p/ integridade) e somamos na própria linha.
-- 2. dias_resolvidos: marca dias já confirmados nas pendências retroativas
--    ("ontem: todos fizeram?"), para a pergunta não reaparecer.

-- ── 1. quantidade ───────────────────────────────────────────────────
alter table registros_aula
  add column if not exists quantidade int not null default 1
  check (quantidade >= 1);

-- ── 2. dias_resolvidos ──────────────────────────────────────────────
create table if not exists dias_resolvidos (
  professor_id uuid not null references professores (id) on delete cascade,
  data         date not null,
  created_at   timestamptz not null default now(),
  primary key (professor_id, data)
);

alter table dias_resolvidos enable row level security;

create policy dias_resolvidos_select on dias_resolvidos
  for select using (professor_id = auth.uid());
create policy dias_resolvidos_insert on dias_resolvidos
  for insert with check (professor_id = auth.uid());
create policy dias_resolvidos_delete on dias_resolvidos
  for delete using (professor_id = auth.uid());
