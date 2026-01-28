import { Badge } from "@/ui";
import { Link2, FileText, Image as ImageIcon, MoreVertical, Trash2, Edit, Play, FileType, Calendar } from "lucide-react";
import type { ItemType } from "@/features/bookmarks/types";
import { AspectRatio } from "@/ui";
import { Checkbox } from "@/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui";
import { Button } from "@/ui";
import { Skeleton } from "@/ui";
import { useState, useRef } from "react";
import { isVideoUrl } from "@/features/bookmarks/utils/video-utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
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
  onEdit?: (id: string) => void;
}

// Content type color mapping (matching Health module pattern)
const BOOKMARK_COLORS: Record<ItemType, string> = {
  url: 'border-l-primary',
  video: 'border-l-red-500',
  note: 'border-l-amber-500',
  document: 'border-l-blue-500',
  image: 'border-l-green-500',
  file: 'border-l-purple-500',
};

// Get content type badge info
const getContentBadge = (type: ItemType, content?: string | null) => {
  if (type === 'url' && content && isVideoUrl(content)) {
    return { label: 'Video', icon: Play, color: 'border-l-red-500' };
  }
  switch (type) {
    case 'url':
      return { label: 'Article', icon: Link2, color: BOOKMARK_COLORS.url };
    case 'note':
      return { label: 'Note', icon: FileText, color: BOOKMARK_COLORS.note };
    case 'document':
    case 'file':
      return { label: 'Document', icon: FileType, color: BOOKMARK_COLORS.document };
    case 'image':
      return { label: 'Image', icon: ImageIcon, color: BOOKMARK_COLORS.image };
    case 'video':
      return { label: 'Video', icon: Play, color: BOOKMARK_COLORS.video };
    default:
      return { label: 'Item', icon: FileText, color: 'border-l-muted' };
  }
};

// Format date for display
const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
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
  
  const contentBadge = getContentBadge(type, content);
  const isVideo = type === 'video' || (type === 'url' && content && isVideoUrl(content));
  const dateText = formatDate(createdAt);
  const borderColor = isVideo ? 'border-l-red-500' : contentBadge.color;
  const Icon = contentBadge.icon;

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
    if (isMobile && onDelete && !isSelectionMode) {
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
    if (swipeOffset > SWIPE_THRESHOLD && onDelete) {
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

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Swipe delete action background */}
      {isMobile && onDelete && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-4 rounded-r-2xl transition-opacity duration-200",
            swipeOffset > 0 ? "opacity-100" : "opacity-0"
          )}
          style={{ width: `${Math.max(swipeOffset, 0)}px` }}
        >
          <Trash2 className="h-5 w-5 text-destructive-foreground" />
        </div>
      )}

      <div
        role="article"
        tabIndex={0}
        aria-label={`${contentBadge.label}: ${title}`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: isMobile ? `translateX(-${swipeOffset}px)` : undefined }}
        className={cn(
          `glass-card rounded-2xl p-6 cursor-pointer hover:scale-[1.02] premium-transition hover:shadow-2xl group overflow-hidden relative border-l-4`,
          borderColor,
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
          isSelected && "ring-2 ring-primary",
          isSelectionMode && !isSelected && "hover:ring-2 hover:ring-primary/50"
        )}
      >
        {/* Selection checkbox */}
        {isSelectionMode && (
          <div
            className="absolute top-4 right-4 z-20 animate-in zoom-in-50 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange?.(id, checked as boolean)}
              aria-label={`Select ${title}`}
              className="bg-background/90"
            />
          </div>
        )}

        {/* Actions menu */}
        <div
          className={cn(
            "absolute top-4 right-4 z-10 premium-transition",
            isSelectionMode && "hidden",
            isMobile
              ? showMobileActions ? "opacity-100" : "opacity-0 pointer-events-none"
              : "opacity-0 group-hover:opacity-100"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full bg-background/80 hover:bg-background"
                aria-label="Card actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onEdit && (
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onEdit(id))}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => handleMenuAction(e, () => onDelete(id))}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Preview thumbnail */}
        <AspectRatio ratio={16 / 9} className="mb-4">
          <div className="flex items-center justify-center w-full h-full rounded-xl bg-muted/30 overflow-hidden">
            {previewImageUrl && !imageError ? (
              <>
                {!imageLoaded && (
                  <Skeleton className="absolute inset-0 w-full h-full rounded-xl" />
                )}
                <img
                  src={previewImageUrl}
                  alt=""
                  className={cn(
                    "w-full h-full object-cover",
                    imageLoaded ? "opacity-100" : "opacity-0"
                  )}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
                {/* Play button overlay for videos */}
                {isVideo && imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted-foreground/40 scale-150">
                <Icon className="h-5 w-5" />
              </div>
            )}
          </div>
        </AspectRatio>

        <div className="space-y-3">
          {/* Header with icon and type */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium text-muted-foreground">
              {contentBadge.label}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-bold text-base line-clamp-2 leading-snug tracking-tight">
            {title}
          </h3>

          {/* Date */}
          {dateText && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{dateText}</span>
            </div>
          )}

          {/* Summary preview */}
          {summary && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {summary}
            </p>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {tags.slice(0, 3).map((tag, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs cursor-pointer hover:bg-secondary/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTagClick(tag);
                  }}
                >
                  #{tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
