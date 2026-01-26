/**
 * Image processing and OCR module
 */

import { AnalysisResult, isApiError } from "./types.ts";
import { callAiAnalysis } from "./ai.ts";
import { extractAiMetadata, parseAiResponse } from "./validation.ts";

/**
 * Process image file with OCR and visual analysis
 */
export async function processImage(
    fileUrl: string,
    fileName: string,
    apiKey: string
): Promise<AnalysisResult> {
    console.log('🖼️ Processing image with enhanced OCR and analysis');

    const prompt = `**CRITICAL: Base your response ONLY on the provided image content. Do not infer, assume, or add information not directly visible in the image.**

Analyze this image and extract factual information:

1. **OCR Extraction**: Extract ALL visible text exactly as it appears in the image. Include:
   - Main text content, headers, titles
   - Labels, captions, table text
   - Small print or footnotes
   - Any logos with text

2. **Title**: Create a descriptive title based ONLY on visible text or the primary subject matter shown in the image.

3. **Visual Description**: Describe only what is actually visible:
   - Type: document, screenshot, photo, diagram, chart, receipt, form, etc.
   - Main subject or purpose as shown
   - Notable visual elements present (logos, signatures, graphs, etc.)
   - Layout and structure

4. **Categorization**: Determine category and provide 4-6 specific tags based solely on visible content.

5. **Key Information**: Extract and list only factual information visible in the image.

Use the analyze_file function to provide structured output.`;

    try {
        const data = await callAiAnalysis(apiKey, prompt, fileUrl);

        const fallback = {
            title: fileName.replace(/\.[^/.]+$/, ''),
            description: 'Image file',
            tags: ['image'],
            category: 'other'
        };

        const { raw: aiRaw } = extractAiMetadata(data, fallback);
        const parsed = parseAiResponse(aiRaw, fallback);

        console.log('✅ Image analysis complete:', {
            titleLength: parsed.title?.length || 0,
            tagCount: parsed.tags?.length || 0,
            category: parsed.category
        });

        return {
            title: parsed.title || fallback.title,
            description: parsed.description || 'Image file',
            tags: parsed.tags || ['image'],
            category: parsed.category || 'other',
            extractedText: parsed.extractedText || '',
            summary: parsed.summary || '',
            keyPoints: parsed.keyPoints || []
        };
    } catch (error) {
        console.error('❌ Image analysis error:', error);

        if (isApiError(error) && (error.code === "rate_limited" || error.code === "credits_exhausted")) {
            throw error;
        }

        // Fallback
        return {
            title: fileName.replace(/\.[^/.]+$/, ''),
            description: 'Image file',
            tags: ['image'],
            category: 'other',
            extractedText: '',
            summary: '',
            keyPoints: []
        };
    }
}
