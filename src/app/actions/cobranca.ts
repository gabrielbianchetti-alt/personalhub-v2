"use server";

// Ações da Cobrança. O snapshot do fechamento é recomputado AQUI, pela fonte
// única (lib/aulas), no momento de enviar/pagar — nunca confiando no client.
// Erro esperado volta como {ok:false, erro} (lib/resultado).

import { revalidatePath } from "next/cache";
import { professorAtual } from "@/lib/supabase/sessao";
import { executa, type Resultado } from "@/lib/resultado";
import { buscaRegistros } from "@/lib/supabase/registros";
import { montaSnapshotFechamento } from "@/lib/cobranca";
import { diasNoMes, isoDe, parteIso } from "@/lib/datas";

const MES_RE = /^\d{4}-\d{2}-01$/;

type Ctx = Awaited<ReturnType<typeof professorAtual>>;

// Estado atual do fechamento (se existir) — evita a releitura que o marcarPago
// fazia da MESMA linha na mesma request.
interface FechamentoAtual {
  status: "aberto" | "enviado" | "pago";
  aulas_esperadas: number;
  faltas: number;
  extras: number;
  valor_final: number;
}

async function snapshotMensalidade(
  { supabase, professorId }: Ctx,
  alunoId: string,
  mesRef: string,
  ajusteOverride?: { ajuste: number; motivo: string | null },
) {
  const { year, month } = parteIso(mesRef);
  const fimMes = isoDe(year, month, diasNoMes(year, month));

  const [alunoRes, registros, fechamentoRes] = await Promise.all([
    supabase
      .from("alunos")
      .select("dias_semana, turmas, valor_mensal, valor_dupla, valor_trio, modo_cobranca")
      .eq("id", alunoId)
      .single(),
    buscaRegistros(supabase, { alunoId, de: mesRef, ate: fimMes }),
    supabase
      .from("fechamentos")
      .select("ajuste_manual, ajuste_motivo, status, aulas_esperadas, faltas, extras, valor_final")
      .eq("aluno_id", alunoId)
      .eq("mes_referencia", mesRef)
      .maybeSingle(),
  ]);
  if (alunoRes.error) throw new Error(alunoRes.error.message);

  const ajuste = ajusteOverride?.ajuste ?? fechamentoRes.data?.ajuste_manual ?? 0;
  const motivo = ajusteOverride?.motivo ?? fechamentoRes.data?.ajuste_motivo ?? null;

  const snap = montaSnapshotFechamento({
    professorId,
    alunoId,
    mesRef,
    year,
    month0: month,
    diasSemana: alunoRes.data.dias_semana,
    turmas: alunoRes.data.turmas ?? {},
    valorMensal: alunoRes.data.valor_mensal,
    valorDupla: alunoRes.data.valor_dupla ?? null,
    valorTrio: alunoRes.data.valor_trio ?? null,
    modo: alunoRes.data.modo_cobranca === "por_aula" ? "por_aula" : "mensalidade",
    registros,
    ajuste,
    motivo,
  });
  return { snap, atual: (fechamentoRes.data ?? null) as FechamentoAtual | null };
}

function validaMes(mesRef: string) {
  if (!MES_RE.test(mesRef)) throw new Error("Mês inválido.");
}

/** Ajuste manual persistente (lição da v1) — não mexe no status. */
export async function salvarAjuste(
  alunoId: string,
  mesRef: string,
  ajuste: number,
  motivo: string,
): Promise<Resultado> {
  return executa(async () => {
    validaMes(mesRef);
    if (!Number.isInteger(ajuste) || Math.abs(ajuste) > 99)
      throw new Error("Ajuste inválido.");
    if (motivo.length > 200) throw new Error("Motivo muito longo (máx. 200).");
    const ctx = await professorAtual();
    const { snap } = await snapshotMensalidade(ctx, alunoId, mesRef, {
      ajuste,
      motivo: motivo.trim() || null,
    });
    // Só regrava fechamento ABERTO — o congelamento do enviado/pago é garantido
    // aqui no servidor (a UI esconder o botão não segura 2 aparelhos).
    const { data: atualizados, error: updErr } = await ctx.supabase
      .from("fechamentos")
      .update(snap)
      .eq("aluno_id", alunoId)
      .eq("mes_referencia", mesRef)
      .eq("status", "aberto")
      .select("id");
    if (updErr) throw new Error(updErr.message);
    if (!atualizados || atualizados.length === 0) {
      const { error: insErr } = await ctx.supabase
        .from("fechamentos")
        .insert({ ...snap, status: "aberto" });
      if (insErr?.code === "23505")
        throw new Error("Esse mês já foi enviado ou pago — reabra para ajustar.");
      if (insErr) throw new Error(insErr.message);
    }
    revalidatePath("/cobranca");
  });
}

