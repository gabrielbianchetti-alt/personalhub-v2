import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";
import { BottomTabBar } from "@/components/BottomTabBar";

// Identidade CARIMBO (§6.3): grotesk com opinião nos títulos…
const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});
// …sans funcional no corpo…
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});
// …e MONO em todo valor R$ — o tique de fintech que vira assinatura.
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-mono",
});

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
    { media: "(prefers-color-scheme: light)", color: "#F6F7F9" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1116" },
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
      className={`${schibsted.variable} ${plexSans.variable} ${plexMono.variable}`}
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
