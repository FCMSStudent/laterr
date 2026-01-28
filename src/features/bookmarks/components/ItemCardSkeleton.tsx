import { AspectRatio } from "@/ui";
import { useMemo } from "react";

export const ItemCardSkeleton = () => {
  const variant = useMemo(() => {
    const variants = [
      { ratio: 16 / 9 },
      { ratio: 4 / 5 },
      { ratio: 3 / 4 },
      { ratio: null as number | null }
    ];
    return variants[Math.floor(Math.random() * variants.length)];
  }, []);

  return (
    <div className="glass-card rounded-2xl p-3 md:p-5 overflow-hidden min-h-[280px] md:min-h-[320px] bg-card">
      {variant.ratio ? (
        <AspectRatio ratio={variant.ratio} className="mb-3 md:mb-4">
          <div className="w-full h-full rounded-xl bg-muted/15 animate-pulse" />
        </AspectRatio>
      ) : (
        <AspectRatio ratio={16 / 9} className="mb-3 md:mb-4">
          <div className="w-full h-full rounded-xl bg-muted/15 animate-pulse" />
        </AspectRatio>
      )}

      <div className="space-y-2 md:space-y-3">
        <div className="flex items-start gap-3">
          <div className="h-4 w-4 mt-1 rounded bg-muted/15 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full bg-muted/15 rounded animate-pulse" />
            <div className="h-4 w-3/4 bg-muted/15 rounded animate-pulse" />
          </div>
        </div>

        <div className="h-3 w-24 bg-muted/15 rounded animate-pulse" />

        <div className="flex flex-wrap gap-2 pt-1">
          <div className="h-6 w-16 rounded-full bg-muted/15 animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-muted/15 animate-pulse" />
          <div className="h-6 w-14 rounded-full bg-muted/15 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
