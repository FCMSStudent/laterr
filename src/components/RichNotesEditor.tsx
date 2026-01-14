import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChecklistItem } from '@/components/ChecklistItem';
import { 
  CheckSquare, 
  Plus, 
  Type,
  List,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  NotesData, 
  NoteBlock, 
  createTextBlock, 
  createChecklistBlock 
} from '@/types/notes';
import { parseNotes, serializeNotes, getChecklistStats } from '@/lib/notes-parser';

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
  maxLength = 100000,
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
      blocks: [...notesData.blocks, newBlock],
    };
    emitChange(newData);
    setNewChecklistId(newBlock.id);
  }, [notesData, emitChange]);

  // Update checklist content
  const handleChecklistContentChange = useCallback((id: string, content: string) => {
    const newData = {
      ...notesData,
      blocks: notesData.blocks.map(block => 
        block.id === id ? { ...block, content } : block
      ),
    };
    emitChange(newData);
  }, [notesData, emitChange]);

  // Toggle checklist checked state
  const handleChecklistCheckedChange = useCallback((id: string, checked: boolean) => {
    const newData = {
      ...notesData,
      blocks: notesData.blocks.map(block => 
        block.id === id ? { ...block, checked } : block
      ),
    };
    emitChange(newData);
  }, [notesData, emitChange]);

  // Delete checklist item
  const handleDeleteChecklist = useCallback((id: string) => {
    const newData = {
      ...notesData,
      blocks: notesData.blocks.filter(block => block.id !== id),
    };
    emitChange(newData);
  }, [notesData, emitChange]);

  // Handle enter press - add new checklist after current
  const handleChecklistEnterPress = useCallback((id: string) => {
    const index = notesData.blocks.findIndex(b => b.id === id);
    const newBlock = createChecklistBlock('');
    const newBlocks = [...notesData.blocks];
    newBlocks.splice(index + 1, 0, newBlock);
    
    const newData = { ...notesData, blocks: newBlocks };
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
      blocks: newText.trim() ? [textBlock, ...checklistBlocks] : checklistBlocks,
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

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <Button
          type="button"
          variant={showTextEditor ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setShowTextEditor(!showTextEditor)}
          className="h-8 px-3 text-xs"
        >
          <Type className="h-4 w-4 mr-1" />
          Notes
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAddChecklist}
          className="h-8 px-3 text-xs"
        >
          <CheckSquare className="h-4 w-4 mr-1" />
          Add Task
        </Button>
        
        {/* Progress indicator */}
        {hasChecklists && (
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3 w-3" />
            <span>{stats.completed}/{stats.total} tasks</span>
            {stats.total > 0 && (
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(stats.completed / stats.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Text Editor Section */}
      {showTextEditor && (
        <div className="space-y-2">
          <Textarea
            value={textContent}
            onChange={(e) => handleTextContentChange(e.target.value)}
            placeholder={placeholder}
            className="glass-input border-0 min-h-[100px] text-sm leading-relaxed resize-none"
          />
        </div>
      )}

      {/* Checklist Section */}
      {hasChecklists && (
        <div className="space-y-1 bg-muted/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <List className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tasks
            </span>
          </div>
          {checklistItems.map((item) => (
            <ChecklistItem
              key={item.id}
              id={item.id}
              content={item.content}
              checked={item.checked || false}
              onContentChange={handleChecklistContentChange}
              onCheckedChange={handleChecklistCheckedChange}
              onDelete={handleDeleteChecklist}
              onEnterPress={handleChecklistEnterPress}
              autoFocus={item.id === newChecklistId}
            />
          ))}
        </div>
      )}

      {/* Quick add button when no checklists */}
      {!hasChecklists && !showTextEditor && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-3">No notes yet</p>
          <div className="flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTextEditor(true)}
              className="h-9"
            >
              <Type className="h-4 w-4 mr-2" />
              Add Notes
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddChecklist}
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Checklist
            </Button>
          </div>
        </div>
      )}

      {/* Character count */}
      <div className="flex justify-end">
        <p className={cn(
          "text-xs font-medium transition-colors",
          isNearLimit ? "text-destructive" : "text-muted-foreground"
        )}>
          {totalLength.toLocaleString()} / {maxLength.toLocaleString()}
        </p>
      </div>
    </div>
  );
};
