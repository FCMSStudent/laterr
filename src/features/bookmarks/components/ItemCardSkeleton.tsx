import { Skeleton } from "@/shared/components/ui/skeleton";
import { AspectRatio } from "@/shared/components/ui/aspect-ratio";

export const ItemCardSkeleton = () => {
  return (
    <div className="glass-card rounded-2xl p-7 overflow-hidden">
      {/* Image skeleton with aspect ratio */}
      <AspectRatio ratio={16 / 9} className="mb-6">
        <Skeleton className="w-full h-full rounded-xl" />
      </AspectRatio>
      
      <div className="space-y-4">
        {/* Icon and title skeleton */}
        <div className="flex items-start gap-3">
          <Skeleton className="h-4 w-4 mt-1 rounded" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
        
        {/* Summary skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
        
        {/* Date skeleton */}
        <Skeleton className="h-3 w-24" />
        
        {/* Tags skeleton */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
};
