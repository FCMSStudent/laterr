import { useRef, useMemo } from "react";
import { Button } from "@/ui";
import { Badge } from "@/ui";
import { Input, Textarea } from "@/ui";
import { ExternalLink, Link2, Clock, Globe, Plus, X, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Item } from "@/features/bookmarks/types";

/**
 * Props for the CardDetailRightPanel component.
 * This component renders a unified right-side panel for all card types.
 * 
 * CANONICAL LAYOUT (source of truth: video card):
 * - Header: Title (2-line clamp) + metadata row
 * - Primary Actions: Open + Copy (same size, spacing, order)
 * - Summary: Max 3 lines, truncated, hidden if empty
 * - Notes: Fixed 112px textarea, no resize, autosave indicator (PRIMARY)
 * - Tags: Single row, +N overflow, no wrapping (SECONDARY)
 * - Delete: Pinned bottom-right, low visual weight
 * 
 * BEHAVIOR: Panel is fixed-height and NON-SCROLLABLE.
 * All sections truncate instead of expanding.
 */
interface CardDetailRightPanelProps {
  item: Item;
  userNotes: string;
  onNotesChange: (notes: string) => void;
  tags: string[];
  isAddingTag: boolean;
  newTagInput: string;
  editingTagIndex: number | null;
  editingTagValue: string;
  onAddTagStart: () => void;
  onAddTagChange: (value: string) => void;
  onAddTagCommit: () => void;
  onAddTagCancel: () => void;
  onEditTagStart: (index: number) => void;
  onEditTagChange: (value: string) => void;
  onEditTagCommit: () => void;
  onEditTagCancel: () => void;
  onRemoveTag: (tag: string) => void;
  onCopyLink: () => void;
  onDelete: () => void;
  saving: boolean;
  tagInputRef?: React.RefObject<HTMLInputElement>;
  editTagInputRef?: React.RefObject<HTMLInputElement>;
}

// Maximum visible tags before showing "+N" overflow indicator
const MAX_VISIBLE_TAGS = 4;

/**
 * Safely parse a URL, returning null if invalid.
 */
