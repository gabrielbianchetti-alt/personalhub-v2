// Skeleton da tela Hoje — pinta instantâneo no toque da aba enquanto a
// query do Supabase carrega (navegação deixa de "travar" no clique).
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="px-5 pb-7 pr-16 pt-12">
        <div className="skeleton h-4 w-12 rounded-md" />
        <div className="skeleton mt-2 h-11 w-3/4 rounded-lg" />
      </header>
      <section className="flex flex-col gap-3 px-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-[68px] rounded-[14px]" />
        ))}
      </section>
    </div>
  );
}
