import { Badge } from "@/shared/components/ui";
import { Link2, FileText, Image as ImageIcon, MoreVertical, Trash2, Edit, Play, Clock, RotateCcw } from "lucide-react";
import type { ItemType } from "@/features/bookmarks/types";
import { AspectRatio } from "@/shared/components/ui";
import { Checkbox } from "@/shared/components/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui";
import { Button } from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui";
import { formatDistanceToNow } from "date-fns";
import { useState, useRef, useCallback } from "react";
import { isVideoUrl } from "@/features/bookmarks/utils/video-utils";
import { NotePreview } from "@/features/bookmarks/components/NotePreview";
import { useIsMobile } from "@/shared/hooks/useMobile";
import { cn } from "@/shared/lib/utils";
interface ItemCardProps {
  id: string;
  type: ItemType;
  title: string;
  summary?: string | null;
  previewImageUrl?: string | null;
  content?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
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
export const ItemCard = ({
  id,
  type,
  title,
  summary,
  previewImageUrl,
  content,
  tags,
  createdAt,
  updatedAt,
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
}: ItemCardProps) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const [expandedTags, setExpandedTags] = useState(false);
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
  const getIcon = () => {
    switch (type) {
      case 'url':
        return <Link2 className="h-4 w-4" aria-hidden="true" />;
      case 'note':
      case 'document':
      case 'file':
        return <FileText className="h-4 w-4" aria-hidden="true" />;
      case 'image':
        return <ImageIcon className="h-4 w-4" aria-hidden="true" />;
      default:
        return null;
    }
  };
  const getTypeLabel = () => {
    switch (type) {
      case 'url':
        return 'URL';
      case 'note':
        return 'Note';
      case 'document':
        return 'Document';
      case 'file':
        return 'File';
      case 'image':
        return 'Image';
      default:
        return 'Item';
    }
  };
  const getReadingTime = useCallback((noteContent: string | null | undefined) => {
    if (!noteContent || type !== 'note') return null;
    const words = noteContent.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return minutes;
  }, [type]);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true
      });
    } catch {
      return '';
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
      // Long press for selection mode
      if (!isSelectionMode && onSelectionChange) {
        longPressTimerRef.current = setTimeout(() => {
          // Enter selection mode and select this item
          onSelectionChange(id, true);
        }, 500);
      }

      // Also show mobile actions if not in selection mode
      if (!isSelectionMode) {
        setTimeout(() => {
          setShowMobileActions(true);
        }, 500);
      }
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel long press if moved
    if (longPressTimerRef.current) {
      const moveX = Math.abs(e.touches[0].clientX - touchStartX.current);
      const moveY = Math.abs(e.touches[0].clientY - touchStartY.current);
      if (moveX > 10 || moveY > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Handle swipe for delete
    if (isMobile && onDelete && !isSelectionMode && !isTrashed) {
      const diff = touchStartX.current - e.touches[0].clientX;
      const verticalDiff = Math.abs(e.touches[0].clientY - touchStartY.current);

      // Only allow horizontal swipe
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
  const readingTime = getReadingTime(content);
  return <div className="relative overflow-hidden rounded-2xl">
    {/* Swipe delete action background */}
    {isMobile && onDelete && !isTrashed && <div className={cn("absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-4 rounded-r-2xl premium-transition", swipeOffset > 0 ? "opacity-100" : "opacity-0")} style={{
      width: `${Math.max(swipeOffset, 0)}px`
    }}>
      <Trash2 className="h-5 w-5 text-white" />
    </div>}

    {/* Main card */}
    <div role="article" tabIndex={0} aria-label={`${getTypeLabel()}: ${title}${summary ? `. ${summary}` : ''}`} onClick={handleCardClick} onKeyDown={handleKeyDown} onMouseEnter={() => setShowAllTags(true)} onMouseLeave={() => setShowAllTags(false)} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{
      transform: isMobile ? `translateX(-${swipeOffset}px)` : undefined
    }} className={cn("glass-card rounded-2xl p-5 md:p-7 cursor-pointer hover:scale-[1.02] premium-transition hover:shadow-2xl group overflow-hidden relative focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none min-h-[280px] md:min-h-[320px]", type === 'note' && "border border-border/60 dark:border-transparent", isSelected && "ring-2 ring-primary bg-primary/5 scale-[0.98]", isSelectionMode && !isSelected && "hover:ring-2 hover:ring-primary/50")}>
      {/* Selection checkbox */}
      {isSelectionMode && <div className="absolute top-4 left-4 z-10 animate-in zoom-in-50 duration-200" onClick={e => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={checked => onSelectionChange?.(id, checked as boolean)} aria-label={`Select ${title}`} className={cn(isSelected && "animate-in zoom-in-75 duration-150")} />
      </div>}


      {/* Actions menu */}
      <div className={cn("absolute top-4 right-4 z-10 premium-transition", isMobile ? showMobileActions ? "opacity-100" : "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100")}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-10 w-10 md:h-8 md:w-8 p-0 rounded-full glass-light hover:shadow-md min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0" aria-label="Card actions">
              <MoreVertical className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {!isTrashed && onEdit && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onEdit(id))} className="min-h-[44px] md:min-h-0 text-base md:text-sm">
              <Edit className="mr-2 h-5 w-5 md:h-4 md:w-4" />
              Edit
            </DropdownMenuItem>}
            {!isTrashed && onDelete && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onDelete(id))} className="text-destructive focus:text-destructive min-h-[44px] md:min-h-0 text-base md:text-sm">
              <Trash2 className="mr-2 h-5 w-5 md:h-4 md:w-4" />
              Move to Trash
            </DropdownMenuItem>}
            {isTrashed && onRestore && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onRestore(id))} className="min-h-[44px] md:min-h-0 text-base md:text-sm">
              <RotateCcw className="mr-2 h-5 w-5 md:h-4 md:w-4" />
              Restore
            </DropdownMenuItem>}
            {isTrashed && onPermanentDelete && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onPermanentDelete(id))} className="text-destructive focus:text-destructive min-h-[44px] md:min-h-0 text-base md:text-sm">
              <Trash2 className="mr-2 h-5 w-5 md:h-4 md:w-4" />
              Delete permanently
            </DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Note type: show note preview */}
      {type === 'note' && content ? <AspectRatio ratio={16 / 9} className="mb-4 md:mb-6">
        <div className="w-full h-full rounded-xl overflow-hidden bg-card border border-border/50">
          <NotePreview content={content} maxLines={4} variant="compact" showProgress={true} />
        </div>
      </AspectRatio> : previewImageUrl && !imageError ? <AspectRatio ratio={16 / 9} className="mb-4 md:mb-6">
        <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted/50">
          {/* Skeleton placeholder while loading */}
          {!imageLoaded && <div className="absolute inset-0 z-10">
            <Skeleton className="w-full h-full rounded-xl" />
          </div>}
          <img src={previewImageUrl} alt={title} className={cn("w-full h-full object-cover", imageLoaded ? "opacity-100" : "opacity-0")} onLoad={() => setImageLoaded(true)} onError={() => setImageError(true)} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 premium-transition"></div>
          {/* Video play icon overlay - only when loaded */}
          {imageLoaded && content && isVideoUrl(content) && <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 premium-transition bg-primary/[0.67]">
              <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
            </div>
          </div>}
        </div>
      </AspectRatio> : <AspectRatio ratio={16 / 9} className="mb-4 md:mb-6">
        <div className="flex items-center justify-center w-full h-full rounded-xl bg-muted/30">
          <div className="text-muted-foreground/40">{getIcon()}</div>
        </div>
      </AspectRatio>}

      <div className="space-y-3 md:space-y-4">
        <div className="gap-3 flex-row flex items-start justify-start">
          <div className="mt-1 text-primary/70">{getIcon()}</div>
          <h3 className="font-bold text-sm md:text-base line-clamp-2 flex-1 leading-snug tracking-tight">{title}</h3>
        </div>

        {summary && <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">{summary}</p>}

        {/* Date display with reading time */}
        <div className="text-xs text-muted-foreground/70 flex items-center gap-3">
          <span>
            {updatedAt && updatedAt !== createdAt ? `Updated ${formatDate(updatedAt)}` : `Created ${formatDate(createdAt)}`}
          </span>
          {readingTime && <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readingTime} min read
          </span>}
        </div>

        {/* Tags section with overflow handling - mobile tap to expand */}
        <div className="flex flex-wrap gap-2 pt-2">
          {(isMobile ? expandedTags ? tags : tags.slice(0, 2) : showAllTags ? tags : tags.slice(0, 3)).map((tag, index) => <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-accent premium-transition text-xs font-semibold shadow-sm min-h-[32px] px-3" role="button" tabIndex={0} aria-label={`Filter by tag ${tag}`} onClick={e => {
            e.stopPropagation();
            onTagClick(tag);
          }} onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onTagClick(tag);
            }
          }}>
            #{tag}
          </Badge>)}
          {isMobile ? tags.length > 2 && <Badge variant="outline" className="text-xs font-medium min-h-[32px] px-3 cursor-pointer" aria-label={expandedTags ? 'Show less tags' : `${tags.length - 2} more tags`} onClick={e => {
            e.stopPropagation();
            setExpandedTags(!expandedTags);
          }}>
            {expandedTags ? 'Less' : `+${tags.length - 2}`}
          </Badge> : !showAllTags && tags.length > 3 && <Badge variant="outline" className="text-xs font-medium min-h-[32px] px-3" aria-label={`${tags.length - 3} more tags`}>
            +{tags.length - 3}
          </Badge>}
        </div>
      </div>
    </div>
  </div>;
};
