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
    console.error('⚠️ Failed to parse AI JSON output:', error);
    console.log('Using fallback metadata');
    return cleanMetadataFields(fallbackData);
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
