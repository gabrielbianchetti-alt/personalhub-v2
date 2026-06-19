import { ImageResponse } from "next/og";
import { carimboPwa } from "@/lib/iconePwa";

// PNG 512 pro manifest (ícone grande + maskable).
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(carimboPwa(512), { width: 512, height: 512 });
}
