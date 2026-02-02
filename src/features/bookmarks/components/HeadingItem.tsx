import { useState, useRef, useEffect } from 'react';
import { Button } from "@/shared/components/ui";
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface HeadingItemProps {
  id: string;
  content: string;
  level: 1 | 2 | 3;
  onContentChange: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onEnterPress: (id: string) => void;
  autoFocus?: boolean;
}

export const HeadingItem = ({
  id,
  content,
  level,
  onContentChange,
  onDelete,
  onEnterPress,
  autoFocus = false,
}: HeadingItemProps) => {
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

  const headingClasses = {
    1: 'text-2xl font-bold',
    2: 'text-xl font-semibold',
    3: 'text-lg font-semibold',
  };

  return (
    <div 
      className="flex items-center gap-2 group py-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-center w-8 h-8 flex-shrink-0">
        <span className="text-xs font-mono text-muted-foreground">H{level}</span>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={(e) => onContentChange(id, e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={`Heading ${level}`}
        className={cn(
          "flex-1 bg-transparent border-none outline-none py-1",
          "placeholder:text-muted-foreground/50",
          "focus:outline-none focus:ring-0",
          headingClasses[level]
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
        aria-label="Delete heading"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
