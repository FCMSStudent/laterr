import { NotesData, NoteBlock, createTextBlock, createChecklistBlock } from '@/types/notes';

/**
 * Parse a string (plain text or JSON) into NotesData
 */
export const parseNotes = (input: string | null | undefined): NotesData => {
  if (!input || input.trim() === '') {
    return { version: 1, blocks: [] };
  }

  // Try to parse as JSON first
  try {
    const parsed = JSON.parse(input);
    if (parsed.version === 1 && Array.isArray(parsed.blocks)) {
      return parsed as NotesData;
    }
  } catch {
    // Not JSON, treat as plain text
  }

  // Parse plain text - detect checklists
  const lines = input.split('\n');
  const blocks: NoteBlock[] = [];

  for (const line of lines) {
    // Check for checklist syntax: [ ] or [x] or [X]
    const checklistMatch = line.match(/^\s*\[([xX ])\]\s*(.*)$/);
    if (checklistMatch) {
      blocks.push(createChecklistBlock(
        checklistMatch[2],
        checklistMatch[1].toLowerCase() === 'x'
      ));
    } else {
      blocks.push(createTextBlock(line));
    }
  }

  return { version: 1, blocks };
};

/**
 * Serialize NotesData back to a string for storage
 */
export const serializeNotes = (data: NotesData): string => {
  return JSON.stringify(data);
};

/**
 * Convert NotesData to plain text for display/export
 */
export const notesToPlainText = (data: NotesData): string => {
  return data.blocks.map(block => {
    switch (block.type) {
      case 'checklist':
        return `[${block.checked ? 'x' : ' '}] ${block.content}`;
      case 'heading':
        const prefix = '#'.repeat(block.level || 2);
        return `${prefix} ${block.content}`;
      case 'bullet':
        return `• ${block.content}`;
      case 'numbered':
        return `- ${block.content}`;
      default:
        return block.content;
    }
  }).join('\n');
};

/**
 * Get checklist statistics
 */
export const getChecklistStats = (data: NotesData): { total: number; completed: number } => {
  const checklists = data.blocks.filter(b => b.type === 'checklist');
  return {
    total: checklists.length,
    completed: checklists.filter(b => b.checked).length,
  };
};
