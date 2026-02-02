import { useState, useCallback, useEffect } from 'react';
import { Button } from "@/shared/components/ui";
import { ChecklistItem } from './ChecklistItem';
import { BulletItem } from './BulletItem';
import { NumberedItem } from './NumberedItem';
import { HeadingItem } from './HeadingItem';
import {
  CheckSquare,
  Plus,
  Type,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
  NotesData,
  NoteBlock,
  createTextBlock,
  createChecklistBlock,
  createBulletBlock,
  createNumberedBlock,
  createHeadingBlock
} from '../types';
import { parseNotes, serializeNotes } from '../utils/notes-parser';

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
  placeholder = 'Type / for commands...',
  className = '',
  maxLength = 100000
}: RichNotesEditorProps) => {
  const [notesData, setNotesData] = useState<NotesData>(() => parseNotes(value));
  const [newBlockId, setNewBlockId] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // Sync with external value changes
  useEffect(() => {
    const parsed = parseNotes(value);
    setNotesData(parsed);
  }, [value]);

  // Emit changes
  const emitChange = useCallback((data: NotesData) => {
    setNotesData(data);
    onChange(serializeNotes(data));
  }, [onChange]);

  // Add new block
  const handleAddBlock = useCallback((type: NoteBlock['type'], level?: 1 | 2 | 3) => {
    let newBlock: NoteBlock;

    switch (type) {
      case 'text':
        newBlock = createTextBlock('');
        break;
      case 'checklist':
        newBlock = createChecklistBlock('');
        break;
      case 'bullet':
        newBlock = createBulletBlock('');
        break;
      case 'numbered':
        newBlock = createNumberedBlock('');
        break;
      case 'heading':
        newBlock = createHeadingBlock('', level || 2);
        break;
      default:
        newBlock = createTextBlock('');
    }

    const newData = {
      ...notesData,
      blocks: [...notesData.blocks, newBlock]
    };
    emitChange(newData);
    setNewBlockId(newBlock.id);
    setShowCommandPalette(false);
  }, [notesData, emitChange]);

  // Update block content
  const handleBlockContentChange = useCallback((id: string, content: string) => {
    // Check for slash command
    if (content === '/') {
      setShowCommandPalette(true);
      setActiveBlockId(id);
      setCommandSearch('');
      return;
    }

    // Hide command palette if content changes
    if (showCommandPalette && !content.startsWith('/')) {
      setShowCommandPalette(false);
    }

    const newData = {
      ...notesData,
      blocks: notesData.blocks.map(block =>
        block.id === id ? { ...block, content } : block
      )
    };
    emitChange(newData);
  }, [notesData, emitChange, showCommandPalette]);

  // Toggle checklist checked state
  const handleChecklistCheckedChange = useCallback((id: string, checked: boolean) => {
    const newData = {
      ...notesData,
      blocks: notesData.blocks.map(block =>
        block.id === id ? { ...block, checked } : block
      )
    };
    emitChange(newData);
  }, [notesData, emitChange]);

  // Delete block
  const handleDeleteBlock = useCallback((id: string) => {
    const newData = {
      ...notesData,
      blocks: notesData.blocks.filter(block => block.id !== id)
    };
    emitChange(newData);
  }, [notesData, emitChange]);

  // Handle enter press - add new block after current
  const handleEnterPress = useCallback((id: string) => {
    const index = notesData.blocks.findIndex(b => b.id === id);
    const currentBlock = notesData.blocks[index];

    // For headings, create a text block instead of another heading
    const newBlock = currentBlock.type === 'heading'
      ? createTextBlock('')
      : currentBlock.type === 'checklist'
        ? createChecklistBlock('')
        : currentBlock.type === 'bullet'
          ? createBulletBlock('')
          : currentBlock.type === 'numbered'
            ? createNumberedBlock('')
            : createTextBlock('');

    const newBlocks = [...notesData.blocks];
    newBlocks.splice(index + 1, 0, newBlock);

    const newData = {
      ...notesData,
      blocks: newBlocks
    };
    emitChange(newData);
    setNewBlockId(newBlock.id);
  }, [notesData, emitChange]);

  // Convert block type via slash command
  const handleConvertBlock = useCallback((type: NoteBlock['type'], level?: 1 | 2 | 3) => {
    if (!activeBlockId) return;

    const newData = {
      ...notesData,
      blocks: notesData.blocks.map(block => {
        if (block.id === activeBlockId) {
          const baseBlock = { ...block, type, content: '' };
          if (type === 'heading' && level) {
            return { ...baseBlock, level };
          }
          if (type === 'checklist') {
            return { ...baseBlock, checked: false };
          }
          return baseBlock;
        }
        return block;
      })
    };

    emitChange(newData);
    setShowCommandPalette(false);
    setActiveBlockId(null);
  }, [activeBlockId, notesData, emitChange]);

  // Command palette commands
  const commands = [
    { id: 'text', label: 'Text', icon: Type, action: () => handleConvertBlock('text') },
    { id: 'h1', label: 'Heading 1', icon: Heading1, action: () => handleConvertBlock('heading', 1) },
    { id: 'h2', label: 'Heading 2', icon: Heading2, action: () => handleConvertBlock('heading', 2) },
    { id: 'h3', label: 'Heading 3', icon: Heading3, action: () => handleConvertBlock('heading', 3) },
    { id: 'checklist', label: 'Checklist', icon: CheckSquare, action: () => handleConvertBlock('checklist') },
    { id: 'bullet', label: 'Bullet List', icon: List, action: () => handleConvertBlock('bullet') },
    { id: 'numbered', label: 'Numbered List', icon: ListOrdered, action: () => handleConvertBlock('numbered') },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(commandSearch.toLowerCase())
  );

  // Calculate total length
  const totalLength = serializeNotes(notesData).length;
  const isNearLimit = totalLength > maxLength * 0.9;

  return (
    <div className={cn("space-y-2 flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 bg-white/40 dark:bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 dark:border-white/10 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAddBlock('text')}
          className="h-8 gap-2"
          title="Add text"
        >
          <Type className="h-4 w-4" />
          <span className="text-xs">Text</span>
        </Button>

        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAddBlock('heading', 1)}
            className="h-8 w-8 p-0"
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAddBlock('heading', 2)}
            className="h-8 w-8 p-0"
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAddBlock('heading', 3)}
            className="h-8 w-8 p-0"
            title="Heading 3"
          >
            <Heading3 className="h-4 w-4" />
          </Button>
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAddBlock('checklist')}
          className="h-8 gap-2"
          title="Add checklist"
        >
          <CheckSquare className="h-4 w-4" />
          <span className="text-xs">Checklist</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAddBlock('bullet')}
          className="h-8 gap-2"
          title="Add bullet list"
        >
          <List className="h-4 w-4" />
          <span className="text-xs">Bullets</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleAddBlock('numbered')}
          className="h-8 gap-2"
          title="Add numbered list"
        >
          <ListOrdered className="h-4 w-4" />
          <span className="text-xs">Numbered</span>
        </Button>
      </div>

      {/* Blocks */}
      <div className="space-y-1 min-h-[200px] p-3 rounded-xl border border-white/20 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm flex-1 overflow-y-auto">
        {notesData.blocks.length === 0 ? (
          <div className="text-sm text-muted-foreground py-2">
            {placeholder}
          </div>
        ) : (
          notesData.blocks.map((block, index) => {
            const key = block.id;
            const autoFocus = block.id === newBlockId;

            switch (block.type) {
              case 'text':
                return (
                  <div key={key} className="flex items-start gap-2 group py-1">
                    <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
                      <Type className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <input
                      type="text"
                      value={block.content}
                      onChange={(e) => handleBlockContentChange(block.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleEnterPress(block.id);
                        } else if (e.key === 'Backspace' && block.content === '') {
                          e.preventDefault();
                          handleDeleteBlock(block.id);
                        }
                      }}
                      placeholder="Text..."
                      autoFocus={autoFocus}
                      className={cn(
                        "flex-1 bg-transparent border-none outline-none text-sm py-1",
                        "placeholder:text-muted-foreground/50",
                        "focus:outline-none focus:ring-0"
                      )}
                    />
                  </div>
                );

              case 'heading':
                return (
                  <HeadingItem
                    key={key}
                    id={block.id}
                    content={block.content}
                    level={block.level || 2}
                    onContentChange={handleBlockContentChange}
                    onDelete={handleDeleteBlock}
                    onEnterPress={handleEnterPress}
                    autoFocus={autoFocus}
                  />
                );

              case 'checklist':
                return (
                  <ChecklistItem
                    key={key}
                    id={block.id}
                    content={block.content}
                    checked={block.checked || false}
                    onContentChange={handleBlockContentChange}
                    onCheckedChange={handleChecklistCheckedChange}
                    onDelete={handleDeleteBlock}
                    onEnterPress={handleEnterPress}
                    autoFocus={autoFocus}
                  />
                );

              case 'bullet':
                return (
                  <BulletItem
                    key={key}
                    id={block.id}
                    content={block.content}
                    onContentChange={handleBlockContentChange}
                    onDelete={handleDeleteBlock}
                    onEnterPress={handleEnterPress}
                    autoFocus={autoFocus}
                  />
                );

              case 'numbered':
                // Calculate the index for numbered items
                const numberedIndex = notesData.blocks
                  .slice(0, index)
                  .filter(b => b.type === 'numbered')
                  .length + 1;

                return (
                  <NumberedItem
                    key={key}
                    id={block.id}
                    content={block.content}
                    index={numberedIndex}
                    onContentChange={handleBlockContentChange}
                    onDelete={handleDeleteBlock}
                    onEnterPress={handleEnterPress}
                    autoFocus={autoFocus}
                  />
                );

              default:
                return null;
            }
          })
        )}
      </div>

      {/* Command Palette */}
      {showCommandPalette && (
        <div className="absolute z-50 mt-1 w-64 rounded-lg border bg-popover shadow-lg">
          <div className="p-2 space-y-1">
            {filteredCommands.map((cmd) => (
              <Button
                key={cmd.id}
                variant="ghost"
                size="sm"
                onClick={cmd.action}
                className="w-full justify-start gap-2 h-8"
              >
                <cmd.icon className="h-4 w-4" />
                <span className="text-xs">{cmd.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Character count */}
      {isNearLimit && (
        <div className="text-xs text-right text-muted-foreground">
          {totalLength} / {maxLength} characters
        </div>
      )}
    </div>
  );
};
