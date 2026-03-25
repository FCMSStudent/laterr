import { NotesData, NoteBlock, createChecklistBlock, createHeadingBlock, createBulletBlock, createNumberedBlock } from '../types';

/** Stable id for plain-text / legacy lines so re-parsing does not rotate React keys. */
const plainLineId = (index: number) => `plain-line-${index}`;

const withId = (block: NoteBlock, index: number): NoteBlock => ({
  ...block,
  id: block.id && String(block.id).length > 0 ? block.id : `missing-${index}`,
});

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
      const data = parsed as NotesData;
      return {
        ...data,
        blocks: data.blocks.map((block, index) => withId(block, index)),
      };
    }
  } catch {
    // Not JSON, treat as plain text
  }

  // Parse plain text - detect markdown-style formatting
  const lines = input.split('\n');
  const blocks: NoteBlock[] = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const id = plainLineId(index);

    // Check for checklist syntax: [ ] or [x] or [X]
    const checklistMatch = line.match(/^\s*\[([xX ])\]\s*(.*)$/);
    if (checklistMatch) {
      blocks.push({
        ...createChecklistBlock(
          checklistMatch[2],
          checklistMatch[1].toLowerCase() === 'x'
        ),
        id,
      });
      continue;
    }

    // Check for heading syntax: # Heading, ## Heading, ### Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({
        ...createHeadingBlock(headingMatch[2], level),
        id,
      });
      continue;
    }

    // Check for bullet list: - item or * item
    const bulletMatch = line.match(/^\s*[-*]\s+(.*)$/);
    if (bulletMatch) {
      blocks.push({
        ...createBulletBlock(bulletMatch[1]),
        id,
      });
      continue;
    }

    // Check for numbered list: 1. item or 1) item
    const numberedMatch = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (numberedMatch) {
      blocks.push({
        ...createNumberedBlock(numberedMatch[1]),
        id,
      });
      continue;
    }

    // Default to text block
    blocks.push({
      id,
      type: 'text',
      content: line,
    });
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
