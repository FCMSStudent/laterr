# Multimodal Embeddings & Semantic Search Guide

This guide explains the embeddings and semantic search functionality implemented in the Laterr Garden application.

## Overview

The application now supports **multimodal embeddings** for semantic content analysis and recommendations. This enables:

- **Semantic Search**: Find related content based on meaning, not just keywords
- **Smart Recommendations**: Get personalized suggestions based on your interests
- **Content Clustering**: Automatically group similar items together
- **Similar Items**: Discover related content when viewing any item

## Architecture

### Database Layer

#### Vector Storage
```sql
-- Embeddings are stored as 1536-dimensional vectors using pgvector
ALTER TABLE items ADD COLUMN embedding vector(1536);

-- IVFFlat index for fast similarity search
CREATE INDEX items_embedding_idx ON items 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

#### Similarity Function
```sql
-- Find similar items using cosine similarity
CREATE FUNCTION find_similar_items(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  user_id_filter uuid DEFAULT NULL
)
```

### Backend (Edge Functions)

#### generate-embedding Function
Located at: `supabase/functions/generate-embedding/index.ts`

**Purpose**: Generate embeddings from multimodal content (tags, title, summary, text)

**Input**:
```json
{
  "title": "Document Title",
  "summary": "Brief description...",
  "tags": ["tag1", "tag2"],
  "extractedText": "Sample content..."
}
```

**Output**:
```json
{
  "embedding": [0.123, -0.456, ...],  // 1536 dimensions
  "dimension": 1536
}
```

**Model**: OpenAI's `text-embedding-3-small`
- Dimension: 1536
- Cost-effective for semantic similarity
- High quality embeddings for English text

**Priority Weighting**:
1. **Tags** (highest weight) - Category and classification
2. **Title** - Main subject
3. **Summary** - Key information
4. **Text** (first 500 chars) - Additional context

#### analyze-file Function Enhancements
- Automatically triggers embedding generation for uploaded files
- Extracts text from PDFs, documents, images (OCR)
- Processes video metadata (title, tags)
- Handles multiple file formats

### Frontend Layer

#### React Hooks

**useEmbeddings Hook**
```typescript
import { useEmbeddings } from '@/hooks/useEmbeddings';

const { 
  generateEmbedding,
  updateItemEmbedding,
  batchUpdateEmbeddings,
  loading,
  error
} = useEmbeddings();

// Generate embedding for new content
const embedding = await generateEmbedding(
  title, 
  summary, 
  tags, 
  extractedText
);

// Update embedding for existing item
await updateItemEmbedding(itemId);

// Batch update for multiple items
await batchUpdateEmbeddings(itemIds, (completed, total) => {
  console.log(`Progress: ${completed}/${total}`);
});
```

#### Semantic Search Utilities

**findSimilarItems**
```typescript
import { findSimilarItems } from '@/lib/semantic-search';

// Find items similar to a specific item
const similar = await findSimilarItems(
  itemId,      // Reference item ID
  10,          // Maximum results
  0.7          // Similarity threshold (0-1)
);
```

**findSimilarItemsByText**
```typescript
import { findSimilarItemsByText } from '@/lib/semantic-search';

// Find items similar to arbitrary text
const results = await findSimilarItemsByText(
  "machine learning tutorial",
  10,
  0.7
);
```

**getRecommendations**
```typescript
import { getRecommendations } from '@/lib/semantic-search';

// Get personalized recommendations
const recommendations = await getRecommendations(10);
```

#### UI Components

**SimilarItemsPanel**
```typescript
import { SimilarItemsPanel } from '@/components/SimilarItemsPanel';

<SimilarItemsPanel 
  itemId={currentItem.id}
  onItemClick={(item) => handleItemClick(item)}
/>
```

**RecommendationsPanel**
```typescript
import { RecommendationsPanel } from '@/components/RecommendationsPanel';

<RecommendationsPanel 
  onItemClick={(item) => handleItemClick(item)}
  refreshTrigger={refreshCount}
/>
```

## Usage Examples

### 1. Automatic Embedding Generation

When adding any content (URL, note, file), embeddings are automatically generated:

```typescript
// In AddItemModal.tsx
const { data, error } = await supabase.functions.invoke('generate-embedding', {
  body: {
    title: data.title,
    summary: data.summary,
    tags: data.tags,
    extractedText: data.extractedText || ''
  }
});

// Insert item with embedding
await supabase.from('items').insert({
  type: 'url',
  title: data.title,
  content: url,
  summary: data.summary,
  tags: data.tags,
  embedding: embeddingData?.embedding,
  user_id: user.id
});
```

### 2. Find Similar Content

```typescript
// Get similar items when viewing an item
const similarItems = await findSimilarItems(currentItemId, 5, 0.75);

// Display results
similarItems.forEach(item => {
  console.log(`${item.title} - ${Math.round(item.similarity * 100)}% match`);
});
```

### 3. Search by Natural Language

```typescript
// Find items matching a text description
const results = await findSimilarItemsByText(
  "articles about web development",
  20,
  0.6
);
```

### 4. Personalized Recommendations

```typescript
// Get recommendations based on user's recent items
const recommendations = await getRecommendations(10);

