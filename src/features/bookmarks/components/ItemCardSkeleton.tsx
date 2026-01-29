import { AspectRatio } from "@/ui";
import { useMemo } from "react";

export const ItemCardSkeleton = () => {
  const variant = useMemo(() => {
    const variants = [
      { ratio: 16 / 9, isNote: false },
      { ratio: 4 / 5, isNote: false },
      { ratio: 3 / 4, isNote: false },
      { ratio: null, isNote: true }
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  }, []);

  // Note skeleton variant
  if (variant.isNote) {
    return (
      <div className="bg-muted/20 border border-border/20 shadow-sm rounded-xl overflow-hidden min-h-[220px] p-5 flex flex-col justify-between">
        {/* Text content skeleton */}
        <div className="flex-1 space-y-2">
          <div className="h-3 w-full bg-muted/15 rounded animate-pulse" />
          <div className="h-3 w-11/12 bg-muted/15 rounded animate-pulse" />
          <div className="h-3 w-4/5 bg-muted/15 rounded animate-pulse" />
          <div className="h-3 w-full bg-muted/15 rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-muted/15 rounded animate-pulse" />
        </div>

        {/* Bottom section */}
        <div className="flex items-end justify-between mt-4 pt-4 border-t border-border/30">
          <div className="flex-1">
            <div className="h-4 w-32 bg-muted/15 rounded animate-pulse mb-2" />
            <div className="h-3 w-16 bg-muted/15 rounded animate-pulse" />
          </div>
          <div className="h-5 w-5 bg-muted/15 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  // Media skeleton variant
  return (
    <div className="rounded-xl overflow-hidden relative">
      <AspectRatio ratio={variant.ratio || 4 / 5}>
        {/* Full-bleed skeleton */}
        <div className="absolute inset-0 bg-muted/15 animate-pulse" />

        {/* Badge skeleton - top left */}
        <div className="absolute top-4 left-4 z-10 h-6 w-20 rounded-full bg-muted/30 animate-pulse" />

        {/* Gradient overlay skeleton */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Bottom text skeleton */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="h-5 w-3/4 bg-white/20 rounded animate-pulse mb-2" />
          <div className="h-4 w-1/2 bg-white/20 rounded animate-pulse mb-3" />
          <div className="h-3 w-16 bg-white/15 rounded animate-pulse" />
        </div>
      </AspectRatio>
    </div>
  );
};
