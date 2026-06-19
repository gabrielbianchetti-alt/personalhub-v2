import { ImageResponse } from "next/og";
import { carimboPwa } from "@/lib/iconePwa";

// PNG 192 pro manifest (Android exige PNG raster pro prompt de instalação).
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(carimboPwa(192), { width: 192, height: 192 });
}
