import { Skeleton } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="container py-8">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-9 w-1/2 max-w-sm" />
      <Skeleton className="mt-3 h-4 w-2/3 max-w-lg" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-72" />
        ))}
      </div>
    </div>
  );
}
