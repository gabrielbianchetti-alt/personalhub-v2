// Recibo-cartão compartilhável (tese da vitrine, §1): imagem do fechamento
// com a identidade soft-warm, pronta pra mandar no WhatsApp.
// GET /recibo/:alunoId?mes=YYYY-MM-01 — protegido por sessão + RLS.

import { readFile } from "node:fs/promises";
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
      .select(
        "id, nome, telefone, valor_mensal, valor_dupla, valor_trio, dias_semana, turmas, modo_cobranca",
      )
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

  // Fontes da marca (Satori precisa do binário TTF). Carregadas do bundle via
  // import.meta.url — o Next as inclui no deploy.
  const [schibsted400, schibsted700, geistMono600] = await Promise.all([
    readFile(new URL("./SchibstedGrotesk-400.ttf", import.meta.url)),
    readFile(new URL("./SchibstedGrotesk-700.ttf", import.meta.url)),
    readFile(new URL("./GeistMono-600.ttf", import.meta.url)),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#F6F7F9",
          padding: 96,
          position: "relative",
          fontFamily: "Schibsted Grotesk",
        }}
      >
        {/* respiro teal no topo — degradê suave, sem blur (satori não filtra) */}
        <div
          style={{
            position: "absolute",
            top: -420,
            left: 240,
            width: 600,
            height: 600,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(11,122,102,0.32) 0%, rgba(11,122,102,0.12) 45%, rgba(11,122,102,0) 75%)",
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
              color: "#0E1013",
              fontWeight: 700,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 8,
                border: "5px solid #0B7A66",
                transform: "rotate(-6deg)",
              }}
            />
            PersonalHub
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#5A6472",
              textTransform: "uppercase",
              letterSpacing: 4,
            }}
          >
            {/* string única — satori trata {a} {b} como 2 nós e exige flex */}
            {`${nomeMes(month)} ${year}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 48, color: "#5A6472" }}>{aluno.nome}</div>
          <div
            style={{
              fontSize: 142,
              fontWeight: 600,
              color: "#0E1013",
              letterSpacing: -4,
              fontFamily: "Geist Mono",
            }}
          >
            {formatBRL(item.valor)}
          </div>
          <div style={{ fontSize: 40, color: "#5A6472" }}>{item.resumo}</div>
          {item.valorAula !== null && (
            <div style={{ fontSize: 32, color: "#5A6472", fontFamily: "Geist Mono" }}>
              {`${formatBRL(item.valorAula)} por aula`}
            </div>
          )}
          {/* selo de carimbo — a assinatura da identidade */}
          <div style={{ display: "flex", marginTop: 32 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 30px",
                borderRadius: 14,
                border: pago ? "5px solid #1B8A4B" : "5px solid #0B7A66",
                transform: "rotate(-6deg)",
                fontSize: 32,
                fontWeight: 700,
                letterSpacing: 8,
                textTransform: "uppercase",
                color: pago ? "#1B8A4B" : "#0B7A66",
              }}
            >
              {pago ? "PAGO" : `FECHAMENTO · ${nomeMes(month).toUpperCase()}`}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "3px dashed rgba(14,16,19,0.18)",
            paddingTop: 40,
          }}
        >
          <div style={{ fontSize: 34, color: "#0E1013", fontWeight: 700 }}>
            {professor}
          </div>
          <div style={{ fontSize: 28, color: "#5A6472" }}>
            feito no PersonalHub
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      fonts: [
        { name: "Schibsted Grotesk", data: schibsted400, weight: 400, style: "normal" },
        { name: "Schibsted Grotesk", data: schibsted700, weight: 700, style: "normal" },
        { name: "Geist Mono", data: geistMono600, weight: 600, style: "normal" },
      ],
    },
  );
}
