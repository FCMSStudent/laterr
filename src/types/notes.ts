export interface NoteBlock {
  id: string;
  type: 'text' | 'heading' | 'checklist' | 'bullet' | 'numbered';
  content: string;
  checked?: boolean;
  level?: 1 | 2 | 3;
}

export interface NotesData {
  version: 1;
  blocks: NoteBlock[];
}

export const createEmptyNotesData = (): NotesData => ({
  version: 1,
  blocks: [],
});

export const createTextBlock = (content: string = ''): NoteBlock => ({
  id: crypto.randomUUID(),
  type: 'text',
  content,
});

export const createChecklistBlock = (content: string = '', checked: boolean = false): NoteBlock => ({
  id: crypto.randomUUID(),
  type: 'checklist',
  content,
  checked,
});

export const createHeadingBlock = (content: string = '', level: 1 | 2 | 3 = 2): NoteBlock => ({
  id: crypto.randomUUID(),
  type: 'heading',
  content,
  level,
});

export const createBulletBlock = (content: string = ''): NoteBlock => ({
  id: crypto.randomUUID(),
  type: 'bullet',
  content,
});
