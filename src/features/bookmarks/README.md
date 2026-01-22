# Bookmarks Feature

Bookmark management system for saving and organizing links, notes, and documents.

## Overview

The bookmarks feature allows users to:
- Save URLs, notes, and documents
- Organize with tags and folders
- Search with semantic AI-powered search
- View rich previews (PDF, video, images, DOCX)
- Add checklists and rich notes
- Bulk operations on multiple items

## Structure

```
bookmarks/
├── components/      # UI components for bookmarks
├── hooks/           # Custom hooks for bookmarks logic
└── utils/           # Utility functions
```

## Components

### Core Components
- **AddItemModal.tsx** - Modal for adding new bookmarks
- **EditItemModal.tsx** - Modal for editing existing bookmarks
- **DetailViewModal.tsx** - Full detail view of a bookmark
- **BookmarkCard.tsx** - Card display for bookmark items
- **ItemCard.tsx** - Alternative card layout
- **ItemListRow.tsx** - List row layout for bookmarks

### Preview Components
- **PDFPreview.tsx** - PDF document preview
- **VideoPreview.tsx** - Video preview with player
- **DOCXPreview.tsx** - Word document preview
- **ThumbnailPreview.tsx** - Image thumbnail preview
- **NotePreview.tsx** - Note content preview

### Editor Components
- **NoteEditorModal.tsx** - Modal for editing notes
- **RichNotesEditor.tsx** - Rich text editor for notes

### Utility Components
- **FilterBar.tsx** - Filter and search controls
- **BulkActionsBar.tsx** - Bulk action toolbar
- **ChecklistItem.tsx** - Checklist item component
- **ChecklistProgress.tsx** - Checklist progress indicator
- **ItemCardSkeleton.tsx** - Loading skeleton
- **ViewerShell.tsx** - Shell for document viewers

## Hooks

### useEmbeddings
Manages AI embeddings for semantic search functionality.

```tsx
const { generateEmbedding, searchByEmbedding } = useEmbeddings();
```

### useInfiniteScroll
Implements infinite scroll pagination for bookmark lists.

```tsx
const { items, loadMore, hasMore } = useInfiniteScroll();
```

## Utils

### notes-parser.ts
Parses and formats note content.

### semantic-search.ts
Implements semantic search using AI embeddings.

### thumbnail-generator.ts
Generates thumbnails for various content types.

### video-utils.ts
Video processing and metadata extraction utilities.

## Data Model

```typescript
interface Bookmark {
  id: string;
  user_id: string;
  title: string;
  url?: string;
  notes?: string;
  tags?: string[];
  type: 'link' | 'note' | 'document';
  thumbnail_url?: string;
  checklist?: ChecklistItem[];
  created_at: string;
  updated_at: string;
}
```

## Usage Example

```tsx
import { BookmarkCard, AddItemModal } from '@/features/bookmarks/components';

function BookmarksPage() {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div>
      <Button onClick={() => setShowAdd(true)}>Add Bookmark</Button>
      
      <div className="grid gap-4">
        {bookmarks.map(bookmark => (
          <BookmarkCard key={bookmark.id} bookmark={bookmark} />
        ))}
      </div>

      <AddItemModal 
        open={showAdd} 
        onOpenChange={setShowAdd} 
      />
    </div>
  );
}
```

## Integration

- Uses Supabase for data storage
- Integrates with OpenAI for embeddings
- Supports file uploads to S3
- Real-time updates via Supabase subscriptions
