import type { ReactElement } from "react";

// Carimbo CARIMBO (selo teal "PH" em papel frio) para os ícones PWA gerados
// via ImageResponse. Mesmas proporções do public/icon.svg, escaladas por k.
// Fundo sangra até a borda → seguro como maskable (conteúdo no centro ~62%).
export function carimboPwa(size: number): ReactElement {
  const k = size / 512;
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "#F6F7F9",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 320 * k,
          height: 240 * k,
          border: `${Math.max(2, Math.round(26 * k))}px solid #0B7A66`,
          borderRadius: 36 * k,
          transform: "rotate(-6deg)",
          color: "#0B7A66",
          fontSize: 124 * k,
          fontWeight: 800,
          letterSpacing: 6 * k,
          fontFamily: "sans-serif",
        }}
      >
        PH
      </div>
    </div>
  );
}
