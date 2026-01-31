import { AspectRatio, Skeleton } from "@/ui";

export const ItemCardSkeleton = () => {
  return (
    <div className="glass-card rounded-2xl p-5 md:p-7 min-h-[280px] md:min-h-[320px] bg-card">
      {/* Media Section */}
      <AspectRatio ratio={16 / 9} className="mb-4 md:mb-6">
        <Skeleton className="w-full h-full rounded-xl bg-muted/20" />
      </AspectRatio>

      <div className="space-y-3 md:space-y-4">
        {/* Icon + Title */}
        <div className="gap-3 flex-row flex items-start justify-start">
          <Skeleton className="h-4 w-4 mt-1 rounded-sm bg-muted/20 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-full rounded bg-muted/20" />
            <Skeleton className="h-5 w-2/3 rounded bg-muted/20" />
          </div>
        </div>

        {/* Summary */}
        <div className="space-y-2 pt-1">
          <Skeleton className="h-4 w-full rounded bg-muted/20" />
          <Skeleton className="h-4 w-5/6 rounded bg-muted/20" />
        </div>

        {/* Metadata */}
        <div className="flex gap-3 pt-1">
          <Skeleton className="h-3 w-24 rounded bg-muted/20" />
          <Skeleton className="h-3 w-16 rounded bg-muted/20" />
        </div>

        {/* Tags */}
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-16 rounded-full bg-muted/20" />
          <Skeleton className="h-8 w-20 rounded-full bg-muted/20" />
          <Skeleton className="h-8 w-14 rounded-full bg-muted/20" />
        </div>
      </div>
    </div>
  );
};
