import { Badge } from "@/components/ui/badge";
import { Link2, FileText, Image as ImageIcon } from "lucide-react";
import type { ItemType } from "@/types";

interface ItemCardProps {
  id: string;
  type: ItemType;
  title: string;
  summary?: string | null;
  previewImageUrl?: string | null;
  tags: string[];
  onClick: () => void;
  onTagClick: (tag: string) => void;
}

export const ItemCard = ({ 
  type, 
  title, 
  summary, 
  previewImageUrl, 
  tags,
  onClick,
  onTagClick
}: ItemCardProps) => {
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

  return (
    <div 
      role="article"
      tabIndex={0}
      aria-label={`${getTypeLabel()}: ${title}${summary ? `. ${summary}` : ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="glass-card rounded-2xl p-6 cursor-pointer hover:scale-[1.02] premium-transition hover:shadow-2xl group overflow-hidden"
    >
      {previewImageUrl && (
        <div className="relative w-full h-48 mb-5 rounded-xl overflow-hidden bg-muted/50">
          <img 
            src={previewImageUrl} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 premium-transition"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent opacity-0 group-hover:opacity-100 premium-transition"></div>
        </div>
      )}
      
      <div className="space-y-3.5">
        <div className="flex items-start gap-3">
          <div className="mt-1 text-primary/70">{getIcon()}</div>
          <h3 className="font-bold text-base line-clamp-2 flex-1 leading-snug tracking-tight">{title}</h3>
        </div>
        
        {summary && (
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{summary}</p>
        )}
        
        <div className="flex flex-wrap gap-2 pt-1">
          {tags.slice(0, 3).map((tag, index) => (
            <Badge 
              key={index}
              variant="secondary"
              className="cursor-pointer hover:bg-accent premium-transition text-xs font-semibold shadow-sm"
              role="button"
              tabIndex={0}
              aria-label={`Filter by tag ${tag}`}
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag);
              }}
              onKeyDown={(e) => {
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
          {tags.length > 3 && (
            <Badge variant="outline" className="text-xs font-medium" aria-label={`${tags.length - 3} more tags`}>
              +{tags.length - 3}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};