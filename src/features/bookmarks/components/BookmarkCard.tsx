import { Badge } from "@/shared/components/ui/badge";
import { Link2, FileText, Image as ImageIcon, MoreVertical, Trash2, Edit, Play, FileType, ShoppingBag } from "lucide-react";
import type { ItemType } from "@/features/bookmarks/types";
import { AspectRatio } from "@/shared/components/ui/aspect-ratio";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useState, useRef } from "react";
import { isVideoUrl } from "@/features/bookmarks/utils/video-utils";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";

interface BookmarkCardProps {
  id: string;
  type: ItemType;
  title: string;
  previewImageUrl?: string | null;
  content?: string | null;
  tags: string[];
  onClick: () => void;
  onTagClick: (tag: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

// Get content type badge info
const getContentBadge = (type: ItemType, content?: string | null) => {
  if (type === 'url' && content && isVideoUrl(content)) {
    return { label: 'Video', icon: Play };
  }
  switch (type) {
    case 'url':
      return { label: 'Article', icon: Link2 };
    case 'note':
      return { label: 'Note', icon: FileText };
    case 'document':
    case 'file':
      return { label: 'Document', icon: FileType };
    case 'image':
      return { label: 'Image', icon: ImageIcon };
    case 'video':
      return { label: 'Video', icon: Play };
    default:
      return { label: 'Item', icon: FileText };
  }
};

// Get source text from content URL
const getSourceText = (type: ItemType, content?: string | null) => {
  if (type === 'url' && content) {
    try {
      const url = new URL(content);
      const hostname = url.hostname.replace('www.', '');
      
      // Special handling for known video sites
      if (hostname.includes('youtube') || hostname.includes('youtu.be')) {
        return 'YouTube · Video';
      }
      if (hostname.includes('vimeo')) {
        return 'Vimeo · Video';
      }
      
      // Get content type badge
      const badge = getContentBadge(type, content);
      return `${hostname} · ${badge.label}`;
    } catch {
      return 'URL · Link';
    }
  }
  
  const badge = getContentBadge(type, content);
  return badge.label;
};

export const BookmarkCard = ({
  id,
  type,
  title,
  previewImageUrl,
  content,
  tags,
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
  const sourceText = getSourceText(type, content);
  const isVideo = type === 'video' || (type === 'url' && content && isVideoUrl(content));
  const primaryTag = tags.length > 0 ? tags[0] : null;

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

  // Note type cards have no thumbnail - show a styled text card
  const isNoteType = type === 'note';

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe delete action background */}
      {isMobile && onDelete && (
        <div
          className={cn(
            "absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-4 rounded-r-xl transition-opacity duration-200",
            swipeOffset > 0 ? "opacity-100" : "opacity-0"
          )}
          style={{ width: `${Math.max(swipeOffset, 0)}px` }}
        >
          <Trash2 className="h-5 w-5 text-destructive-foreground" />
        </div>
      )}

      {/* Main card */}
      <div
        role="article"
        tabIndex={0}
        aria-label={`${contentBadge.label}: ${title}`}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: isMobile ? `translateX(-${swipeOffset}px)` : undefined
        }}
        className={cn(
          "bg-card border border-border/50 rounded-xl cursor-pointer group overflow-hidden relative",
          "transition-all duration-200 ease-out",
          "hover:shadow-lg hover:-translate-y-0.5 hover:border-border",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
          isSelected && "ring-2 ring-primary bg-primary/5",
          isSelectionMode && !isSelected && "hover:ring-2 hover:ring-primary/50"
        )}
      >
        {/* Selection checkbox */}
        {isSelectionMode && (
          <div 
            className="absolute top-3 left-3 z-20 animate-in zoom-in-50 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={checked => onSelectionChange?.(id, checked as boolean)}
              aria-label={`Select ${title}`}
              className="bg-background/90 backdrop-blur-sm"
            />
          </div>
        )}

        {/* Actions menu */}
        <div 
          className={cn(
            "absolute top-3 right-3 z-20 transition-opacity duration-200",
            isMobile 
              ? showMobileActions ? "opacity-100" : "opacity-0 pointer-events-none"
              : "opacity-0 group-hover:opacity-100"
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full bg-background/90 backdrop-blur-sm hover:bg-background shadow-sm"
                aria-label="Card actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onEdit && (
                <DropdownMenuItem onClick={e => handleMenuAction(e, () => onEdit(id))}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={e => handleMenuAction(e, () => onDelete(id))}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thumbnail section - 60-65% of card height */}
        <div className="relative">
          {isNoteType ? (
            // Note type: warm gradient background with icon
            <AspectRatio ratio={16 / 9}>
              <div className="w-full h-full bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-950/50 dark:to-orange-950/30 flex items-center justify-center">
                <FileText className="h-12 w-12 text-amber-600/50 dark:text-amber-400/40" />
              </div>
            </AspectRatio>
          ) : previewImageUrl && !imageError ? (
            // Image thumbnail
            <AspectRatio ratio={16 / 9}>
              <div className="relative w-full h-full overflow-hidden">
                {!imageLoaded && (
                  <div className="absolute inset-0 z-10">
                    <Skeleton className="w-full h-full" />
                  </div>
                )}
                <img
                  src={previewImageUrl}
                  alt=""
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-300",
                    "group-hover:scale-[1.02]",
                    !imageLoaded && "opacity-0"
                  )}
                  loading="lazy"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => setImageError(true)}
                />
                {/* Bottom gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                
                {/* Video play icon overlay */}
                {isVideo && imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                      <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
                    </div>
                  </div>
                )}
              </div>
            </AspectRatio>
          ) : (
            // Fallback: muted background with icon
            <AspectRatio ratio={16 / 9}>
              <div className="w-full h-full bg-muted/50 flex items-center justify-center">
                <contentBadge.icon className="h-10 w-10 text-muted-foreground/30" />
              </div>
            </AspectRatio>
          )}

          {/* Content type badge - top left corner */}
          <div className="absolute top-3 left-3 z-10">
            <Badge 
              variant="secondary" 
              className="bg-background/90 backdrop-blur-sm text-foreground text-[10px] font-medium px-2 py-0.5 shadow-sm"
            >
              <contentBadge.icon className="h-3 w-3 mr-1" />
              {contentBadge.label}
            </Badge>
          </div>
        </div>

        {/* Text content section */}
        <div className="p-4 space-y-2">
          {/* Title - max 2 lines */}
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 text-foreground">
            {title}
          </h3>

          {/* Source / Content Type - small muted */}
          <p className="text-xs text-muted-foreground truncate">
            {sourceText}
          </p>

          {/* Primary tag - only 1, rounded pill */}
          {primaryTag && (
            <div className="pt-1">
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors text-xs font-medium rounded-full px-2.5 py-0.5"
                onClick={e => {
                  e.stopPropagation();
                  onTagClick(primaryTag);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onTagClick(primaryTag);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                #{primaryTag}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
