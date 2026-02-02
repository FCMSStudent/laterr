import { useState, useRef, useEffect } from 'react';
import { Button } from "@/shared/components/ui";
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface NumberedItemProps {
  id: string;
  content: string;
  index: number;
  onContentChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onEnterPress: (id: string) => void;
  autoFocus?: boolean;
}

export const NumberedItem = ({
  id,
  content,
  index,
  onContentChange,
  onDelete,
  onEnterPress,
  autoFocus = false,
}: NumberedItemProps) => {
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
        <span className="text-sm text-muted-foreground font-medium">{index}.</span>
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
