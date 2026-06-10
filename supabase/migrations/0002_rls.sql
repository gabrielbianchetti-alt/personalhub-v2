-- PersonalHub v2 — RLS do §5: isolamento por professor_id em todas as tabelas.

alter table professores      enable row level security;
alter table alunos           enable row level security;
alter table registros_aula   enable row level security;
alter table pacotes_creditos enable row level security;
alter table fechamentos      enable row level security;

-- ── professores: a própria linha (id = auth.uid()) ─────────────────
create policy professores_select on professores
  for select using (id = auth.uid());
create policy professores_insert on professores
  for insert with check (id = auth.uid());
create policy professores_update on professores
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy professores_delete on professores
  for delete using (id = auth.uid());

-- ── alunos ─────────────────────────────────────────────────────────
create policy alunos_select on alunos
  for select using (professor_id = auth.uid());
create policy alunos_insert on alunos
  for insert with check (professor_id = auth.uid());
create policy alunos_update on alunos
  for update using (professor_id = auth.uid()) with check (professor_id = auth.uid());
create policy alunos_delete on alunos
  for delete using (professor_id = auth.uid());

-- ── registros_aula ─────────────────────────────────────────────────
create policy registros_aula_select on registros_aula
  for select using (professor_id = auth.uid());
create policy registros_aula_insert on registros_aula
  for insert with check (professor_id = auth.uid());
create policy registros_aula_update on registros_aula
  for update using (professor_id = auth.uid()) with check (professor_id = auth.uid());
create policy registros_aula_delete on registros_aula
  for delete using (professor_id = auth.uid());

-- ── pacotes_creditos ───────────────────────────────────────────────
create policy pacotes_creditos_select on pacotes_creditos
  for select using (professor_id = auth.uid());
create policy pacotes_creditos_insert on pacotes_creditos
  for insert with check (professor_id = auth.uid());
create policy pacotes_creditos_update on pacotes_creditos
  for update using (professor_id = auth.uid()) with check (professor_id = auth.uid());
create policy pacotes_creditos_delete on pacotes_creditos
  for delete using (professor_id = auth.uid());

-- ── fechamentos ────────────────────────────────────────────────────
create policy fechamentos_select on fechamentos
  for select using (professor_id = auth.uid());
create policy fechamentos_insert on fechamentos
  for insert with check (professor_id = auth.uid());
create policy fechamentos_update on fechamentos
  for update using (professor_id = auth.uid()) with check (professor_id = auth.uid());
create policy fechamentos_delete on fechamentos
  for delete using (professor_id = auth.uid());

-- ── Trigger: cria a linha em professores no signup ─────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.professores (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
