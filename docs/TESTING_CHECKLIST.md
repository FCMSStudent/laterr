# Testing Checklist for Embeddings & Thumbnail Features

This document provides a comprehensive testing checklist for the newly implemented features.

## Pre-Testing Setup

### Database Migration
- [ ] Run the migration: `supabase/migrations/20251110072600_add_embeddings_and_video_support.sql`
- [ ] Verify pgvector extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'vector';`
- [ ] Check embedding column exists: `\d items` in psql
- [ ] Verify index was created: `SELECT indexname FROM pg_indexes WHERE tablename = 'items';`
- [ ] Test the find_similar_items function with dummy data

### Edge Functions Deployment
- [ ] Deploy generate-embedding function
- [ ] Deploy updated analyze-file function
- [ ] Test both functions are accessible
- [ ] Verify LOVABLE_API_KEY is set in environment

## Feature Testing

### 1. Embedding Generation

#### URL Submissions
- [ ] Add a new URL
- [ ] Verify "generating embeddings" status shows
- [ ] Check item has embedding in database: `SELECT id, title, embedding IS NOT NULL as has_embedding FROM items WHERE type = 'url' ORDER BY created_at DESC LIMIT 1;`
- [ ] Verify item saved successfully even if embedding fails (disconnect internet and try)

#### Note Submissions
- [ ] Create a new note
- [ ] Verify embedding generated
- [ ] Check embedding column populated
- [ ] Test with very short note (< 10 chars)
- [ ] Test with very long note (> 10,000 chars)

#### File Uploads - Images
- [ ] Upload JPEG image
- [ ] Upload PNG image
- [ ] Upload WebP image
- [ ] Upload GIF
- [ ] Verify OCR text extraction
- [ ] Check embedding includes image tags
- [ ] Verify preview_image_url is set

#### File Uploads - Documents
- [ ] Upload PDF document
- [ ] Verify text extraction works
- [ ] Check embedding generated from content
- [ ] Upload Word document (.docx)
- [ ] Upload older Word document (.doc)
- [ ] Test with text file (.txt)

#### File Uploads - Videos
- [ ] Upload MP4 video
- [ ] Upload MOV video (if on Mac)
- [ ] Upload WebM video
- [ ] Verify video type is set correctly
- [ ] Check tags include "watch later"
- [ ] Verify item saves with placeholder thumbnail

#### File Uploads - Spreadsheets
- [ ] Upload Excel file (.xlsx)
- [ ] Upload CSV file
- [ ] Verify data extraction
- [ ] Check embedding generated

### 2. Semantic Search

#### Similar Items
- [ ] Open an item with embedding
- [ ] Verify SimilarItemsPanel appears
- [ ] Check similarity scores are between 0-1
- [ ] Verify results are semantically related
- [ ] Test with item that has no similar items
- [ ] Test with newly created item (may have no results initially)

#### Find Similar by Text
```typescript
const results = await findSimilarItemsByText("machine learning", 10);
console.log(results);
```
- [ ] Test various search queries
- [ ] Verify results are relevant
- [ ] Test with empty string
- [ ] Test with very long text

#### Recommendations
- [ ] View RecommendationsPanel
- [ ] Verify recommendations appear after adding multiple items
- [ ] Check recommendations update when new items added
- [ ] Test with user who has < 5 items
- [ ] Test with user who has no embeddings

### 3. Backfill Functionality

#### Count Check
- [ ] Open EmbeddingBackfillDialog
- [ ] Verify correct count of items without embeddings
- [ ] Test with all items having embeddings (should show 0)

#### Batch Processing
- [ ] Start backfill process
- [ ] Verify progress bar updates
- [ ] Check current item name displays
- [ ] Monitor success/failure counts
- [ ] Verify all items processed
- [ ] Check embeddings in database after completion

#### Error Handling
- [ ] Test with rate limit exceeded (generate many requests quickly)
- [ ] Test with network disconnected
- [ ] Verify failed items are counted
- [ ] Check successful items still have embeddings

### 4. UI/UX Testing

#### AddItemModal
- [ ] Verify all status steps show correctly
- [ ] Check loading indicators work
- [ ] Test error messages display properly
- [ ] Verify success toasts appear
- [ ] Test canceling during upload

#### DetailViewModal
- [ ] Open item detail
- [ ] Verify SimilarItemsPanel appears for items with embeddings
- [ ] Check similarity percentage displays
- [ ] Test clicking on similar item
- [ ] Verify similar items only show if embedding exists

#### Loading States
- [ ] Check all loading spinners work
- [ ] Verify skeleton loaders (if any)
- [ ] Test progress indicators
- [ ] Check disabled button states

#### Error States
- [ ] Test network failure scenarios
- [ ] Verify error messages are user-friendly
- [ ] Check error recovery works
- [ ] Test with invalid data

### 5. Edge Cases

#### Empty States
- [ ] User with no items
- [ ] User with items but no embeddings
- [ ] Item with no similar matches
- [ ] Search with no results

#### Boundary Conditions
- [ ] Very long titles (> 200 chars)
- [ ] Very long summaries (> 5000 chars)
- [ ] Very long tag lists (> 20 tags)
- [ ] Empty content
- [ ] Special characters in text
- [ ] Non-English text (Unicode)

#### Concurrent Operations
- [ ] Upload multiple files simultaneously
- [ ] Generate embeddings for multiple items at once
- [ ] Run backfill while adding new items
- [ ] Search while embeddings are being generated

### 6. Performance Testing

#### Query Performance
```sql
-- Test similarity search speed
EXPLAIN ANALYZE
SELECT * FROM find_similar_items(
  query_embedding := (SELECT embedding FROM items LIMIT 1),
  match_threshold := 0.7,
  match_count := 10
);
```
- [ ] Verify query completes in < 100ms
- [ ] Test with 100 items
- [ ] Test with 1,000 items
- [ ] Test with 10,000 items
- [ ] Check index is being used (Index Scan, not Seq Scan)

#### Embedding Generation
- [ ] Measure time to generate single embedding
- [ ] Test batch of 10 items
- [ ] Test batch of 50 items
- [ ] Monitor API rate limits
- [ ] Check for timeout issues

#### UI Responsiveness
- [ ] Verify UI doesn't freeze during embedding generation
- [ ] Check progress updates are smooth
- [ ] Test with slow network
- [ ] Verify cancellation works

### 7. Security Testing

#### Authentication
- [ ] Verify unauthenticated users can't generate embeddings
- [ ] Test RLS policies prevent cross-user access
- [ ] Check user can only see their own similar items
- [ ] Verify storage policies work correctly

#### Input Validation
- [ ] Test SQL injection attempts in titles
- [ ] Test XSS attempts in content
- [ ] Verify file size limits enforced
- [ ] Check MIME type validation

#### API Security
- [ ] Test without auth token
- [ ] Test with invalid token
- [ ] Test with expired token
- [ ] Verify rate limiting works

### 8. Integration Testing

#### Full User Flow
1. [ ] Create new account
2. [ ] Add URL with auto-embedding
3. [ ] Upload PDF document
4. [ ] Create note
5. [ ] Upload video
6. [ ] View recommendations
7. [ ] Open item and see similar items
8. [ ] Run backfill on remaining items
9. [ ] Search for similar content
10. [ ] Verify all features work together

#### Cross-Feature Compatibility
- [ ] Embeddings work with existing tags system
- [ ] Preview images display correctly
- [ ] Filters work with embedded items
- [ ] Search works alongside embeddings
- [ ] Edit item preserves embedding

### 9. Database Testing

#### Data Integrity
```sql
-- Check embedding dimensions
SELECT id, title, array_length(embedding, 1) as dimension 
FROM items 
WHERE embedding IS NOT NULL;

