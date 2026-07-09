import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";

// Preview do link (WhatsApp/redes) na identidade CARIMBO: selo teal em papel
// frio, Schibsted nos títulos. Fontes reaproveitadas do recibo (TTFs locais —
// fetch de file:// não funciona no Node; readFile+URL é o padrão do repo).
// Rota pública: precisa estar em PUBLIC_PATHS do proxy (crawler não tem sessão).

export const alt = "PersonalHub — aulas, alunos e cobrança para personal trainers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [schibsted700, schibsted400] = await Promise.all([
    readFile(
      new URL("./recibo/[alunoId]/SchibstedGrotesk-700.ttf", import.meta.url),
    ),
    readFile(
      new URL("./recibo/[alunoId]/SchibstedGrotesk-400.ttf", import.meta.url),
    ),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 48,
          background: "#F6F7F9",
          // Eco do mesh-fundo: radiais teal sutis, nunca tema total.
          backgroundImage:
            "radial-gradient(640px 420px at 85% 12%, #DDF1EB 0%, rgba(221,241,235,0) 70%), radial-gradient(520px 380px at 8% 92%, #DDF1EB 0%, rgba(221,241,235,0) 70%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px 72px",
            border: "10px solid #0B7A66",
            borderRadius: 32,
            transform: "rotate(-6deg)",
            color: "#0B7A66",
            fontSize: 104,
            fontWeight: 700,
            letterSpacing: -2,
            fontFamily: "Schibsted",
          }}
        >
          PersonalHub
        </div>
        <div
          style={{
            color: "#5A6472",
            fontSize: 36,
            fontWeight: 400,
            fontFamily: "Schibsted",
          }}
        >
          Aulas, alunos e cobrança — sem fricção
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Schibsted", data: schibsted700, weight: 700, style: "normal" },
        { name: "Schibsted", data: schibsted400, weight: 400, style: "normal" },
      ],
    },
  );
}
