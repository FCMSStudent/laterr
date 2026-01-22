import { useState, useRef, useEffect } from 'react';
import { Button } from "@/ui";
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface BulletItemProps {
  id: string;
  content: string;
  onContentChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onEnterPress: (id: string) => void;
  autoFocus?: boolean;
}

export const BulletItem = ({
  id,
  content,
  onContentChange,
  onDelete,
  onEnterPress,
  autoFocus = false,
}: BulletItemProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnterPress(id);
    } else if (e.key === 'Backspace' && content === '') {
      e.preventDefault();
      onDelete(id);
    }
  };

  return (
    <div 
      className="flex items-center gap-2 group py-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-foreground" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={(e) => onContentChange(id, e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="List item..."
        className={cn(
          "flex-1 bg-transparent border-none outline-none text-sm py-1",
          "placeholder:text-muted-foreground/50",
          "focus:outline-none focus:ring-0"
        )}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(id)}
        className={cn(
          "h-6 w-6 p-0 text-muted-foreground hover:text-destructive transition-opacity",
          isHovered ? "opacity-100" : "opacity-0"
        )}
        aria-label="Delete item"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
