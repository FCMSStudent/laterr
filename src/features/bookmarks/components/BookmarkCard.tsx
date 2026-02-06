import { Badge } from "@/shared/components/ui";
import { Link2, FileText, Image as ImageIcon, MoreVertical, Trash2, Edit, Play, FileType, ArrowUpRight, BookOpen, ShoppingBag, Eye, RotateCcw } from "lucide-react";
import type { ItemType } from "@/features/bookmarks/types";
import { AspectRatio } from "@/shared/components/ui";
import { Checkbox } from "@/shared/components/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui";
import { Button } from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui";
import { useMemo, useState, useRef } from "react";
import { isVideoUrl } from "@/features/bookmarks/utils/video-utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useDominantColor } from "@/shared/hooks/use-dominant-color";
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
  onClick: () => void;
  onTagClick: (tag: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
  onDelete?: (id: string) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  isTrashed?: boolean;
  onEdit?: (id: string) => void;
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
export const BookmarkCard = ({
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
  onEdit
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
  const {
    color: dominantColor
  } = useDominantColor(previewImageUrl);
  const dateText = formatDate(createdAt);
  const mediaRatio = useMemo(() => {
    // Content-type driven sizing (works best with masonry columns)
    if (isVideo) return 16 / 9;
    if (type === 'image') return 4 / 5;
    if (type === 'document' || type === 'file') return 3 / 4;
    if (type === 'url') return 4 / 5;
    return 3 / 4;
  }, [isVideo, type]);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
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
    onClick();
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

      <div role="article" tabIndex={0} aria-label={`${categoryBadge.label}: ${title}`} onClick={handleCardClick} onKeyDown={handleKeyDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{
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
            <p className="text-foreground/80 text-sm leading-relaxed line-clamp-10">
              {summary || title}
            </p>
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
              onClick();
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

    <div role="article" tabIndex={0} aria-label={`${categoryBadge.label}: ${title}`} onClick={handleCardClick} onKeyDown={handleKeyDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{
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
        {/* Full-bleed image */}
        {previewImageUrl && !imageError ? <>
          {!imageLoaded && <div className="absolute inset-0 z-10">
            <Skeleton className="w-full h-full rounded-xl" />
          </div>}
          <img src={previewImageUrl} alt="" className={cn("absolute inset-0 w-full h-full object-cover", imageLoaded ? "opacity-100" : "opacity-0")} onLoad={() => setImageLoaded(true)} onError={() => setImageError(true)} />
        </> :
        // Fallback: gradient background with icon
        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <categoryBadge.icon className="h-16 w-16 text-muted-foreground/30" />
          </div>}

        {/* Dynamic gradient overlay from bottom - uses extracted dominant color */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: dominantColor ? `linear-gradient(to top, ${dominantColor} 0%, ${dominantColor}dd 30%, ${dominantColor}aa 50%, ${dominantColor}00 100%)` : 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.4) 60%, transparent 100%)'
        }} />

        {/* Content type badge - top left */}
        {/* Content type badge - top left */}
        <Badge variant="outline" className={cn("absolute top-4 left-4 z-10 text-xs font-medium items-center gap-1.5 px-2.5 py-1 border-0 flex flex-row shadow-sm backdrop-blur-sm", categoryBadge.color)}>
          <categoryBadge.icon className="h-3 w-3" />
          {categoryBadge.label}
        </Badge>

        {/* Play button overlay for videos - positioned in upper half to avoid text overlap */}
        {isVideo && <div className="absolute top-1/4 left-0 right-0 flex items-center justify-center pointer-events-none">
          <div className="w-14 h-14 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center">
            <Play className="h-6 w-6 text-white fill-white ml-0.5" />
          </div>
        </div>}

        {/* Text overlay - bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
          {/* Title */}
          <h3 className="font-bold text-white text-base leading-tight line-clamp-2 transition-transform duration-200 ease-out group-hover:-translate-y-3 group-focus-within:-translate-y-3">
            {title}
          </h3>
        </div>

        <span className="absolute bottom-2 left-5 z-20 text-white text-sm font-medium underline underline-offset-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-200 ease-out pointer-events-none">
          Open
        </span>
      </AspectRatio>
    </div>
  </div>;
};
