import { Badge } from "@/components/ui/badge";
import { Link2, FileText, Image as ImageIcon, MoreVertical, Trash2, Edit, Play, Clock } from "lucide-react";
import type { ItemType } from "@/types";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  isBookmarked?: boolean;
  onBookmarkToggle?: (id: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
  onDelete?: (id: string) => void;
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
  onEdit
}: ItemListRowProps) => {
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

  const visibleTags = isMobile ? (expandedTags ? tags : tags.slice(0, 2)) : tags.slice(0, 4);
  const hiddenTagCount = isMobile ? tags.length - 2 : tags.length - 4;

  return (
    <div
      role="article"
      tabIndex={0}
      aria-label={`${getTypeLabel()}: ${title}${summary ? `. ${summary}` : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="glass-card rounded-xl p-3 md:p-4 cursor-pointer hover:scale-[1.005] premium-transition hover:shadow-lg group overflow-hidden relative focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none flex items-center gap-3 md:gap-4"
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={isSelected}
            onCheckedChange={checked => onSelectionChange?.(id, checked as boolean)}
            aria-label={`Select ${title}`}
          />
        </div>
      )}

      {/* Icon or thumbnail */}
      <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-lg bg-muted/50 flex items-center justify-center overflow-hidden">
        {previewImageUrl ? (
          <img
            src={previewImageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
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
      <div className="flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 premium-transition"
              aria-label="Row actions"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
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
    </div>
  );
};