const safeParseUrl = (value: string | null | undefined) => {
  if (!value) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

/**
 * CardDetailRightPanel - A unified right-side panel for all card detail views.
 * 
 * FIXED LAYOUT - matches video card exactly:
 * 1. Header: Title (2-line clamp) + metadata
 * 2. Actions: Open + Copy buttons (same size/spacing)
 * 3. Summary: Max 3 lines, truncated, hidden if empty
 * 4. Notes: Fixed 112px textarea with autosave indicator (PRIMARY)
 * 5. Tags: Single row with +N overflow (SECONDARY)
 * 6. Delete: Pinned bottom-right
 * 
 * ALL sections use flex-shrink-0 to prevent layout shifts.
 */
export const CardDetailRightPanel = ({
  item,
  userNotes,
  onNotesChange,
  tags,
  isAddingTag,
  newTagInput,
  editingTagIndex,
  editingTagValue,
  onAddTagStart,
  onAddTagChange,
  onAddTagCommit,
  onAddTagCancel,
  onEditTagStart,
  onEditTagChange,
  onEditTagCommit,
  onEditTagCancel,
  onRemoveTag,
  onCopyLink,
  onDelete,
  saving,
  tagInputRef,
  editTagInputRef
}: CardDetailRightPanelProps) => {
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Calculate visible tags and overflow count
  const {
    visibleTags,
    overflowCount
  } = useMemo(() => {
    if (tags.length <= MAX_VISIBLE_TAGS) {
      return {
        visibleTags: tags,
        overflowCount: 0
      };
    }
    return {
      visibleTags: tags.slice(0, MAX_VISIBLE_TAGS),
      overflowCount: tags.length - MAX_VISIBLE_TAGS
    };
  }, [tags]);
  const handleKeyDownTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onAddTagCommit();
    } else if (e.key === "Escape") {
      onAddTagCancel();
    }
  };
  const handleKeyDownEditTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onEditTagCommit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onEditTagCancel();
    }
  };
  const summaryText = item.summary?.trim();
  return <div className="card-detail-right-panel pl-6 pr-2 flex flex-col h-full max-h-full overflow-hidden bg-transparent">
    {/* ========== TITLE: Prominent, larger font ========== */}
    <div className="flex-shrink-0 pt-4 pb-3">
      <h2 className="text-lg font-bold leading-tight tracking-tight line-clamp-2 text-primary-foreground" title={item.title}>
        {item.title}
      </h2>
    </div>

    {/* ========== ACTION BAR: Side-by-side buttons ========== */}
    <div className="flex-shrink-0 pb-4">
      <div className="flex gap-2">
        {item.content && <Button variant="secondary" size="sm" asChild className="h-8 grow basis-0 text-xs font-medium bg-secondary/50 hover:bg-secondary/80" aria-label={item.type === 'url' ? 'Visit page in new tab' : 'Open original file in new tab'}>
          <a href={item.content} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5" title={item.type === 'url' ? 'Visit page' : 'Open original file'}>
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{item.type === 'url' ? 'Visit' : 'Open'}</span>
          </a>
        </Button>}
        <Button variant="secondary" size="sm" onClick={onCopyLink} className="h-8 grow basis-0 text-xs font-medium bg-secondary/50 hover:bg-secondary/80" aria-label="Copy link to clipboard" title="Copy link">
          <Link2 className="h-3.5 w-3.5 mr-1.5" />
          <span>Copy</span>
        </Button>
      </div>
    </div>

    {/* ========== TL;DR: Pink accent label ========== */}
    {summaryText && <div className="flex-shrink-0 pb-4">
      <h3 className="text-xs font-semibold mb-1.5 text-primary-foreground">
        TL;DR
      </h3>
      <p className="text-sm leading-relaxed line-clamp-3 text-primary-foreground text-left font-normal">
        {summaryText}
      </p>
    </div>}

    {/* ========== METADATA: Subtle, low-contrast ========== */}
    <div className="flex-shrink-0 pb-4">
      <div className="flex items-center gap-1.5 text-[11px] text-primary-foreground">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{formatDistanceToNow(new Date(item.created_at), {
            addSuffix: true
          })}</span>
        {item.type === "url" && item.content && <>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <a href={item.content} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[120px]">
            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{safeParseUrl(item.content)?.hostname ?? item.content}</span>
          </a>
        </>}
      </div>
    </div>

    {/* ========== NOTES: PRIMARY workspace - glass card appearance ========== */}
    <div className="flex-shrink-0 pb-4">
      <label htmlFor="user-notes" className="block text-xs font-semibold mb-1.5 text-primary-foreground">
        Notes
      </label>
      <Textarea id="user-notes" ref={notesRef} value={userNotes} onChange={e => onNotesChange(e.target.value)} placeholder="Add your notes..." className="min-h-[100px] max-h-[100px] resize-none bg-white/40 dark:bg-white/10 backdrop-blur-sm border-white/20 dark:border-white/10 rounded-xl text-sm leading-relaxed placeholder:text-muted-foreground/50 focus:border-white/30 focus:ring-white/20" />
      {saving && <p className="text-xs text-muted-foreground mt-1">Saving...</p>}
    </div>


    {/* ========== TAGS: Pink accent label ========== */}
    <div className="flex-shrink-0 pb-4">
      <h3 className="text-xs font-semibold mb-1.5 text-primary-foreground">
        Tags
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {/* Visible tags */}
        {visibleTags.map((tag, index) => <div key={`${tag}-${index}`} className="group flex-shrink-0">
          {editingTagIndex === index ? <div className="flex items-center h-6 bg-background border border-primary rounded-full px-3">
            <Input ref={editTagInputRef} value={editingTagValue} onChange={e => onEditTagChange(e.target.value)} onKeyDown={handleKeyDownEditTag} onBlur={(e) => {
              // Use setTimeout to allow the focus event to complete first
              // This prevents stealing focus from the notes textarea
              setTimeout(() => {
                onEditTagCancel();
              }, 100);
            }} className="h-full border-0 p-0 text-xs w-20 focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground/60" />
          </div> : <Badge variant="secondary" onDoubleClick={() => onEditTagStart(index)} className="h-6 px-3 rounded-full text-xs font-normal bg-secondary/60 hover:bg-secondary/80 cursor-default flex items-center gap-1.5 border-0">
            {tag}
            <button onClick={e => {
              e.stopPropagation();
              onRemoveTag(tag);
            }} className="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity" aria-label={`Remove ${tag} tag`}>
              <X className="w-3 h-3" />
            </button>
          </Badge>}
        </div>)}

        {/* Overflow indicator */}
        {overflowCount > 0 && <Badge variant="secondary" className="h-6 px-3 rounded-full text-xs font-normal bg-secondary/40 text-muted-foreground border-0 flex-shrink-0">
          +{overflowCount}
        </Badge>}

        {/* Add tag button/input - styled like a pill */}
        {isAddingTag ? <div className="flex items-center h-6 bg-background border border-primary rounded-full px-3 flex-shrink-0">
          <Input ref={tagInputRef} value={newTagInput} onChange={e => onAddTagChange(e.target.value)} onKeyDown={handleKeyDownTag} onBlur={(e) => {
            // Use setTimeout to allow the focus event to complete first
            // This prevents stealing focus from the notes textarea
            setTimeout(() => {
              if (newTagInput.trim()) onAddTagCommit();else onAddTagCancel();
            }, 100);
          }} className="h-full border-0 p-0 text-xs w-20 focus-visible:ring-0 bg-transparent text-foreground placeholder:text-muted-foreground/60" placeholder="Tag name" />
        </div> : <button onClick={onAddTagStart} className="h-6 px-3 flex items-center gap-1 bg-secondary/40 hover:bg-secondary/60 text-muted-foreground hover:text-foreground text-xs font-normal rounded-full transition-colors flex-shrink-0 border-0" title="Add new tag" aria-label="Add new tag">
          <Plus className="w-3 h-3" />
          Add
        </button>}
      </div>
    </div>

    {/* Spacer to push footer to bottom */}
    <div className="flex-1" />

    {/* ========== FOOTER: Delete centered with pink styling ========== */}
    <div className="flex-shrink-0 pt-3 pb-2 flex items-center justify-center">
      <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 text-xs font-medium hover:bg-destructive/5 text-primary-foreground px-[16px]">
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>
    </div>
  </div>;
};