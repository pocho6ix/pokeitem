import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";

interface LoadingStateProps {
  count?: number;
  variant?: "card" | "list" | "detail";
  className?: string;
}

export function LoadingState({ count = 6, variant = "card", className }: LoadingStateProps) {
  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} variant="text" className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className={cn("space-y-6", className)}>
        <Skeleton variant="card" className="h-64 w-full" />
        <Skeleton variant="text" className="h-8 w-2/3" />
        <Skeleton variant="text" className="h-4 w-full" />
        <Skeleton variant="text" className="h-4 w-3/4" />
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="card" className="h-48" />
      ))}
    </div>
  );
}
