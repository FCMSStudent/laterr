import { useRef, useMemo, useState } from "react";
import { Button } from "@/ui";
import { Badge } from "@/ui";
import { Input, Textarea } from "@/ui";
import { ExternalLink, Link2, Clock, Globe, Plus, X, Trash2, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Item } from "@/features/bookmarks/types";

/**
 * Props for the CardDetailRightPanel component.
 * This component renders a unified right-side panel for all card types.
 * 
 * CANONICAL LAYOUT (source of truth: video card):
 * - Header: Title (2-line clamp) + metadata row
 * - Primary Actions: Open + Copy (same size, spacing, order)
 * - Summary: Fixed 120px height with fade-out gradient
 * - Tags: Single row, +N overflow, no wrapping
 * - Notes: Fixed 112px textarea, no resize, autosave indicator
 * - Delete: Pinned bottom-right, low visual weight
 * 
 * BEHAVIOR: Panel is fixed-height and NON-SCROLLABLE.
 * All sections truncate instead of expanding.
 */
interface CardDetailRightPanelProps {
  item: Item;
  userNotes: string;
  onNotesChange: (notes: string) => void;
  onNotesSave: () => void;
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
 * 3. Summary: Fixed 120px height with fade-out gradient
 * 4. Tags: Single row with +N overflow
 * 5. Notes: Fixed 112px textarea with autosave indicator
 * 6. Delete: Pinned bottom-right
 * 
 * ALL sections use flex-shrink-0 to prevent layout shifts.
 */
export const CardDetailRightPanel = ({
  item,
  userNotes,
  onNotesChange,
  onNotesSave,
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
  editTagInputRef,
}: CardDetailRightPanelProps) => {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);

