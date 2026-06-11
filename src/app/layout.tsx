import type { Metadata, Viewport } from "next";
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
  icons: { icon: "/icon.svg" },
  appleWebApp: {
    capable: true,
    title: "PersonalHub",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF6F1" },
    { media: "(prefers-color-scheme: dark)", color: "#14202A" },
  ],
};

// Aplica o tema salvo ANTES do primeiro paint — sem flash de tema errado.
const TEMA_SCRIPT = `(function(){try{var t=localStorage.getItem("tema");var d=t==="escuro"||((!t||t==="auto")&&matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.dataset.theme="dark"}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: o script de tema muda data-theme antes do React.
    <html
      lang="pt-BR"
      className={`${fraunces.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: TEMA_SCRIPT }} />
      </head>
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
