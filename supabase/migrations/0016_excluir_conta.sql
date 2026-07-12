-- 0016 — Exclusão de conta + dados (LGPD, Fundação #5 / ciclo 3b).
-- Deletar a linha em auth.users derruba TUDO em cascata (0001: professores
-- referencia auth.users on delete cascade; alunos/registros/pacotes/fechamentos
-- referenciam professores on delete cascade).
--
-- O client anon não pode deletar o próprio usuário via SDK — a função roda como
-- security definer e só deleta o PRÓPRIO uid. Sem parâmetros = sem como apagar
-- outra conta.

create or replace function public.excluir_minha_conta()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = (select auth.uid());
$$;

revoke execute on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
