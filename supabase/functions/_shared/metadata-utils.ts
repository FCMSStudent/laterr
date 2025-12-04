// Shared utilities for metadata refinement across analyze-file and analyze-url

/**
 * Metadata fields structure
 */
export interface MetadataFields {
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  summary?: string;
  keyPoints?: string[];
  extractedText?: string;
  tag?: string;
  contentType?: string;
  [key: string]: unknown;
}

/**
 * Cleans and normalizes all metadata fields:
 * - Trims whitespace from strings
 * - Normalizes capitalization for tags (lowercase)
 * - Deduplicates tags
 * - Removes empty values
 * - Ensures tags are capped at 6 items
 */
export function cleanMetadataFields(metadata: MetadataFields): MetadataFields {
  const cleaned: MetadataFields = {};

  // Clean string fields
  const stringFields = ['title', 'description', 'category', 'summary', 'extractedText'];
  for (const field of stringFields) {
    if (metadata[field] && typeof metadata[field] === 'string') {
      const trimmed = metadata[field].trim();
      if (trimmed.length > 0) {
        cleaned[field] = trimmed;
      }
    }
  }

  // Clean and normalize tags
  if (Array.isArray(metadata.tags)) {
    const normalizedTags = metadata.tags
      .filter(tag => tag && typeof tag === 'string')
      .map(tag => tag.toLowerCase().trim().replace(/\s+/g, '-'))
      .filter(tag => tag.length > 0);
    
    // Deduplicate using Set
    const uniqueTags = [...new Set(normalizedTags)];
    
    // Cap at 6 tags
    cleaned.tags = uniqueTags.slice(0, 6);
  }

  // Clean key points array
  if (Array.isArray(metadata.keyPoints)) {
    const cleanedPoints = metadata.keyPoints
      .filter(point => point && typeof point === 'string')
      .map(point => point.trim())
      .filter(point => point.length > 0);
    
    if (cleanedPoints.length > 0) {
      cleaned.keyPoints = cleanedPoints;
    }
  }

  return cleaned;
}

/**
 * Validates and parses AI JSON output with fallback mechanisms.
 * Returns parsed metadata or null if parsing fails.
 * 
 * @param toolCallArguments - The AI tool call arguments string to parse
 * @param fallbackData - Fallback data to use if parsing fails (e.g., filename, raw metadata)
 * @returns Parsed and cleaned metadata or fallback
 */
export function validateAndParseAiJson(
  toolCallArguments: string | undefined,
  fallbackData: Partial<MetadataFields> = {}
): MetadataFields {
  // If no AI response, return cleaned fallback immediately
  if (!toolCallArguments) {
    console.log('⚠️ No AI tool call arguments, using fallback');
    return cleanMetadataFields(fallbackData);
  }

  try {
    const parsed = JSON.parse(toolCallArguments);
    
    // Validate that we got a valid object with at least some fields
    if (!parsed || typeof parsed !== 'object') {
      console.error('⚠️ Invalid AI response structure, using fallback');
      return cleanMetadataFields(fallbackData);
    }

    // Merge parsed data with fallback (parsed takes precedence)
    const merged = { ...fallbackData, ...parsed };
    
    // Clean and normalize all fields
    const cleaned = cleanMetadataFields(merged);
    
    // Ensure we at least have a title
    if (!cleaned.title && fallbackData.title) {
      cleaned.title = fallbackData.title;
    }
    
    console.log('✅ AI metadata parsed and cleaned successfully');
    return cleaned;
  } catch (error) {
    // JSON parsing failed - try to extract fields from plain text response
    console.log('🔄 JSON parsing failed, attempting text extraction...');
    
    const text = toolCallArguments;
    const extracted: Partial<MetadataFields> = {};
    
    // Try to extract title from text patterns
    const titleMatch = text.match(/(?:title|Title)[:\s]*["']?([^"'\n]+)["']?/i);
    if (titleMatch && titleMatch[1]?.trim()) {
      extracted.title = titleMatch[1].trim();
      console.log('📄 Extracted title from text:', extracted.title);
    }
    
    // Try to extract summary from text patterns
    const summaryMatch = text.match(/(?:summary|Summary)[:\s]*["']?([^"'\n]+(?:\n[^"'\n]+)?)["']?/i);
    if (summaryMatch && summaryMatch[1]?.trim()) {
      extracted.summary = summaryMatch[1].trim();
      console.log('📄 Extracted summary from text');
    }
    
    // Try to extract description
    const descMatch = text.match(/(?:description|Description)[:\s]*["']?([^"'\n]+)["']?/i);
    if (descMatch && descMatch[1]?.trim()) {
      extracted.description = descMatch[1].trim();
    }
    
    // Try to extract category
    const categoryMatch = text.match(/(?:category|Category)[:\s]*["']?(\w+)["']?/i);
    if (categoryMatch && categoryMatch[1]?.trim()) {
      extracted.category = categoryMatch[1].trim().toLowerCase();
    }
    
    // Try to extract tags (comma-separated or array-like)
    const tagsMatch = text.match(/(?:tags|Tags)[:\s]*\[?["']?([^\]\n]+)["']?\]?/i);
    if (tagsMatch && tagsMatch[1]?.trim()) {
      const tagStr = tagsMatch[1].replace(/["'\[\]]/g, '');
      extracted.tags = tagStr.split(/[,;]/).map(t => t.trim()).filter(t => t.length > 0);
      console.log('📄 Extracted tags from text:', extracted.tags);
    }
    
    // Merge extracted with fallback
    const merged = { ...fallbackData, ...extracted };
    const cleaned = cleanMetadataFields(merged);
    
    if (Object.keys(extracted).length > 0) {
      console.log('✅ Extracted metadata fields from text response');
    } else {
      console.log('⚠️ Could not extract fields from text, using fallback');
    }
    
    return cleaned;
  }
}

/**
 * Cleans a filename into a readable title:
 * - Removes extension
 * - Replaces underscores and hyphens with spaces
 * - Applies title case
 * - Preserves acronyms (2-5 letter all-caps words)
 */
export function cleanTitle(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
    .replace(/\s+/g, ' ') // Collapse whitespace
    .split(' ')
    .map(word => {
      // Preserve acronyms (all caps, 2-5 letters)
      if (word.length >= 2 && word.length <= 5 && word === word.toUpperCase()) {
        return word;
      }
      // Title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
}
