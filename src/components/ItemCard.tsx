import { Badge } from "@/components/ui/badge";
import { Link2, FileText, Image as ImageIcon } from "lucide-react";

interface ItemCardProps {
  id: string;
  type: 'url' | 'note' | 'image';
  title: string;
  summary?: string;
  previewImageUrl?: string;
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
      case 'url': return <Link2 className="h-4 w-4" />;
      case 'note': return <FileText className="h-4 w-4" />;
      case 'image': return <ImageIcon className="h-4 w-4" />;
    }
  };

  return (
    <div 
      onClick={onClick}
      className="glass-card rounded-2xl p-4 cursor-pointer hover:scale-[1.02] transition-all duration-300 hover:shadow-xl group overflow-hidden"
    >
      {previewImageUrl && (
        <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden">
          <img 
            src={previewImageUrl} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </div>
      )}
      
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="mt-1 text-primary">{getIcon()}</div>
          <h3 className="font-semibold text-lg line-clamp-2 flex-1">{title}</h3>
        </div>
        
        {summary && (
          <p className="text-sm text-muted-foreground line-clamp-2">{summary}</p>
        )}
        
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 3).map((tag, index) => (
            <Badge 
              key={index}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/20 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onTagClick(tag);
              }}
            >
              #{tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline">+{tags.length - 3}</Badge>
          )}
        </div>
      </div>
    </div>
  );
};