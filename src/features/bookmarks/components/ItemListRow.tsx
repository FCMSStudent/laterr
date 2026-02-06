import { Badge } from "@/shared/components/ui";
import { Link2, FileText, Image as ImageIcon, MoreVertical, Trash2, Edit, Clock, RotateCcw } from "lucide-react";
import type { ItemType } from "@/features/bookmarks/types";
import { Checkbox } from "@/shared/components/ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/shared/components/ui";
import { Button } from "@/shared/components/ui";
import { Skeleton } from "@/shared/components/ui";
import { formatDistanceToNow } from "date-fns";
import { useState, useRef } from "react";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { cn } from "@/shared/lib/utils";

interface ItemListRowProps {
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

export const ItemListRow = ({
  id,
  type,
  title,
  summary,
  previewImageUrl,
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
}: ItemListRowProps) => {
  const [expandedTags, setExpandedTags] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showMobileActions, setShowMobileActions] = useState(false);
  
  const isMobile = useIsMobile();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
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
    
    if (isMobile && !isSelectionMode) {
      longPressTimerRef.current = setTimeout(() => {
        setShowMobileActions(true);
      }, 500);
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

  const handleRowClick = () => {
    if (isSwiping) return;
    if (showMobileActions) {
      setShowMobileActions(false);
      return;
    }
    onClick();
  };

  const visibleTags = isMobile ? (expandedTags ? tags : tags.slice(0, 2)) : tags.slice(0, 4);
  const hiddenTagCount = isMobile ? tags.length - 2 : tags.length - 4;

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe delete action background */}
      {isMobile && onDelete && !isTrashed && (
        <div 
          className={cn(
            "absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-4 rounded-r-xl premium-transition",
            swipeOffset > 0 ? "opacity-100" : "opacity-0"
          )}
          style={{ width: `${Math.max(swipeOffset, 0)}px` }}
        >
          <Trash2 className="h-5 w-5 text-white" />
        </div>
      )}

      {/* Main row */}
      <div
        role="article"
        tabIndex={0}
        aria-label={`${getTypeLabel()}: ${title}${summary ? `. ${summary}` : ''}`}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ transform: isMobile ? `translateX(-${swipeOffset}px)` : undefined }}
        className={cn(
          "glass-card rounded-xl p-3 md:p-4 cursor-pointer hover:scale-[1.005] premium-transition hover:shadow-lg group overflow-hidden relative focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none flex items-center gap-3 md:gap-4",
          isSelected && "ring-2 ring-primary bg-primary/5 scale-[0.99]",
          isSelectionMode && !isSelected && "hover:ring-2 hover:ring-primary/50"
        )}
      >
        {/* Selection checkbox */}
        {isSelectionMode && (
          <div 
            onClick={e => e.stopPropagation()}
            className="animate-in zoom-in-50 duration-200"
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={checked => onSelectionChange?.(id, checked as boolean)}
              aria-label={`Select ${title}`}
              className={cn(isSelected && "animate-in zoom-in-75 duration-150")}
            />
          </div>
        )}

        {/* Icon or thumbnail */}
        <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden relative">
          {previewImageUrl && !imageError ? (
            <>
              {!imageLoaded && (
                <Skeleton className="absolute inset-0 rounded-lg" />
              )}
              <img
                src={previewImageUrl}
                alt=""
                className={cn(
                  "w-full h-full object-cover",
                  !imageLoaded && "opacity-0"
                )}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            </>
          ) : (
            <div className="text-muted-foreground">{getIcon()}</div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm md:text-base truncate">{title}</h3>
            <Badge variant="outline" className="text-xs flex-shrink-0 hidden sm:flex">
              {getTypeLabel()}
            </Badge>
          </div>
          
          {summary && (
            <p className="text-xs md:text-sm text-muted-foreground truncate">{summary}</p>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 items-center">
            {visibleTags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="cursor-pointer hover:bg-accent premium-transition text-xs"
                role="button"
                tabIndex={0}
                aria-label={`Filter by tag ${tag}`}
                onClick={e => {
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onTagClick(tag);
                  }
                }}
              >
                #{tag}
              </Badge>
            ))}
            {hiddenTagCount > 0 && (
              <Badge
                variant="outline"
                className="text-xs cursor-pointer"
                onClick={e => {
                  e.stopPropagation();
                  if (isMobile) {
                    setExpandedTags(!expandedTags);
                  }
                }}
                aria-label={isMobile ? (expandedTags ? 'Show less tags' : `Show ${hiddenTagCount} more tags`) : `${hiddenTagCount} more tags`}
              >
                {isMobile && expandedTags ? 'Less' : `+${hiddenTagCount}`}
              </Badge>
            )}
          </div>
        </div>


        {/* Date */}
        <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground/70 flex-shrink-0">
          <Clock className="h-3 w-3" />
          <span>{formatDate(updatedAt || createdAt)}</span>
        </div>

        {/* Actions menu */}
        <div className={cn(
          "flex-shrink-0 premium-transition",
          isMobile 
            ? (showMobileActions ? "opacity-100" : "opacity-0 pointer-events-none") 
            : "opacity-100 md:opacity-0 md:group-hover:opacity-100"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
                aria-label="Row actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {!isTrashed && onEdit && (
                <DropdownMenuItem onClick={e => handleMenuAction(e, () => onEdit(id))}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {!isTrashed && onDelete && (
                <DropdownMenuItem
                  onClick={e => handleMenuAction(e, () => onDelete(id))}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Move to Trash
                </DropdownMenuItem>
              )}
              {isTrashed && onRestore && (
                <DropdownMenuItem onClick={e => handleMenuAction(e, () => onRestore(id))}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              )}
              {isTrashed && onPermanentDelete && (
                <DropdownMenuItem
                  onClick={e => handleMenuAction(e, () => onPermanentDelete(id))}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete permanently
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};
