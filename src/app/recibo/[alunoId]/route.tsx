// Recibo-cartão compartilhável (tese da vitrine, §1): imagem do fechamento
// com a identidade soft-warm, pronta pra mandar no WhatsApp.
// GET /recibo/:alunoId?mes=YYYY-MM-01 — protegido por sessão + RLS.

import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { buscaRegistros } from "@/lib/supabase/registros";
import { montaItemFechamento } from "@/lib/cobranca";
import {
  agoraSP,
  diasNoMes,
  formatBRL,
  isoDe,
  mesRefIso,
  nomeMes,
  parteIso,
} from "@/lib/datas";
import type { Fechamento } from "@/lib/tipos";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ alunoId: string }> },
) {
  const { alunoId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Entre no app para gerar o recibo.", { status: 401 });

  const sp = agoraSP();
  const mes = new URL(req.url).searchParams.get("mes") ?? mesRefIso(sp.year, sp.month);
  if (!/^\d{4}-\d{2}-01$/.test(mes))
    return new Response("Mês inválido.", { status: 400 });
  const { year, month } = parteIso(mes);
  const fimMes = isoDe(year, month, diasNoMes(year, month));

  const [alunoRes, registros, fechamentoRes, profRes] = await Promise.all([
    supabase
      .from("alunos")
      .select("id, nome, telefone, valor_mensal, dias_semana, modo_cobranca")
      .eq("id", alunoId)
      .maybeSingle(),
    buscaRegistros(supabase, { alunoId, de: mes, ate: fimMes }),
    supabase
      .from("fechamentos")
      .select("*")
      .eq("aluno_id", alunoId)
      .eq("mes_referencia", mes)
      .maybeSingle(),
    supabase.from("professores").select("nome").single(),
  ]);

  const aluno = alunoRes.data;
  if (!aluno) return new Response("Aluno não encontrado.", { status: 404 });
  if (aluno.modo_cobranca === "creditos")
    return new Response("Recibo é para fechamento mensal (mensal/por aula).", {
      status: 400,
    });

  const item = montaItemFechamento(
    aluno,
    registros,
    (fechamentoRes.data as Fechamento | null) ?? null,
    year,
    month,
  );
  const professor = profRes.data?.nome ?? "Personal trainer";
  const pago = item.status === "pago";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#FAF6F1",
          padding: 96,
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        {/* orbe decorativo — degradê suave, sem blur (satori não filtra) */}
        <div
          style={{
            position: "absolute",
            top: -420,
            left: 240,
            width: 600,
            height: 600,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(242,107,58,0.5) 0%, rgba(242,107,58,0.18) 45%, rgba(242,107,58,0) 75%)",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 34,
              color: "#1F1B16",
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 9999,
                background:
                  "radial-gradient(circle, #F79A3C 0%, #F26B3A 70%)",
              }}
            />
            PersonalHub
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#8A8178",
              textTransform: "uppercase",
              letterSpacing: 4,
            }}
          >
            {/* string única — satori trata {a} {b} como 2 nós e exige flex */}
            {`${nomeMes(month)} ${year}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 48, color: "#8A8178" }}>{aluno.nome}</div>
          <div
            style={{
              fontSize: 148,
              fontWeight: 700,
              color: "#1F1B16",
              letterSpacing: -4,
            }}
          >
            {formatBRL(item.valor)}
          </div>
          <div style={{ fontSize: 40, color: "#8A8178" }}>{item.resumo}</div>
          {item.valorAula !== null && (
            <div style={{ fontSize: 32, color: "#8A8178" }}>
              {`${formatBRL(item.valorAula)} por aula`}
            </div>
          )}
          <div style={{ display: "flex", marginTop: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 36px",
                borderRadius: 9999,
                fontSize: 34,
                fontWeight: 700,
                color: pago ? "#2E9E6B" : "#F26B3A",
                backgroundColor: pago
                  ? "rgba(46,158,107,0.12)"
                  : "rgba(242,107,58,0.12)",
              }}
            >
              {pago ? "Pago ✓" : `Fechamento de ${nomeMes(month)}`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "2px solid rgba(31,27,22,0.08)",
            paddingTop: 40,
          }}
        >
          <div style={{ fontSize: 34, color: "#1F1B16", fontWeight: 700 }}>
            {professor}
          </div>
          <div style={{ fontSize: 28, color: "#8A8178" }}>
            feito no PersonalHub
          </div>
        </div>
      </div>
    ),
    { width: 1080, height: 1350 },
  );
}
