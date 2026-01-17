import { Badge } from "@/shared/components/ui/badge";
import { Link2, FileText, Image as ImageIcon, MoreVertical, Trash2, Edit, Play, FileType, ArrowUpRight } from "lucide-react";
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

// Get content type badge info
const getContentBadge = (type: ItemType, content?: string | null) => {
  if (type === 'url' && content && isVideoUrl(content)) {
    return {
      label: 'Video',
      icon: Play
    };
  }
  switch (type) {
    case 'url':
      return {
        label: 'Article',
        icon: Link2
      };
    case 'note':
      return {
        label: 'Note',
        icon: FileText
      };
    case 'document':
    case 'file':
      return {
        label: 'Document',
        icon: FileType
      };
    case 'image':
      return {
        label: 'Image',
        icon: ImageIcon
      };
    case 'video':
      return {
        label: 'Video',
        icon: Play
      };
    default:
      return {
        label: 'Item',
        icon: FileText
      };
  }
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
  const isVideo = type === 'video' || type === 'url' && content && isVideoUrl(content);
  const isNoteType = type === 'note';
  const dateText = formatDate(createdAt);
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

  // Note type: white card with text overlay
  if (isNoteType) {
    return <div className="relative overflow-hidden rounded-[20px]">
        {/* Swipe delete action background */}
        {isMobile && onDelete && <div className={cn("absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-4 rounded-r-[20px] transition-opacity duration-200", swipeOffset > 0 ? "opacity-100" : "opacity-0")} style={{
        width: `${Math.max(swipeOffset, 0)}px`
      }}>
            <Trash2 className="h-5 w-5 text-destructive-foreground" />
          </div>}

        <div role="article" tabIndex={0} aria-label={`${contentBadge.label}: ${title}`} onClick={handleCardClick} onKeyDown={handleKeyDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{
        transform: isMobile ? `translateX(-${swipeOffset}px)` : undefined
      }} className={cn("bg-card border border-border/30 rounded-[20px] cursor-pointer group overflow-hidden relative", "transition-all duration-200 ease-out", "hover:shadow-xl hover:-translate-y-1", "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", isSelected && "ring-2 ring-primary", isSelectionMode && !isSelected && "hover:ring-2 hover:ring-primary/50")}>
          {/* Selection checkbox */}
          {isSelectionMode && <div className="absolute top-4 right-4 z-20 animate-in zoom-in-50 duration-200" onClick={e => e.stopPropagation()}>
              <Checkbox checked={isSelected} onCheckedChange={checked => onSelectionChange?.(id, checked as boolean)} aria-label={`Select ${title}`} className="bg-background/90" />
            </div>}

          {/* Actions menu */}
          <div className={cn("absolute top-4 right-4 z-20 transition-opacity duration-200", isSelectionMode && "hidden", isMobile ? showMobileActions ? "opacity-100" : "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-muted/80 hover:bg-muted shadow-sm" aria-label="Card actions">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {onEdit && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onEdit(id))}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>}
                {onDelete && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onDelete(id))} className="text-destructive focus:text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AspectRatio ratio={3 / 4}>
            <div className="w-full h-full p-5 flex flex-col justify-between">
              {/* Note content preview */}
              <div className="flex-1 overflow-hidden">
                <p className="text-foreground/80 text-sm leading-relaxed line-clamp-6">
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
              }}>
                  <ArrowUpRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </AspectRatio>
        </div>
      </div>;
  }

  // Image/URL variant - full-bleed image with text overlay
  return <div className="relative overflow-hidden rounded-[20px]">
      {/* Swipe delete action background */}
      {isMobile && onDelete && <div className={cn("absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-4 rounded-r-[20px] transition-opacity duration-200", swipeOffset > 0 ? "opacity-100" : "opacity-0")} style={{
      width: `${Math.max(swipeOffset, 0)}px`
    }}>
          <Trash2 className="h-5 w-5 text-destructive-foreground" />
        </div>}

      <div role="article" tabIndex={0} aria-label={`${contentBadge.label}: ${title}`} onClick={handleCardClick} onKeyDown={handleKeyDown} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{
      transform: isMobile ? `translateX(-${swipeOffset}px)` : undefined
    }} className={cn("rounded-[20px] cursor-pointer group overflow-hidden relative", "transition-all duration-200 ease-out", "hover:shadow-xl hover:-translate-y-1", "focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", isSelected && "ring-2 ring-primary", isSelectionMode && !isSelected && "hover:ring-2 hover:ring-primary/50")}>
        {/* Selection checkbox */}
        {isSelectionMode && <div className="absolute top-4 right-4 z-20 animate-in zoom-in-50 duration-200" onClick={e => e.stopPropagation()}>
            <Checkbox checked={isSelected} onCheckedChange={checked => onSelectionChange?.(id, checked as boolean)} aria-label={`Select ${title}`} className="bg-white/80 backdrop-blur-sm border-white/50" />
          </div>}

        {/* Actions menu */}
        <div className={cn("absolute top-4 right-4 z-20 transition-opacity duration-200", isSelectionMode && "hidden", isMobile ? showMobileActions ? "opacity-100" : "opacity-0 pointer-events-none" : "opacity-0 group-hover:opacity-100")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full bg-black/30 backdrop-blur-md hover:bg-black/50 text-white shadow-sm" aria-label="Card actions">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onEdit && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onEdit(id))}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>}
              {onDelete && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onDelete(id))} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <AspectRatio ratio={3 / 4}>
          {/* Full-bleed image */}
          {previewImageUrl && !imageError ? <>
              {!imageLoaded && <div className="absolute inset-0 z-10">
                  <Skeleton className="w-full h-full rounded-[20px]" />
                </div>}
              <img src={previewImageUrl} alt="" className={cn("w-full h-full object-cover transition-transform duration-300", "group-hover:scale-105", !imageLoaded && "opacity-0")} loading="lazy" onLoad={() => setImageLoaded(true)} onError={() => setImageError(true)} />
            </> :
        // Fallback: gradient background with icon
        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
              <contentBadge.icon className="h-16 w-16 text-muted-foreground/30" />
            </div>}
          
          {/* Strong dark gradient overlay from bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
          
          {/* Content type badge - top left */}
          <Badge className={cn("absolute top-4 left-4 z-10 text-xs font-medium flex items-center gap-1.5 px-2.5 py-1 backdrop-blur-md border-0 text-white bg-[#ec4699]/[0.83]")}>
            <contentBadge.icon className="h-3 w-3" />
            {contentBadge.label}
          </Badge>

          {/* Play button overlay for videos */}
          {isVideo && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="h-6 w-6 text-white fill-white ml-0.5" />
              </div>
            </div>}
          
          {/* Text overlay - bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-5 z-10">
            {/* Title */}
            <h3 className="font-bold text-white text-lg leading-tight line-clamp-2 mb-3">
              {title}
            </h3>
            
            {/* Date and action */}
            <div className="flex items-center justify-between">
              <span className="text-white/70 text-sm">{dateText}</span>
              <span className="text-white text-sm font-medium underline underline-offset-2 opacity-0 group-hover:opacity-100 transition-opacity">
                OPEN
              </span>
            </div>
          </div>
        </AspectRatio>
      </div>
    </div>;
};