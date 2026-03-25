import { forwardRef } from "react";
import { Textarea } from "@/shared/components/ui";
import { cn } from "@/shared/lib/utils";

/** Placeholder shown when the item notes field is empty (desktop + detail drawer). */
export const DETAIL_ITEM_NOTES_PLACEHOLDER = "Add your notes...";

const NOTES_FIELD_ID = "user-notes";

export interface DetailItemNotesFieldProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  saving?: boolean;
  /** Extra classes on the outer wrapper (e.g. drawer spacing). */
  className?: string;
  /** Extra classes on the textarea (e.g. mobile drawer variant). */
  textareaClassName?: string;
}

/**
 * Detail modal Notes field — single implementation for desktop right panel and mobile drawer.
 */
export const DetailItemNotesField = forwardRef<HTMLTextAreaElement, DetailItemNotesFieldProps>(
  function DetailItemNotesField(
    { value, onChange, readOnly = false, saving = false, className, textareaClassName },
    ref,
  ) {
    return (
      <div className={cn("flex-shrink-0 pb-4", className)}>
        <label
          htmlFor={NOTES_FIELD_ID}
          className="block text-xs font-semibold mb-1.5 text-primary-foreground"
        >
          Notes
        </label>
        <Textarea
          id={NOTES_FIELD_ID}
          ref={ref}
          value={value}
          onChange={(e) => {
            if (readOnly) return;
            onChange(e.target.value);
          }}
          placeholder={DETAIL_ITEM_NOTES_PLACEHOLDER}
          readOnly={readOnly}
          className={cn(
            "min-h-[100px] max-h-[100px] resize-none glass-input rounded-xl text-sm leading-relaxed placeholder:text-muted-foreground/50",
            textareaClassName,
          )}
        />
        {saving && !readOnly && (
          <p className="text-xs text-muted-foreground mt-1">Saving...</p>
        )}
      </div>
    );
  },
);
