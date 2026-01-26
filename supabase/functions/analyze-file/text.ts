/**
 * Text file processing module
 */

import { AnalysisResult, DEFAULT_PROCESSING_OPTIONS, isApiError } from "./types.ts";
import { callAiAnalysis, buildAnalysisPrompt } from "./ai.ts";
import { extractAiMetadata, parseAiResponse } from "./validation.ts";

/**
 * Sample text intelligently (head, middle, tail)
 */
function sampleText(text: string, maxChars: number = 2500): string {
    if (text.length <= maxChars) return text;

    const chunkSize = Math.floor(maxChars / 3);
    const head = text.substring(0, chunkSize);
    const middle = text.substring(Math.floor(text.length / 2) - Math.floor(chunkSize / 2), Math.floor(text.length / 2) + Math.floor(chunkSize / 2));
    const tail = text.substring(text.length - chunkSize);

    return `${head}\n\n[...middle section...]\n\n${middle}\n\n[...end section...]\n\n${tail}`;
}

/**
 * Process text file (.txt, .md)
 */
export async function processTextFile(
    fileUrl: string,
    fileName: string,
    fileType: string,
    apiKey: string
): Promise<AnalysisResult> {
    console.log('📄 Processing text file');

    try {
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
            throw new Error(`Failed to fetch text file: ${fileResponse.status}`);
        }

        const textContent = await fileResponse.text();
        const extractedText = textContent.substring(0, DEFAULT_PROCESSING_OPTIONS.maxTextChars);

        const textSample = sampleText(extractedText, 2000);
        const prompt = buildAnalysisPrompt(fileType, fileName, {
            textSample
        });

        const data = await callAiAnalysis(apiKey, prompt);

        const fallback = {
            title: fileName.replace(/\.[^/.]+$/, ''),
            description: 'Text file',
            tags: ['text'],
            category: 'other'
        };

        const { raw: aiRaw } = extractAiMetadata(data, fallback);
        const parsed = parseAiResponse(aiRaw, fallback);

        console.log('✅ Text file analysis complete');

        return {
            title: parsed.title || fallback.title,
            description: parsed.description || 'Text file',
            tags: parsed.tags || ['text'],
            category: parsed.category || 'other',
            extractedText,
            summary: parsed.summary || '',
            keyPoints: parsed.keyPoints || []
        };
    } catch (error) {
        console.error('❌ Text file processing error:', error);

        if (isApiError(error) && (error.code === "rate_limited" || error.code === "credits_exhausted")) {
            throw error;
        }

        return {
            title: fileName.replace(/\.[^/.]+$/, ''),
            description: 'Text file',
            tags: ['text', 'document'],
            category: 'other',
            extractedText: '',
            summary: '',
            keyPoints: []
        };
    }
}
