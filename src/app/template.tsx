// Remonta a cada navegação → anima a entrada de toda tela (fade-in só de
// opacity — sem transform, que quebraria glass/sticky). Respeita
// prefers-reduced-motion via CSS.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="pagina-entra flex flex-1 flex-col">{children}</div>;
}
