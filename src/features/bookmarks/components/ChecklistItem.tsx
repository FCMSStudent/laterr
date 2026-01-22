import { useState, useRef, useEffect } from 'react';
import { Checkbox } from "@/ui";
import { Button } from "@/ui";
import { X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface ChecklistItemProps {
  id: string;
  content: string;
  checked: boolean;
  onContentChange: (id: string, content: string) => void;
  onCheckedChange: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onEnterPress: (id: string) => void;
  autoFocus?: boolean;
}

export const ChecklistItem = ({
  id,
  content,
  checked,
  onContentChange,
  onCheckedChange,
  onDelete,
  onEnterPress,
  autoFocus = false,
}: ChecklistItemProps) => {
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
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(id, value as boolean)}
        className="h-5 w-5 rounded-md border-2"
      />
      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={(e) => onContentChange(id, e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Add task..."
        className={cn(
          "flex-1 bg-transparent border-none outline-none text-sm py-1",
          "placeholder:text-muted-foreground/50",
          "focus:outline-none focus:ring-0",
          checked && "line-through text-muted-foreground"
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
        aria-label="Delete task"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
