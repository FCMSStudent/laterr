import { Badge } from "@/components/ui/badge";
import { Link2, FileText, Image as ImageIcon, MoreVertical, Trash2, Edit } from "lucide-react";
import type { ItemType } from "@/types";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
interface ItemCardProps {
  id: string;
  type: ItemType;
  title: string;
  summary?: string | null;
  previewImageUrl?: string | null;
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
  return <div role="article" tabIndex={0} aria-label={`${getTypeLabel()}: ${title}${summary ? `. ${summary}` : ''}`} onClick={onClick} onKeyDown={handleKeyDown} onMouseEnter={() => setShowAllTags(true)} onMouseLeave={() => setShowAllTags(false)} className="glass-card rounded-2xl p-7 cursor-pointer hover:scale-[1.02] premium-transition hover:shadow-2xl group overflow-hidden relative focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:outline-none">

      {/* Selection checkbox */}
      {isSelectionMode && <div className="absolute top-4 left-4 z-10" onClick={e => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={checked => onSelectionChange?.(id, checked as boolean)} aria-label={`Select ${title}`} />
        </div>}

      {/* Actions menu */}
      <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 premium-transition">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="rounded-full bg-background/80 hover:bg-background" aria-label="Card actions">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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

      {previewImageUrl ? <AspectRatio ratio={16 / 9} className="mb-6">
          <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted/50">
            <img src={previewImageUrl} alt={title} className="w-full h-full object-cover group-hover:scale-110 premium-transition" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 premium-transition"></div>
          </div>
        </AspectRatio> : <AspectRatio ratio={16 / 9} className="mb-6">
          <div className="flex items-center justify-center w-full h-full rounded-xl bg-muted/30">
            <div className="text-muted-foreground/40">{getIcon()}</div>
          </div>
        </AspectRatio>}
      
      <div className="space-y-4">
        <div className="gap-3 flex-row flex items-start justify-start">
          <div className="mt-1 text-primary/70">{getIcon()}</div>
          <h3 className="font-bold text-base line-clamp-2 flex-1 leading-snug tracking-tight">{title}</h3>
        </div>
        
        {summary && <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{summary}</p>}
        
        {/* Date display */}
        <div className="text-xs text-muted-foreground/70">
          {updatedAt && updatedAt !== createdAt ? <span>Updated {formatDate(updatedAt)}</span> : <span>Created {formatDate(createdAt)}</span>}
        </div>
        
        {/* Tags section with overflow handling */}
        <div className="flex flex-wrap gap-2 pt-2">
          {(showAllTags ? tags : tags.slice(0, 3)).map((tag, index) => <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-accent premium-transition text-xs font-semibold shadow-sm min-h-[44px] inline-flex items-center py-2" role="button" tabIndex={0} aria-label={`Filter by tag ${tag}`} onClick={e => {
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
          {!showAllTags && tags.length > 3 && <Badge variant="outline" className="text-xs font-medium" aria-label={`${tags.length - 3} more tags`}>
              +{tags.length - 3}
            </Badge>}
        </div>
      </div>
    </div>;
};