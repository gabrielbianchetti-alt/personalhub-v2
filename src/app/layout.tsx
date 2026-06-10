import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { BottomTabBar } from "@/components/BottomTabBar";

// Display serifada com personalidade (§6.3) — números-hero, datas grandes.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display" });
// Sans limpa e neutra (§6.3) — texto/UI.
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "PersonalHub",
  description: "Organização como subproduto de gestos preguiçosos.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="min-h-dvh antialiased">
        <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
          {/* pb folga pra não esconder conteúdo atrás da tab bar fixa */}
          <main className="flex flex-1 flex-col pb-28">{children}</main>
        </div>
        <BottomTabBar />
      </body>
    </html>
  );
}
