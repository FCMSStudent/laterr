import React, { useState } from 'react';
import { 
  FileText, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Video, 
  File,
  Play,
  ExternalLink,
  Pencil,
  Trash2
} from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { cn } from '@/shared/lib/utils';
import type { Item } from '../types';
import { NotePreview } from './NotePreview';

interface BookmarkCardProps {
  item: Item;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

// Get content type badge info
const getTypeBadge = (type: string) => {
  switch (type) {
    case 'video':
      return { label: 'Video', icon: Video };
    case 'url':
      return { label: 'Article', icon: LinkIcon };
    case 'note':
      return { label: 'Note', icon: FileText };
    case 'image':
      return { label: 'Image', icon: ImageIcon };
    case 'pdf':
      return { label: 'PDF', icon: File };
    case 'file':
      return { label: 'File', icon: File };
    default:
      return { label: 'Item', icon: File };
  }
};

// Extract source from URL or content
const getSourceLabel = (item: Item): string => {
  if (item.content) {
    try {
      const url = new URL(item.content);
      const hostname = url.hostname.replace('www.', '');
      // Capitalize first letter
      return hostname.charAt(0).toUpperCase() + hostname.slice(1);
    } catch {
      // Not a valid URL
    }
  }
  
  const typeLabels: Record<string, string> = {
    video: 'Video',
    url: 'Link',
    note: 'Note',
    image: 'Image',
    pdf: 'Document',
    file: 'File',
  };
  
  return typeLabels[item.type] || 'Item';
};

// Check if URL is a video platform
const isVideoUrl = (url: string): boolean => {
  return /youtube\.com|youtu\.be|vimeo\.com/.test(url);
};

export const BookmarkCard: React.FC<BookmarkCardProps> = ({
  item,
  onClick,
  onEdit,
  onDelete,
  isSelectionMode = false,
  isSelected = false,
  onSelectionChange,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const typeBadge = getTypeBadge(item.type);
  const TypeIcon = typeBadge.icon;
  const sourceLabel = getSourceLabel(item);
  const isVideo = item.type === 'video' || (item.content && isVideoUrl(item.content));
  const isNote = item.type === 'note';
  const primaryTag = item.tags?.[0];

  const handleCardClick = (e: React.MouseEvent) => {
    if (isSelectionMode) {
      e.preventDefault();
      onSelectionChange?.(!isSelected);
      return;
    }
    onClick();
  };

  const handleQuickAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleCardClick(e as unknown as React.MouseEvent);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative rounded-xl overflow-hidden cursor-pointer",
        "bg-card border border-border/50",
        "transition-all duration-200 ease-out",
        "hover:shadow-lg hover:-translate-y-0.5",
        "focus:outline-none focus:ring-2 focus:ring-primary/50",
        isSelected && "ring-2 ring-primary"
      )}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <div className="absolute top-3 left-3 z-20">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectionChange?.(!!checked)}
            onClick={(e) => e.stopPropagation()}
            className="h-5 w-5 bg-background/90 backdrop-blur-sm border-2"
          />
        </div>
      )}

      {/* Thumbnail Area - 60-65% of card height */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {isNote ? (
          // Note variant: No thumbnail, icon-based card
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
            <div className="p-4 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/60 mb-2" />
              <div className="text-sm text-muted-foreground line-clamp-3 px-2">
                <NotePreview content={item.user_notes || ''} variant="compact" maxLines={2} showProgress={false} />
              </div>
            </div>
          </div>
        ) : item.preview_image_url ? (
          // Has thumbnail
          <>
            <img
              src={item.preview_image_url}
              alt={item.title}
              className={cn(
                "w-full h-full object-cover",
                "transition-transform duration-300 ease-out",
                "group-hover:scale-[1.02]"
              )}
            />
            {/* Bottom gradient overlay for contrast */}
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
          </>
        ) : (
          // Fallback: Icon placeholder
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <TypeIcon className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {/* Type Badge - Top Left */}
        <div className="absolute top-3 right-3 z-10">
          <Badge 
            variant="secondary" 
            className="bg-background/90 backdrop-blur-sm text-xs font-medium shadow-sm"
          >
            <TypeIcon className="h-3 w-3 mr-1" />
            {typeBadge.label}
          </Badge>
        </div>

        {/* Play Icon Overlay for Videos */}
        {isVideo && !isNote && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="h-14 w-14 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <Play className="h-6 w-6 text-foreground ml-1" fill="currentColor" />
            </div>
          </div>
        )}

        {/* Quick Actions on Hover - Top Right of Thumbnail */}
        {!isSelectionMode && isHovered && (
          <div className="absolute top-3 left-3 z-10 flex gap-1.5 animate-fade-in">
            {item.content && (
              <button
                onClick={(e) => handleQuickAction(e, () => window.open(item.content!, '_blank'))}
                className="p-1.5 rounded-md bg-background/90 backdrop-blur-sm hover:bg-background transition-colors shadow-sm"
                title="Open original"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => handleQuickAction(e, onEdit)}
                className="p-1.5 rounded-md bg-background/90 backdrop-blur-sm hover:bg-background transition-colors shadow-sm"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => handleQuickAction(e, onDelete)}
                className="p-1.5 rounded-md bg-background/90 backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Text Content Area */}
      <div className="p-3 space-y-1.5">
        {/* Title - Max 2 lines */}
        <h3 className="font-medium text-sm leading-snug line-clamp-2 text-foreground">
          {item.title}
        </h3>

        {/* Source / Content Type */}
        <p className="text-xs text-muted-foreground truncate">
          {sourceLabel} · {typeBadge.label}
        </p>

        {/* Primary Tag (optional, only 1) */}
        {primaryTag && (
          <div className="pt-1">
            <Badge 
              variant="outline" 
              className="text-xs font-normal px-2 py-0.5 rounded-full"
            >
              {primaryTag}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};