export async function marcarEnviado(
  alunoId: string,
  mesRef: string,
): Promise<Resultado> {
  return executa(async () => {
    validaMes(mesRef);
    const ctx = await professorAtual();
    const { snap } = await snapshotMensalidade(ctx, alunoId, mesRef);
    const enviadoEm = new Date().toISOString();

    // Atômico contra concorrência (2 aparelhos no mesmo mês): UPDATE só onde o
    // status NÃO é pago — nunca rebaixa um pago. Sem WHERE de status só na app.
    const { data: atualizados, error: updErr } = await ctx.supabase
      .from("fechamentos")
      .update({ ...snap, status: "enviado", enviado_em: enviadoEm })
      .eq("aluno_id", alunoId)
      .eq("mes_referencia", mesRef)
      .neq("status", "pago")
      .select("id");
    if (updErr) throw new Error(updErr.message);

    // Nenhuma linha tocada = ou não existe (aberto sem row) → insere; ou já está
    // paga → o 23505 do insert preserva o pago (não rebaixa).
    if (!atualizados || atualizados.length === 0) {
      const { error: insErr } = await ctx.supabase
        .from("fechamentos")
        .insert({ ...snap, status: "enviado", enviado_em: enviadoEm });
      if (insErr && insErr.code !== "23505") throw new Error(insErr.message);
    }
    revalidatePath("/cobranca");
  });
}

export async function marcarPago(
  alunoId: string,
  mesRef: string,
): Promise<Resultado> {
  return executa(async () => {
    validaMes(mesRef);
    const ctx = await professorAtual();
    // Pago direto do aberto (pix adiantado) também congela o snapshot; se já
    // foi enviado, preserva o que o aluno recebeu (atual vem da mesma leitura).
    const { snap, atual } = await snapshotMensalidade(ctx, alunoId, mesRef);
    const base =
      atual && atual.status !== "aberto"
        ? {
            ...snap,
            aulas_esperadas: atual.aulas_esperadas,
            faltas: atual.faltas,
            extras: atual.extras,
            valor_final: atual.valor_final,
          }
        : snap;
    const { error } = await ctx.supabase.from("fechamentos").upsert(
      { ...base, status: "pago", pago_em: new Date().toISOString() },
      { onConflict: "aluno_id,mes_referencia" },
    );
    if (error) throw new Error(error.message);
    revalidatePath("/cobranca");
  });
}

export async function reabrirFechamento(
  alunoId: string,
  mesRef: string,
): Promise<Resultado> {
  return executa(async () => {
    validaMes(mesRef);
    const { supabase } = await professorAtual();
    const { error } = await supabase
      .from("fechamentos")
      .update({ status: "aberto", enviado_em: null, pago_em: null })
      .eq("aluno_id", alunoId)
      .eq("mes_referencia", mesRef);
    if (error) throw new Error(error.message);
    revalidatePath("/cobranca");
  });
}

/** Créditos: cobrança = venda de novo pacote (§4.3). */
export async function venderPacote(
  alunoId: string,
  qtd: number,
  valor: number,
): Promise<Resultado> {
  return executa(async () => {
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 200)
      throw new Error("Quantidade inválida.");
    if (!Number.isFinite(valor) || valor < 0 || valor > 100_000)
      throw new Error("Valor inválido.");
    const { supabase, professorId } = await professorAtual();
    const { error } = await supabase.from("pacotes_creditos").insert({
      professor_id: professorId,
      aluno_id: alunoId,
      qtd_aulas: qtd,
      valor,
      saldo: qtd,
    });
    if (error) throw new Error(error.message);
    revalidatePath("/cobranca");
    revalidatePath(`/alunos/${alunoId}`);
  });
}
