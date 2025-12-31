import { Skeleton } from "@/shared/components/ui/skeleton";

export const SubscriptionCardSkeleton = () => {
  return (
    <div className="glass-card rounded-2xl p-6 overflow-hidden">
      {/* Status badge skeleton */}
      <div className="absolute top-4 right-4">
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Logo skeleton */}
      <div className="flex justify-center mb-4">
        <Skeleton className="w-16 h-16 rounded-xl" />
      </div>

      {/* Content skeletons */}
      <div className="space-y-3">
        {/* Name */}
        <div className="flex justify-center">
          <Skeleton className="h-5 w-32" />
        </div>

        {/* Amount */}
        <div className="flex justify-center">
          <Skeleton className="h-8 w-24" />
        </div>

        {/* Category */}
        <div className="flex justify-center">
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Renewal date */}
        <div className="flex justify-center">
          <Skeleton className="h-3 w-28" />
        </div>

        {/* Tags */}
        <div className="flex justify-center gap-1 pt-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
};
