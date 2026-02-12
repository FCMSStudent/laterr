import { NotesData, NoteBlock, createTextBlock, createChecklistBlock, createHeadingBlock, createBulletBlock, createNumberedBlock } from '../types';

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

  // Parse plain text - detect markdown-style formatting
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
      continue;
    }

    // Check for heading syntax: # Heading, ## Heading, ### Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push(createHeadingBlock(headingMatch[2], level));
      continue;
    }

    // Check for bullet list: - item or * item
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push(createBulletBlock(bulletMatch[1]));
      continue;
    }

    // Check for numbered list: 1. item or 1) item
    const numberedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numberedMatch) {
      blocks.push(createNumberedBlock(numberedMatch[1]));
      continue;
    }

    // Default to text block
    blocks.push(createTextBlock(line));
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
      case 'heading': {
        const prefix = '#'.repeat(block.level || 2);
        return `${prefix} ${block.content}`;
      }
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
