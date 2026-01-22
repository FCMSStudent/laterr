import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/ui";
import { Textarea } from "@/ui";
import { ChecklistItem } from './ChecklistItem';
import { CheckSquare, Plus, Type, List, Check } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { NotesData, NoteBlock, createTextBlock, createChecklistBlock } from '../types';
import { parseNotes, serializeNotes, getChecklistStats } from '../utils/notes-parser';
interface RichNotesEditorProps {
  value: string | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}
export const RichNotesEditor = ({
  value,
  onChange,
  placeholder = 'Add your personal notes...',
  className = '',
  maxLength = 100000
}: RichNotesEditorProps) => {
  const [notesData, setNotesData] = useState<NotesData>(() => parseNotes(value));
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [newChecklistId, setNewChecklistId] = useState<string | null>(null);

  // Sync with external value changes
  useEffect(() => {
    const parsed = parseNotes(value);
    setNotesData(parsed);

    // Extract text blocks for text editor
    const textBlocks = parsed.blocks.filter(b => b.type === 'text');
    setTextContent(textBlocks.map(b => b.content).join('\n'));
  }, [value]);

  // Emit changes
  const emitChange = useCallback((data: NotesData) => {
    setNotesData(data);
    onChange(serializeNotes(data));
  }, [onChange]);

  // Add new checklist item
  const handleAddChecklist = useCallback(() => {
    const newBlock = createChecklistBlock('');
    const newData = {
      ...notesData,
      blocks: [...notesData.blocks, newBlock]
    };
    emitChange(newData);
    setNewChecklistId(newBlock.id);
  }, [notesData, emitChange]);

  // Update checklist content
  const handleChecklistContentChange = useCallback((id: string, content: string) => {
    const newData = {
      ...notesData,
      blocks: notesData.blocks.map(block => block.id === id ? {
        ...block,
        content
      } : block)
    };
    emitChange(newData);
  }, [notesData, emitChange]);

  // Toggle checklist checked state
  const handleChecklistCheckedChange = useCallback((id: string, checked: boolean) => {
    const newData = {
      ...notesData,
      blocks: notesData.blocks.map(block => block.id === id ? {
        ...block,
        checked
      } : block)
    };
    emitChange(newData);
  }, [notesData, emitChange]);

  // Delete checklist item
  const handleDeleteChecklist = useCallback((id: string) => {
    const newData = {
      ...notesData,
      blocks: notesData.blocks.filter(block => block.id !== id)
    };
    emitChange(newData);
  }, [notesData, emitChange]);

  // Handle enter press - add new checklist after current
  const handleChecklistEnterPress = useCallback((id: string) => {
    const index = notesData.blocks.findIndex(b => b.id === id);
    const newBlock = createChecklistBlock('');
    const newBlocks = [...notesData.blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    const newData = {
      ...notesData,
      blocks: newBlocks
    };
    emitChange(newData);
    setNewChecklistId(newBlock.id);
  }, [notesData, emitChange]);

  // Handle text content change
  const handleTextContentChange = useCallback((newText: string) => {
    setTextContent(newText);

    // Update text blocks in notesData
    const checklistBlocks = notesData.blocks.filter(b => b.type === 'checklist');
    const textBlock = createTextBlock(newText);
    const newData = {
      ...notesData,
      blocks: newText.trim() ? [textBlock, ...checklistBlocks] : checklistBlocks
    };
    emitChange(newData);
  }, [notesData, emitChange]);

  // Get checklist items
  const checklistItems = notesData.blocks.filter(b => b.type === 'checklist');
  const stats = getChecklistStats(notesData);
  const hasChecklists = checklistItems.length > 0;

  // Calculate total length
  const totalLength = serializeNotes(notesData).length;
  const isNearLimit = totalLength > maxLength * 0.9;
  return <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      

      {/* Text Editor Section */}
      {showTextEditor && <div className="space-y-2">
          <Textarea value={textContent} onChange={e => handleTextContentChange(e.target.value)} placeholder={placeholder} className="glass-input border-0 min-h-[100px] text-sm leading-relaxed resize-none" />
        </div>}

      {/* Checklist Section */}
      {hasChecklists && <div className="space-y-1 bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <List className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tasks
            </span>
          </div>
          {checklistItems.map(item => <ChecklistItem key={item.id} id={item.id} content={item.content} checked={item.checked || false} onContentChange={handleChecklistContentChange} onCheckedChange={handleChecklistCheckedChange} onDelete={handleDeleteChecklist} onEnterPress={handleChecklistEnterPress} autoFocus={item.id === newChecklistId} />)}
        </div>}

      {/* Quick add button when no checklists */}
      {!hasChecklists && !showTextEditor}

      {/* Character count */}
      
    </div>;
};