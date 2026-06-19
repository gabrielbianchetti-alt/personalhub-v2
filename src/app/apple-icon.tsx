import { ImageResponse } from "next/og";
import { carimboPwa } from "@/lib/iconePwa";

// iOS não usa SVG como apple-touch-icon — sem este PNG a home screen sai com
// placeholder cinza. Next injeta <link rel="apple-touch-icon"> sozinho.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";
export const dynamic = "force-static";

export default function AppleIcon() {
  return new ImageResponse(carimboPwa(180), { ...size });
}
