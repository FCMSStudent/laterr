import { Skeleton } from "@/ui";
import { AspectRatio } from "@/ui";
import { useMemo } from "react";

export const ItemCardSkeleton = () => {
  const variant = useMemo(() => {
    const variants = [
      { ratio: 16 / 9, lines: 2 }, // video-ish
      { ratio: 4 / 5, lines: 2 }, // image/article-ish
      { ratio: 3 / 4, lines: 2 }, // doc-ish
      { ratio: null as number | null, lines: 4 } // note-ish (no media)
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  }, []);

  return (
    <div className="glass-card rounded-2xl p-7 overflow-hidden">
      {/* Media skeleton (optional) */}
      {variant.ratio ? (
        <AspectRatio ratio={variant.ratio} className="mb-6">
          <Skeleton className="w-full h-full rounded-xl" />
        </AspectRatio>
      ) : (
        <div className="mb-6">
          <Skeleton className="w-full h-16 rounded-xl" />
        </div>
      )}
      
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
          {Array.from({ length: variant.lines }).map((_, i) => (
            <Skeleton
              key={i}
              className={
                i === variant.lines - 1
                  ? "h-3 w-5/6"
                  : "h-3 w-full"
              }
            />
          ))}
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
