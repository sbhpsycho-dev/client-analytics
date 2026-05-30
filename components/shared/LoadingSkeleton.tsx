import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 space-y-3">
      <Skeleton className="h-4 w-24 bg-zinc-800" />
      <Skeleton className="h-8 w-32 bg-zinc-800" />
      <Skeleton className="h-3 w-20 bg-zinc-800" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 py-3 px-4 rounded-lg border border-zinc-800">
          <Skeleton className="h-4 w-32 bg-zinc-800" />
          <Skeleton className="h-4 w-24 bg-zinc-800" />
          <Skeleton className="h-4 w-20 bg-zinc-800" />
          <Skeleton className="h-4 flex-1 bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48 bg-zinc-800" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <TableSkeleton />
    </div>
  );
}