-- Should all be 1536
```
- [ ] All embeddings have 1536 dimensions
- [ ] No NULL values where not expected
- [ ] Foreign key constraints work
- [ ] Cascade deletes work correctly

#### Index Performance
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'items';
```
- [ ] Verify idx_scan increases with queries
- [ ] Check index is being utilized

### 10. Documentation Testing

#### Code Documentation
- [ ] All functions have JSDoc comments
- [ ] Complex logic is explained
- [ ] Edge cases are documented
- [ ] Type definitions are clear

#### User Documentation
- [ ] EMBEDDINGS_GUIDE.md is accurate
- [ ] Examples work as shown
- [ ] API reference is complete
- [ ] Troubleshooting guide is helpful

## Post-Testing

### Cleanup
- [ ] Remove test data
- [ ] Reset test environment
- [ ] Document any issues found
- [ ] Update documentation if needed

### Performance Metrics
- [ ] Record average embedding generation time
- [ ] Record average similarity search time
- [ ] Record backfill processing rate
- [ ] Document any bottlenecks

### Issue Reporting
For each issue found:
- [ ] Create detailed bug report
- [ ] Include reproduction steps
- [ ] Attach relevant logs
- [ ] Assign priority level
- [ ] Suggest potential fixes

## Acceptance Criteria

All tests should pass:
- ✅ Embeddings generate successfully for all content types
- ✅ Similarity search returns relevant results
- ✅ UI components display correctly
- ✅ No security vulnerabilities
- ✅ Performance within acceptable limits
- ✅ Error handling works gracefully
- ✅ Documentation is complete and accurate

## Tools & Commands

### Database Queries
```sql
-- Check embeddings status
SELECT 
  type,
  COUNT(*) as total,
  COUNT(embedding) as with_embedding,
  COUNT(*) - COUNT(embedding) as without_embedding
FROM items
GROUP BY type;

-- Find items without embeddings
SELECT id, title, type, created_at 
FROM items 
WHERE embedding IS NULL 
ORDER BY created_at DESC;

-- Test similarity function
SELECT * FROM find_similar_items(
  query_embedding := (SELECT embedding FROM items WHERE title ILIKE '%test%' LIMIT 1),
  match_threshold := 0.7,
  match_count := 5
);
```

### Supabase CLI
```bash
# Check function logs
supabase functions logs generate-embedding

# Test function locally
supabase functions serve generate-embedding

# Deploy function
supabase functions deploy generate-embedding
```

### Browser Console
```javascript
// Test semantic search
const { findSimilarItems } = await import('./lib/semantic-search');
const results = await findSimilarItems('item-id-here', 10, 0.7);
console.table(results);

// Test embedding generation
const { useEmbeddings } = await import('./hooks/useEmbeddings');
// Use in component
```

## Success Criteria

✅ **Feature Complete**: All planned features implemented
✅ **Tests Pass**: All test cases pass
✅ **Performance**: Meets performance requirements
✅ **Security**: No vulnerabilities found
✅ **Documentation**: Complete and accurate
✅ **User Experience**: Smooth and intuitive

## Sign-Off

- [ ] Developer testing complete
- [ ] QA testing complete (if applicable)
- [ ] Performance testing complete
- [ ] Security review complete
- [ ] Documentation reviewed
- [ ] Ready for production deployment