  // Calculate visible tags and overflow count
  const { visibleTags, overflowCount } = useMemo(() => {
    if (tags.length <= MAX_VISIBLE_TAGS) {
      return { visibleTags: tags, overflowCount: 0 };
    }
    return {
      visibleTags: tags.slice(0, MAX_VISIBLE_TAGS),
      overflowCount: tags.length - MAX_VISIBLE_TAGS,
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

  // Check if summary needs truncation
  const summaryWordCount = item.summary ? item.summary.split(' ').length : 0;
  const shouldShowToggle = summaryWordCount > 40;

  return (
    <div className="card-detail-right-panel border-l border-border/30 pl-6 pr-2 flex flex-col h-full">
      {/* ========== TITLE: Prominent, single-line with tooltip ========== */}
      <div className="flex-shrink-0 pb-4 border-b border-border/10">
        <h2
          className="text-base font-semibold leading-tight tracking-tight text-foreground line-clamp-1"
          title={item.title}
        >
          {item.title}
        </h2>
      </div>

      {/* ========== ACTION BAR: Compact, balanced visual weight ========== */}
      <div className="flex-shrink-0 pt-2 pb-4 border-b border-border/10">
        <div className="flex gap-2">
          {item.content && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-7 flex-1 text-xs font-normal text-foreground/70 hover:text-foreground hover:bg-accent/50"
              aria-label={item.type === 'url' ? 'Visit page in new tab' : 'Open original file in new tab'}
            >
              <a
                href={item.content}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5"
                title={item.type === 'url' ? 'Visit page' : 'Open original file'}
              >
                <ExternalLink className="h-3 w-3" />
                <span>{item.type === 'url' ? 'Visit' : 'Open'}</span>
              </a>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopyLink}
            className="h-7 flex-1 text-xs font-normal text-foreground/70 hover:text-foreground hover:bg-accent/50"
            aria-label="Copy link to clipboard"
            title="Copy link"
          >
            <Link2 className="h-3 w-3 mr-1.5" />
            <span>Copy</span>
          </Button>
        </div>
      </div>

      {/* ========== METADATA: Subtle, low-contrast ========== */}
      <div className="flex-shrink-0 pt-3 pb-5 border-b border-border/10">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
          {item.type === "url" && item.content && (
            <>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <a
                href={item.content}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[120px]"
              >
                <Globe className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{safeParseUrl(item.content)?.hostname ?? item.content}</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* ========== SUMMARY: Clamp with toggle + scrollable when expanded ========== */}
      <div className="flex-shrink-0 pt-5 pb-5 border-b border-border/10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold text-foreground/90">
            Summary
          </h3>
          {shouldShowToggle && (
            <button
              onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              aria-label={isSummaryExpanded ? "Show less" : "Show more"}
            >
              {isSummaryExpanded ? "Less" : "More"}
              <ChevronDown className={`w-3 h-3 transition-transform ${isSummaryExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        <div className={`${isSummaryExpanded ? 'max-h-32 overflow-y-auto pr-2' : ''}`}>
          <p className={`text-sm text-muted-foreground leading-relaxed ${!isSummaryExpanded ? 'line-clamp-3' : ''}`}>
            {item.summary || "No summary available."}
          </p>
        </div>
      </div>

      {/* ========== TAGS: Grouped container with inline "+ Add tag" ========== */}
      <div className="flex-shrink-0 pt-5 pb-5 border-b border-border/10">
        <h3 className="text-xs font-semibold text-foreground/90 block mb-2.5">
          Tags
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {/* Visible tags */}
          {visibleTags.map((tag, index) => (
            <div key={`${tag}-${index}`} className="group flex-shrink-0">
              {editingTagIndex === index ? (
                <div className="flex items-center h-6 bg-background border border-primary rounded-md px-2.5">
                  <Input
                    ref={editTagInputRef}
                    value={editingTagValue}
                    onChange={(e) => onEditTagChange(e.target.value)}
                    onKeyDown={handleKeyDownEditTag}
                    onBlur={onEditTagCancel}
                    className="h-full border-0 p-0 text-xs w-20 focus-visible:ring-0 bg-transparent"
                  />
                </div>
              ) : (
                <Badge
                  variant="secondary"
                  onDoubleClick={() => onEditTagStart(index)}
                  className="h-6 px-2.5 rounded-md text-xs font-normal bg-secondary/50 hover:bg-secondary cursor-default flex items-center gap-1.5 border-0"
                >
                  {tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTag(tag);
                    }}
                    className="w-3 h-3 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                    aria-label={`Remove ${tag} tag`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          ))}

          {/* Overflow indicator */}
          {overflowCount > 0 && (
            <Badge
              variant="secondary"
              className="h-6 px-2.5 rounded-md text-xs font-normal bg-secondary/30 text-muted-foreground border-0 flex-shrink-0"
            >
              +{overflowCount}
            </Badge>
          )}

          {/* Add tag button/input - styled like a tag */}
          {isAddingTag ? (
            <div className="flex items-center h-6 bg-background border border-primary rounded-md px-2.5 flex-shrink-0">
              <Input
                ref={tagInputRef}
                value={newTagInput}
                onChange={(e) => onAddTagChange(e.target.value)}
                onKeyDown={handleKeyDownTag}
                onBlur={() => {
                  if (newTagInput.trim()) onAddTagCommit();
                  else onAddTagCancel();
                }}
                className="h-full border-0 p-0 text-xs w-20 focus-visible:ring-0 bg-transparent"
                placeholder="Tag name"
              />
            </div>
          ) : (
            <button
              onClick={onAddTagStart}
              className="h-6 px-2.5 flex items-center gap-1 bg-secondary/30 hover:bg-secondary/50 text-muted-foreground hover:text-foreground text-xs font-normal rounded-md transition-colors flex-shrink-0 border-0"
              title="Add new tag"
              aria-label="Add new tag"
            >
              <Plus className="w-3 h-3" />
              Add
            </button>
          )}
        </div>
      </div>

      {/* ========== NOTES: Lightweight workspace with clear affordance ========== */}
      <div className="flex-1 pt-5 pb-5 flex flex-col min-h-0">
        <h3 className="text-xs font-semibold text-foreground/90 block mb-2.5">
          Notes
        </h3>
        <div className="relative flex-1 min-h-0">
          <Textarea
            ref={notesRef}
            placeholder="Notes are saved automatically..."
            value={userNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            onBlur={onNotesSave}
            className="w-full h-full min-h-[120px] border-0 rounded-md bg-muted/20 p-3 focus-visible:ring-1 focus-visible:ring-border focus-visible:bg-background/50 text-sm leading-relaxed placeholder:text-muted-foreground/50 resize-none transition-all"
            aria-label="Notes"
          />
          {saving && (
            <span className="absolute bottom-3 right-3 text-xs font-medium text-muted-foreground/60">
              Saving...
            </span>
          )}
        </div>
      </div>

      {/* ========== FOOTER: Delete action - low visual weight ========== */}
      <div className="flex-shrink-0 pt-4 border-t border-border/10 flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 px-3 text-xs font-normal text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete
        </Button>
      </div>
    </div>
  );
};
