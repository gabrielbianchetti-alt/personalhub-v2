// Skeleton da tela Cobrança.
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col px-5 pt-12">
      <div className="skeleton h-10 w-44 rounded-lg" />
      <div className="skeleton mt-4 h-[104px] rounded-[14px]" />
      <div className="mt-4 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-[120px] rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
