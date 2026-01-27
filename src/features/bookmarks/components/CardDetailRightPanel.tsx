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
const MAX_VISIBLE_TAGS = 3;

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

  return (
    <div className="card-detail-right-panel border-l border-border/30 pl-5">
      {/* ========== HEADER: Title + Metadata ========== */}
      <div className="card-detail-header space-y-1 pb-3">
        <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground line-clamp-2">
          {item.title}
        </h2>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="w-3 h-3 flex-shrink-0" />
          <span>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</span>
          {item.type === "url" && item.content && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/40" />
              <a
                href={item.content}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors truncate max-w-[140px]"
              >
                <Globe className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{safeParseUrl(item.content)?.hostname ?? item.content}</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* ========== PRIMARY ACTIONS: Open + Copy ========== */}
      <div className="card-detail-actions flex gap-2 pb-3">
        {item.content && (
          <Button variant="default" size="sm" asChild className="h-8 flex-1">
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Open</span>
            </a>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onCopyLink}
          className="h-8 flex-1"
        >
          <Link2 className="h-3.5 w-3.5 mr-1" />
          <span className="text-xs font-medium">Copy</span>
        </Button>
      </div>

      {/* ========== SUMMARY: Fixed height ========== */}
      <div className="pb-3">
        <span className="text-[9px] font-semibold tracking-wider uppercase text-muted-foreground/70 block mb-1.5">
          Summary
        </span>
        <div className="card-detail-summary">
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            {item.summary || "No summary available."}
          </p>
        </div>
      </div>

      {/* ========== TAGS: Single row with +N overflow ========== */}
      <div className="pb-3">
        <span className="text-[9px] font-semibold tracking-wider uppercase text-muted-foreground/70 block mb-1.5">
          Tags
        </span>
        <div className="card-detail-tags">
          {/* Add tag button/input */}
          {isAddingTag ? (
            <div className="flex items-center h-5 bg-background border border-primary rounded-full px-2 flex-shrink-0">
              <Input
                ref={tagInputRef}
                value={newTagInput}
                onChange={(e) => onAddTagChange(e.target.value)}
                onKeyDown={handleKeyDownTag}
                onBlur={() => {
                  if (newTagInput.trim()) onAddTagCommit();
                  else onAddTagCancel();
                }}
                className="h-full border-0 p-0 text-[11px] w-14 focus-visible:ring-0 bg-transparent"
                placeholder="Tag..."
              />
            </div>
          ) : (
            <button
              onClick={onAddTagStart}
              className="h-5 px-2 flex items-center gap-0.5 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium rounded-full transition-colors flex-shrink-0"
            >
              <Plus className="w-2.5 h-2.5" />
              Add tag
            </button>
          )}
          
          {/* Visible tags */}
          {visibleTags.map((tag, index) => (
            <div key={`${tag}-${index}`} className="group flex-shrink-0">
              {editingTagIndex === index ? (
                <div className="flex items-center h-5 bg-background border border-primary rounded-full px-2">
                  <Input
                    ref={editTagInputRef}
                    value={editingTagValue}
                    onChange={(e) => onEditTagChange(e.target.value)}
                    onKeyDown={handleKeyDownEditTag}
                    onBlur={onEditTagCancel}
                    className="h-full border-0 p-0 text-[11px] w-16 focus-visible:ring-0 bg-transparent"
                  />
                </div>
              ) : (
                <Badge
                  variant="secondary"
                  onDoubleClick={() => onEditTagStart(index)}
                  className="h-5 px-2 rounded-full text-[11px] font-medium bg-muted/50 hover:bg-muted cursor-default flex items-center gap-0.5"
                >
                  {tag}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveTag(tag);
                    }}
                    className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </Badge>
              )}
            </div>
          ))}
          
          {/* Overflow indicator */}
          {overflowCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 px-2 rounded-full text-[11px] font-medium bg-muted/30 text-muted-foreground flex-shrink-0"
            >
              +{overflowCount}
            </Badge>
          )}
        </div>
      </div>

      {/* ========== NOTES: Fixed height textarea ========== */}
      <div className="pb-3">
        <span className="text-[9px] font-semibold tracking-wider uppercase text-muted-foreground/70 block mb-1.5">
          Notes
        </span>
        <div className="card-detail-notes">
          <Textarea
            ref={notesRef}
            placeholder="Add your notes..."
            value={userNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            onBlur={onNotesSave}
            className="w-full h-full border border-border/30 rounded-md bg-muted/10 p-2.5 focus-visible:ring-1 text-[13px] leading-relaxed placeholder:text-muted-foreground/30"
          />
          <span className="absolute bottom-1.5 right-2.5 text-[9px] text-muted-foreground/30">
            {saving ? "Saving..." : "Autosaved"}
          </span>
        </div>
      </div>

      {/* ========== FOOTER: Delete action - pinned bottom ========== */}
      <div className="card-detail-footer pt-2 flex items-center justify-end border-t border-border/20">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-7 px-2 text-[11px] text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
};
