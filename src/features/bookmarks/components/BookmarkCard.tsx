import { Badge } from "@/shared/components/ui";
import { Link2, FileText, Image as ImageIcon, MoreVertical, Trash2, Edit, Play, FileType, ArrowUpRight, BookOpen, ShoppingBag, Eye, RotateCcw } from "lucide-react";
import { NotePreview } from "./NotePreview";
import type { ItemType } from "@/features/bookmarks/types";
import { AspectRatio } from "@/shared/components/ui";
import { Checkbox } from "@/shared/components/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui";
import { Button } from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui";
import { useMemo, useState, useRef, memo } from "react";
import { isVideoUrl } from "@/features/bookmarks/utils/video-utils";
import { useIsMobile } from "@/shared/hooks/useMobile";
import { useDominantColor } from "@/shared/hooks/useDominantColor";
import { cn } from "@/shared/lib/utils";
import { format } from "date-fns";
interface BookmarkCardProps {
  id: string;
  type: ItemType;
  title: string;
  previewImageUrl?: string | null;
  content?: string | null;
  tags: string[];
  createdAt?: string;
  summary?: string | null;
  onClick: (id: string) => void;
  onTagClick: (tag: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  isTrashed?: boolean;
  onEdit?: (id: string) => void;
  sourceName?: string;
  sourceFavicon?: string;
  size?: "standard" | "tall";
}
// Smart category badge configuration
// Maps tag names to badge styles and labels
type CategoryConfig = {
  label: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  color: string;
};
const CATEGORY_BADGES: Record<string, CategoryConfig> = {
  'watch later': {
    label: 'Watch Later',
    icon: Play,
    color: 'bg-violet-500/80 text-white'
  },
  'read later': {
    label: 'Read Later',
    icon: BookOpen,
    color: 'bg-amber-500/80 text-white'
  },
  'wishlist': {
    label: 'Wishlist',
    icon: ShoppingBag,
    color: 'bg-emerald-500/80 text-white'
  }
};

// Fallback badges for specific content types when no category tag is present
const TYPE_FALLBACK_BADGES: Record<string, CategoryConfig> = {
  note: {
    label: 'Note',
    icon: FileText,
    color: 'bg-slate-500/80 text-white'
  },
  document: {
    label: 'Document',
    icon: FileType,
    color: 'bg-amber-500/80 text-white'
  },
  file: {
    label: 'Document',
    icon: FileType,
    color: 'bg-amber-500/80 text-white'
  },
  image: {
    label: 'Image',
    icon: ImageIcon,
    color: 'bg-slate-500/80 text-white'
  },
  video: {
    label: 'Watch Later',
    icon: Play,
    color: 'bg-violet-500/80 text-white'
  }
};

// Get badge info based on tags and content type
const getCategoryBadge = (type: ItemType, tags: string[], content?: string | null): CategoryConfig => {
  // First, check if it's a video type or URL
  if (type === 'video' || type === 'url' && content && isVideoUrl(content)) {
    return CATEGORY_BADGES['watch later'];
  }

  // Check tags for category (first matching tag wins)
  const normalizedTags = tags.map(t => t.toLowerCase().trim());
  for (const tag of normalizedTags) {
    if (CATEGORY_BADGES[tag]) {
      return CATEGORY_BADGES[tag];
    }
  }

  // Fallback to type-based badge
  if (TYPE_FALLBACK_BADGES[type]) {
    return TYPE_FALLBACK_BADGES[type];
  }

  // Default fallback
  return {
    label: 'Item',
    icon: Eye,
    color: 'bg-slate-500/80 text-white'
  };
};

// Format date for display
const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'yyyy/MM');
  } catch {
    return '';
  }
};

/** Parse an rgb/hex color into [r, g, b] */
const parseColor = (color: string): [number, number, number] | null => {
  const rgbMatch = color.match(/rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)/);
  if (rgbMatch) return [+rgbMatch[1], +rgbMatch[2], +rgbMatch[3]];
  const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1].length === 3
      ? hexMatch[1].split('').map(c => c + c).join('')
      : hexMatch[1];
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  return null;
};

const toRgba = (color: string, alpha: number) => {
  const parsed = parseColor(color);
  if (parsed) return `rgba(${parsed[0]}, ${parsed[1]}, ${parsed[2]}, ${alpha})`;
  return color;
};

/**
 * Darken a color so its relative luminance is low enough for white text.
 * Light dominant colors (beige, light grey, pink) get pulled down to a
 * readable level while preserving hue.
 */
