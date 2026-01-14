import { Badge } from "@/components/ui/badge";
import { Link2, FileText, Image as ImageIcon, MoreVertical, Trash2, Edit, Play } from "lucide-react";
import type { ItemType } from "@/types";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { isVideoUrl } from "@/lib/video-utils";
import { NotePreview } from "@/components/NotePreview";
import { parseNotes, getChecklistStats } from "@/lib/notes-parser";
import { ChecklistProgress } from "@/components/ChecklistProgress";
import { useIsMobile } from "@/hooks/use-mobile";
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
  isBookmarked?: boolean;
  onBookmarkToggle?: (id: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
  onDelete?: (id: string) => void;
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
  onEdit
}: ItemCardProps) => {
  const [showAllTags, setShowAllTags] = useState(false);
  const [expandedTags, setExpandedTags] = useState(false);
  const isMobile = useIsMobile();
  
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
  return <div role="article" tabIndex={0} aria-label={`${getTypeLabel()}: ${title}${summary ? `. ${summary}` : ''}`} onClick={onClick} onKeyDown={handleKeyDown} onMouseEnter={() => setShowAllTags(true)} onMouseLeave={() => setShowAllTags(false)} className="glass-card rounded-2xl p-5 md:p-7 cursor-pointer hover:scale-[1.02] premium-transition hover:shadow-2xl group overflow-hidden relative focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none min-h-[280px] md:min-h-[320px]">

      {/* Selection checkbox */}
      {isSelectionMode && <div className="absolute top-4 left-4 z-10" onClick={e => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={checked => onSelectionChange?.(id, checked as boolean)} aria-label={`Select ${title}`} />
        </div>}

      {/* Actions menu */}
      <div className="absolute top-4 right-4 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 premium-transition">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-10 w-10 md:h-8 md:w-8 p-0 rounded-full bg-background/80 hover:bg-background min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0" aria-label="Card actions">
              <MoreVertical className="h-5 w-5 md:h-4 md:w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onEdit && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onEdit(id))} className="min-h-[44px] md:min-h-0 text-base md:text-sm">
                <Edit className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                Edit
              </DropdownMenuItem>}
            {onDelete && <DropdownMenuItem onClick={e => handleMenuAction(e, () => onDelete(id))} className="text-destructive focus:text-destructive min-h-[44px] md:min-h-0 text-base md:text-sm">
                <Trash2 className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                Delete
              </DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Note type: show note preview */}
      {type === 'note' && content ? (
        <AspectRatio ratio={16 / 9} className="mb-4 md:mb-6">
          <div className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/30 dark:border-amber-800/20">
            <NotePreview 
              content={content} 
              maxLines={4} 
              variant="compact" 
              showProgress={true}
            />
          </div>
        </AspectRatio>
      ) : previewImageUrl ? (
        <AspectRatio ratio={16 / 9} className="mb-4 md:mb-6">
          <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted/50">
            <img src={previewImageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-110 premium-transition" loading="lazy" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 premium-transition"></div>
            {/* Video play icon overlay */}
            {content && isVideoUrl(content) && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center group-hover:scale-110 premium-transition">
                  <Play className="h-5 w-5 text-white ml-0.5" fill="currentColor" />
                </div>
              </div>
            )}
          </div>
        </AspectRatio>
      ) : (
        <AspectRatio ratio={16 / 9} className="mb-4 md:mb-6">
          <div className="flex items-center justify-center w-full h-full rounded-xl bg-muted/30">
            <div className="text-muted-foreground/40">{getIcon()}</div>
          </div>
        </AspectRatio>
      )}
      
      <div className="space-y-3 md:space-y-4">
        <div className="gap-3 flex-row flex items-start justify-start">
          <div className="mt-1 text-primary/70">{getIcon()}</div>
          <h3 className="font-bold text-sm md:text-base line-clamp-2 flex-1 leading-snug tracking-tight">{title}</h3>
        </div>
        
        {summary && <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">{summary}</p>}
        
        {/* Date display */}
        <div className="text-xs text-muted-foreground/70">
          {updatedAt && updatedAt !== createdAt ? <span>Updated {formatDate(updatedAt)}</span> : <span>Created {formatDate(createdAt)}</span>}
        </div>
        
        {/* Tags section with overflow handling - mobile tap to expand */}
        <div className="flex flex-wrap gap-2 pt-2">
          {(isMobile ? (expandedTags ? tags : tags.slice(0, 2)) : (showAllTags ? tags : tags.slice(0, 3))).map((tag, index) => (
            <Badge 
              key={index} 
              variant="secondary" 
              className="cursor-pointer hover:bg-accent premium-transition text-xs font-semibold shadow-sm min-h-[32px] px-3" 
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
          {isMobile ? (
            tags.length > 2 && (
              <Badge 
                variant="outline" 
                className="text-xs font-medium min-h-[32px] px-3 cursor-pointer" 
                aria-label={expandedTags ? 'Show less tags' : `${tags.length - 2} more tags`}
                onClick={e => {
                  e.stopPropagation();
                  setExpandedTags(!expandedTags);
                }}
              >
                {expandedTags ? 'Less' : `+${tags.length - 2}`}
              </Badge>
            )
          ) : (
            !showAllTags && tags.length > 3 && (
              <Badge variant="outline" className="text-xs font-medium min-h-[32px] px-3" aria-label={`${tags.length - 3} more tags`}>
                +{tags.length - 3}
              </Badge>
            )
          )}
        </div>
      </div>
    </div>;
};