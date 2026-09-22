import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="container py-8">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-9 w-2/3 max-w-md" />
      <Skeleton className="mt-6 h-10 w-64" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Skeleton className="hidden h-[520px] lg:block" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4]" />
          ))}
        </div>
      </div>
    </div>
  );
}