const ensureDark = (color: string): string => {
  const parsed = parseColor(color);
  if (!parsed) return color;
  let [r, g, b] = parsed;
  // Perceived brightness (0-255): quick luminance approximation
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  // Target max brightness ~80 (out of 255) for good contrast with white text
   if (brightness > 55) {
    const scale = 55 / brightness;
    r = Math.round(r * scale);
    g = Math.round(g * scale);
    b = Math.round(b * scale);
  }
  return `rgb(${r}, ${g}, ${b})`;
};
/**
 * BookmarkCard component displays a single bookmark item in a grid layout.
 * Optimized with React.memo to prevent unnecessary re-renders when parent state
 * (like search query or filter visibility) changes but the item itself remains the same.
 */
export const BookmarkCard = memo(({
  id,
  type,
  title,
  previewImageUrl,
  content,
  tags,
  createdAt,
  summary,
  onClick,
  onTagClick,
  isSelectionMode = false,
  isSelected = false,
  onSelectionChange,
  onDelete,
  onRestore,
  onPermanentDelete,
  isTrashed = false,
  onEdit,
  sourceName,
  sourceFavicon,
  size = "tall"
}: BookmarkCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const isMobile = useIsMobile();
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const SWIPE_THRESHOLD = 80;
  const categoryBadge = getCategoryBadge(type, tags, content);
  const isVideo = type === 'video' || type === 'url' && content && isVideoUrl(content);
  const isNoteType = type === 'note';
  const { color: rawDominantColor } = useDominantColor(previewImageUrl);
  const dominantColor = useMemo(() => rawDominantColor ? ensureDark(rawDominantColor) : null, [rawDominantColor]);
  const dateText = formatDate(createdAt);
  const mediaRatio = useMemo(() => {
    // App Store-style taller cards for richer content display
    if (size === "standard") {
      // Standard aspect ratios (shorter cards)
      if (isVideo) return 9 / 16;  // Standard video
      if (type === 'image') return 1;  // Square for images
      return 4 / 5;  // Default standard
    }
    
    // Tall variant (default) - better for rich text overlay
    if (isVideo) return 3 / 4;  // Taller video cards for more text space
    if (type === 'image') return 3 / 4;  // Portrait for images
    if (type === 'document' || type === 'file') return 4 / 5;
    if (type === 'url') return 4 / 5;  // URL bookmarks
    return 4 / 5;  // Default tall
  }, [isVideo, type, size]);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(id);
    }
  };
  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  // Mobile long-press to show actions
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    if (isMobile) {
      if (!isSelectionMode && onSelectionChange) {
        longPressTimerRef.current = setTimeout(() => {
          onSelectionChange(id, true);
        }, 500);
      }
      if (!isSelectionMode) {
        setTimeout(() => {
          setShowMobileActions(true);
        }, 500);
      }
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      const moveX = Math.abs(e.touches[0].clientX - touchStartX.current);
      const moveY = Math.abs(e.touches[0].clientY - touchStartY.current);
      if (moveX > 10 || moveY > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
    if (isMobile && onDelete && !isSelectionMode && !isTrashed) {
      const diff = touchStartX.current - e.touches[0].clientX;
      const verticalDiff = Math.abs(e.touches[0].clientY - touchStartY.current);
      if (diff > 10 && verticalDiff < 30) {
        setIsSwiping(true);
        setSwipeOffset(Math.min(Math.max(diff, 0), 100));
      }
    }
  };
  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (swipeOffset > SWIPE_THRESHOLD && onDelete && !isTrashed) {
      onDelete(id);
    }
    setSwipeOffset(0);
    setIsSwiping(false);
  };
  const handleCardClick = () => {
    if (isSwiping) return;
    if (showMobileActions) {
      setShowMobileActions(false);
      return;
    }
    onClick(id);
  };

  // Note type: white card with text overlay
  if (isNoteType) {
    return <div className="relative overflow-hidden rounded-xl">
      {/* Swipe delete action background */}
      {isMobile && onDelete && !isTrashed && <div className={cn("absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-4 rounded-r-xl transition-opacity duration-200", swipeOffset > 0 ? "opacity-100" : "opacity-0")} style={{
        width: `${Math.max(swipeOffset, 0)}px`
      }}>
        <Trash2 className="h-5 w-5 text-destructive-foreground" />
      </div>}

      <div role="article" data-testid={`bookmark-card-${id}`} tabIndex={0} aria-label={`${categoryBadge.label}: ${title}`} onClick={handleCardClick} onKeyDown={handleKeyDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{
        transform: isMobile ? `translateX(-${swipeOffset}px)` : undefined
      }} className={cn("glass-card rounded-xl cursor-pointer group overflow-hidden relative", "hover:shadow-md transition-shadow duration-200", "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", isSelected && "ring-2 ring-primary", isSelectionMode && !isSelected && "hover:ring-2 hover:ring-primary/50")}>
        {/* Selection checkbox */}
        {isSelectionMode && <div className="absolute top-4 right-4 z-20 animate-in zoom-in-50 duration-200" onClick={e => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={checked => onSelectionChange?.(id, checked as boolean)} aria-label={`Select ${title}`} className="glass-light" />
        </div>}

        {/* Actions menu */}
        <div className={cn("absolute top-4 right-4 z-20 transition-opacity duration-200", isSelectionMode && "hidden", isMobile ? showMobileActions ? "opacity-100" : "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full glass-light hover:shadow-md" aria-label="Card actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {!isTrashed && onEdit && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onEdit(id))}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>}
              {!isTrashed && onDelete && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onDelete(id))} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Move to Trash
              </DropdownMenuItem>}
              {isTrashed && onRestore && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onRestore(id))}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Restore
              </DropdownMenuItem>}
              {isTrashed && onPermanentDelete && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onPermanentDelete(id))} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete permanently
              </DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="p-5 flex flex-col justify-between min-h-[220px]">
          {/* Note content preview */}
          <div className="flex-1 overflow-hidden">
            {content ? (
              <NotePreview
                content={content}
                maxLines={6}
                variant="compact"
                showProgress={true}
                className="p-0"
              />
            ) : (
              <p className="text-foreground/80 text-sm leading-relaxed line-clamp-10">
                {summary || title}
              </p>
            )}
          </div>

          {/* Bottom section */}
          <div className="flex items-end justify-between mt-4 pt-4 border-t border-border/30">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-base line-clamp-2 mb-1">
                {title}
              </h3>
              <span className="text-muted-foreground text-xs">{dateText}</span>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-colors ml-3 flex-shrink-0" onClick={e => {
              e.stopPropagation();
              onClick(id);
            }} aria-label="Open note">
              <ArrowUpRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>;
  }

  // Image/URL variant - full-bleed image with text overlay
  return <div className="relative rounded-xl">
    {/* Swipe delete action background */}
    {isMobile && onDelete && !isTrashed && <div className={cn("absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-4 rounded-r-xl transition-opacity duration-200", swipeOffset > 0 ? "opacity-100" : "opacity-0")} style={{
      width: `${Math.max(swipeOffset, 0)}px`
    }}>
      <Trash2 className="h-5 w-5 text-destructive-foreground" />
    </div>}

    <div role="article" data-testid={`bookmark-card-${id}`} tabIndex={0} aria-label={`${categoryBadge.label}: ${title}`} onClick={handleCardClick} onKeyDown={handleKeyDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{
      transform: isMobile ? `translateX(-${swipeOffset}px)` : undefined
    }} className={cn("rounded-xl border border-border/20 dark:border-transparent shadow-sm cursor-pointer group overflow-hidden relative", "transition-shadow duration-200 ease-out", "hover:shadow-md", "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", isSelected && "ring-2 ring-primary", isSelectionMode && !isSelected && "hover:ring-2 hover:ring-primary/50")}>
      {/* Selection checkbox */}
      {isSelectionMode && <div className="absolute top-4 right-4 z-20 animate-in zoom-in-50 duration-200" onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={checked => onSelectionChange?.(id, checked as boolean)} aria-label={`Select ${title}`} className="glass-light" />
      </div>}

      {/* Actions menu */}
      <div className={cn("absolute top-4 right-4 z-20 transition-opacity duration-200", isSelectionMode && "hidden", isMobile ? showMobileActions ? "opacity-100" : "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full glass-light text-foreground hover:shadow-md" aria-label="Card actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {!isTrashed && onEdit && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onEdit(id))}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>}
            {!isTrashed && onDelete && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onDelete(id))} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Move to Trash
            </DropdownMenuItem>}
            {isTrashed && onRestore && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onRestore(id))}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore
            </DropdownMenuItem>}
            {isTrashed && onPermanentDelete && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onPermanentDelete(id))} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete permanently
            </DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AspectRatio ratio={mediaRatio}>
        {/* Base tint only when image is loading, missing, or has error */}
        {(!imageLoaded || imageError || !previewImageUrl) && (
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: dominantColor
                ? toRgba(dominantColor, 0.35)
                : "rgba(0,0,0,0.25)"
            }}
          />
        )}

        {/* Full-bleed image */}
        {previewImageUrl && !imageError ? <>
          {!imageLoaded && <div className="absolute inset-0 z-10">
            <Skeleton className="w-full h-full rounded-xl" />
          </div>}
          <img
            data-testid="bookmark-card-image"
            src={previewImageUrl} 
            alt="" 
           className={cn(
              "absolute inset-0 w-full h-full z-20",
              imageLoaded ? "opacity-100" : "opacity-0",
              (type === 'document' || type === 'file') ? "object-contain" : "object-cover"
            )} 
            style={{
              willChange: 'opacity',
              backgroundColor: (type === 'document' || type === 'file')
                ? (dominantColor ? toRgba(dominantColor, 0.15) : 'hsl(220 15% 12%)')
                : undefined
            }}
            onLoad={() => setImageLoaded(true)} 
            onError={() => setImageError(true)} 
          />
        </> :
        // Fallback: gradient background with icon
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            background: dominantColor
              ? `linear-gradient(135deg, ${toRgba(dominantColor, 0.85)} 0%, ${toRgba(dominantColor, 0.60)} 100%)`
              : 'linear-gradient(135deg, hsl(220 20% 18%) 0%, hsl(220 15% 28%) 100%)',
          }}
        >
            <categoryBadge.icon className="h-16 w-16 text-white/15" />
          </div>}

        {/* Gradient-only transition zone – no blur, feathers color upward */}
        <div
          data-testid="bookmark-card-overlay"
          className="absolute inset-0 pointer-events-none z-30"
          style={{
            background: dominantColor
              ? `linear-gradient(to top, ${toRgba(dominantColor, 0.95)} 0%, ${toRgba(dominantColor, 0.80)} 12%, ${toRgba(dominantColor, 0.50)} 28%, ${toRgba(dominantColor, 0.20)} 42%, ${toRgba(dominantColor, 0.08)} 55%, transparent 68%)`
              : 'linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.60) 15%, rgba(0,0,0,0.30) 35%, rgba(0,0,0,0.08) 52%, transparent 68%)',
            willChange: 'opacity'
          }}
        />

        {/* Play button overlay for videos - perfectly centered */}
        {isVideo && <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-35">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center shadow-lg">
            <Play className="h-7 w-7 text-white fill-white ml-0.5" />
          </div>
        </div>}

        {/* Frosted glass text panel – mask fades the blur at top edge */}
        <div className="absolute bottom-0 left-0 right-0 z-40">
          <div className="px-5 pb-5 pt-6 backdrop-blur-md space-y-2"
            style={{
              background: dominantColor
                ? `linear-gradient(to top, ${toRgba(dominantColor, 0.40)} 0%, ${toRgba(dominantColor, 0.10)} 70%, transparent 100%)`
                : 'linear-gradient(to top, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 70%, transparent 100%)',
              maskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to top, black 55%, transparent 100%)',
            }}
          >
            {/* Category label */}
            <span className="text-white/80 text-[10px] font-semibold uppercase tracking-[0.12em] block">
              {categoryBadge.label}
            </span>

            {/* Title */}
            <h3 className="font-bold text-white text-lg leading-tight line-clamp-2 drop-shadow-sm"
              style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
              {title}
            </h3>

            {/* Summary/description */}
            {summary && (
              <p className="text-white/75 text-[13px] leading-relaxed line-clamp-2 font-light"
                style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                {summary}
              </p>
            )}

            {/* Optional source attribution row */}
            {(sourceName || sourceFavicon) && (
              <div className="flex items-center gap-2 pt-0.5">
                {sourceFavicon && (
                  <img
                    src={sourceFavicon}
                    alt={sourceName ? `${sourceName} icon` : "Source icon"}
                    className="w-3.5 h-3.5 rounded-sm object-cover opacity-80"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                {sourceName && (
                  <span className="text-white/60 text-[11px] font-medium tracking-wide">
                    {sourceName}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </AspectRatio>
    </div>
  </div>;
});

BookmarkCard.displayName = "BookmarkCard";
