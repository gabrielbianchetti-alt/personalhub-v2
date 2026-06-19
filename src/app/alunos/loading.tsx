// Skeleton da tela Alunos.
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col px-5 pt-12">
      <div className="skeleton h-10 w-40 rounded-lg" />
      <div className="mt-4 flex items-center gap-2">
        <div className="skeleton h-11 flex-1 rounded-2xl" />
        <div className="skeleton size-11 rounded-2xl" />
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-[72px] rounded-[14px]" />
        ))}
      </div>
    </div>
  );
}
