export default function LoadingSkeleton() {
  return (
    <div className="animate-pulse rounded-3xl border border-[#E5E7EB] bg-white p-4">
      <div className="h-56 rounded-2xl bg-[#E5E7EB]" />
      <div className="mt-4 h-5 w-3/4 rounded-full bg-[#E5E7EB]" />
      <div className="mt-3 h-4 w-1/2 rounded-full bg-[#E5E7EB]" />
      <div className="mt-5 h-10 rounded-full bg-[#E5E7EB]" />
    </div>
  );
}
