import { cn } from "@/shared/lib/utils";
import { parseNotes, getChecklistStats } from "@/features/bookmarks/utils/notes-parser";
import { CheckSquare, Square, FileText } from "lucide-react";
import { ChecklistProgress } from "./ChecklistProgress";

interface NotePreviewProps {
  content: string | null | undefined;
  maxLines?: number;
  variant?: 'compact' | 'full';
  showProgress?: boolean;
  className?: string;
}

export const NotePreview = ({
  content,
  maxLines = 4,
  variant = 'compact',
  showProgress = true,
  className,
}: NotePreviewProps) => {
  if (!content) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2",
        className
      )}>
        <FileText className="h-8 w-8" />
        <p className="text-sm text-muted-foreground/60">No notes yet</p>
      </div>
    );
  }

  const notesData = parseNotes(content);
  const stats = getChecklistStats(notesData);
  const hasChecklists = stats.total > 0;

  // For compact mode, limit visible blocks
  const visibleBlocks = variant === 'compact' 
    ? notesData.blocks.slice(0, maxLines)
    : notesData.blocks;

  const hasMore = variant === 'compact' && notesData.blocks.length > maxLines;

  return (
    <div className={cn(
      "flex flex-col h-full",
      "p-4",
      className
    )}>
      {/* Progress indicator at top */}
      {showProgress && hasChecklists && (
        <div className="mb-3">
          <ChecklistProgress completed={stats.completed} total={stats.total} />
        </div>
      )}

      {/* Note content */}
      <div className={cn(
        "space-y-2 flex-1 overflow-hidden",
        variant === 'compact' && "text-sm"
      )}>
        {visibleBlocks.map((block) => {
          switch (block.type) {
            case 'checklist':
              return (
                <div 
                  key={block.id} 
                  className={cn(
                    "flex items-start gap-2",
                    block.checked && "opacity-60"
                  )}
                >
                  {block.checked ? (
                    <CheckSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  ) : (
                    <Square className="h-4 w-4 text-primary/40 shrink-0 mt-0.5" />
                  )}
                  <span className={cn(
                    "leading-snug text-foreground/85",
                    block.checked && "line-through text-foreground/50"
                  )}>
                    {block.content || <span className="text-muted-foreground/50 italic">Empty task</span>}
                  </span>
                </div>
              );

            case 'heading':
              const HeadingTag = `h${block.level || 2}` as keyof JSX.IntrinsicElements;
              return (
                <HeadingTag 
                  key={block.id}
                  className={cn(
                    "font-bold leading-snug text-foreground",
                    block.level === 1 && "text-base",
                    block.level === 2 && "text-sm",
                    block.level === 3 && "text-sm opacity-80"
                  )}
                >
                  {block.content}
                </HeadingTag>
              );

            case 'bullet':
              return (
                <div key={block.id} className="flex items-start gap-2">
                  <span className="text-primary/50 shrink-0">•</span>
                  <span className="leading-snug text-foreground/85">{block.content}</span>
                </div>
              );

            case 'numbered':
              return (
                <div key={block.id} className="flex items-start gap-2">
                  <span className="text-primary/50 shrink-0">-</span>
                  <span className="leading-snug text-foreground/85">{block.content}</span>
                </div>
              );

            case 'text':
            default:
              if (!block.content?.trim()) return null;
              return (
                <p key={block.id} className="leading-snug text-foreground/85">
                  {block.content}
                </p>
              );
          }
        })}

        {/* Truncation indicator */}
        {hasMore && (
          <p className="text-muted-foreground/60 text-xs italic">
            +{notesData.blocks.length - maxLines} more...
          </p>
        )}
      </div>
    </div>
  );
};