// Recommendations are based on:
// - User's 5 most recent items
// - Items similar to those (similarity > 0.7)
// - Ranked by similarity score
```

## Video Support

### Video File Types Supported
- MP4 (video/mp4)
- MOV (video/quicktime)
- AVI (video/x-msvideo)
- WebM (video/webm)

### Video Processing Pipeline
1. User uploads video file
2. File stored in Supabase Storage
3. `analyze-file` function processes video
4. Metadata extracted (duration, format, size)
5. Thumbnail placeholder created (requires FFmpeg in production)
6. Embedding generated from video metadata
7. Item saved with type='video'

### Thumbnail Generation (Production Setup Required)

**For Videos**:
```bash
# Requires FFmpeg
ffmpeg -i input.mp4 -ss 00:00:01 -vframes 1 thumbnail.jpg
```

**For PDFs**:
```bash
# Requires ImageMagick or pdf2image
convert input.pdf[0] -thumbnail 400x thumbnail.jpg
```

**Current Implementation**: Placeholder functions in edge function
**Production**: Deploy separate thumbnail generation service

## Performance Considerations

### Index Configuration
```sql
-- IVFFlat index with 100 lists
-- Good balance for datasets with 10K-100K items
-- Adjust 'lists' parameter based on dataset size:
-- - < 10K items: lists = 50
-- - 10K-100K items: lists = 100
-- - > 100K items: lists = 200
```

### Query Performance
- Similarity search: ~10-50ms for 10K items
- Indexed cosine similarity faster than L2 distance
- User-specific queries filtered early for performance

### Embedding Generation
- Rate limits: Handled gracefully with 429 status
- Cost: ~$0.0001 per 1K tokens (text-embedding-3-small)
- Batch processing: Include 100ms delay between items

## Similarity Scores

Cosine similarity ranges from -1 to 1:
- **0.9 - 1.0**: Nearly identical content
- **0.8 - 0.9**: Very similar, likely same topic
- **0.7 - 0.8**: Similar, related topics
- **0.6 - 0.7**: Somewhat related
- **< 0.6**: Different topics

Default threshold: 0.7 (good balance for recommendations)

## Error Handling

### Graceful Degradation
```typescript
try {
  const embedding = await generateEmbedding(...);
  // Include embedding in insert
} catch (error) {
  console.warn('Embedding generation failed, continuing without it');
  // Insert item without embedding - still works!
}
```

### Rate Limiting
```typescript
if (error.status === 429) {
  // Rate limit exceeded - retry after delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  return retry();
}
```

### Credit Exhaustion
```typescript
if (error.status === 402) {
  // AI credits exhausted
  toast.error('AI credits exhausted', {
    description: 'Please add credits to continue'
  });
}
```

## Future Enhancements

### Short Term
- [ ] Backfill embeddings for existing items
- [ ] Batch processing UI for bulk updates
- [ ] Export/import embeddings for backup

### Medium Term
- [ ] Clustering visualization
- [ ] Auto-tagging based on embeddings
- [ ] Smart collections (auto-grouping)
- [ ] Duplicate detection

### Long Term
- [ ] Multi-language support
- [ ] Image similarity (CLIP embeddings)
- [ ] Video content analysis
- [ ] Cross-user recommendations (opt-in)

## Troubleshooting

### No Recommendations Showing
- Check if items have embeddings: `SELECT COUNT(*) FROM items WHERE embedding IS NOT NULL`
- Ensure user has multiple items with embeddings
- Try lowering similarity threshold

### Slow Similarity Search
- Check index exists: `\d items` in psql
- Rebuild index if needed: `REINDEX INDEX items_embedding_idx`
- Increase lists parameter for larger datasets

### Embedding Generation Fails
- Check API key is set: `LOVABLE_API_KEY`
- Verify network connectivity to AI gateway
- Check rate limits and credits

## API Reference

### Database Functions

**find_similar_items()**
```sql
SELECT * FROM find_similar_items(
  query_embedding := '[0.1, 0.2, ...]',
  match_threshold := 0.7,
  match_count := 10,
  user_id_filter := 'uuid-here'
);
```

Returns: `id, type, title, summary, tags, preview_image_url, similarity`

### Edge Functions

**generate-embedding**
- Path: `/functions/v1/generate-embedding`
- Method: POST
- Auth: Required (Bearer token)
- Body: `{ title, summary, tags, extractedText }`
- Response: `{ embedding: number[], dimension: number }`

**analyze-file**
- Path: `/functions/v1/analyze-file`
- Method: POST
- Auth: Required
- Body: `{ fileUrl, fileType, fileName }`
- Response: `{ title, description, tags, summary, previewImageUrl }`

## Credits

- **pgvector**: PostgreSQL extension for vector similarity search
- **OpenAI**: text-embedding-3-small model
- **Supabase**: Vector storage and edge functions platform
