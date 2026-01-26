/**
 * Word document (DOCX) processing module
 */

import JSZip from "https://esm.sh/jszip@3.10.1";
import { DocxExtractionResult, AnalysisResult, DEFAULT_PROCESSING_OPTIONS, isApiError } from "./types.ts";
import { callAiAnalysis, buildAnalysisPrompt } from "./ai.ts";
import { extractAiMetadata, parseAiResponse } from "./validation.ts";
import { cleanTitle } from "../_shared/metadata-utils.ts";

/**
 * Extract text from DOCX file
 */
export async function extractDocxText(fileUrl: string): Promise<DocxExtractionResult> {
    console.log('📝 Fetching DOCX bytes...');
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch DOCX: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    console.log(`📝 DOCX size: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);

    const zip = await JSZip.loadAsync(arrayBuffer);

    // Extract document text
    let documentText = '';
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (docXml) {
        const textMatches = docXml.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        const textParts = Array.from(textMatches).map(match => match[1]);
        documentText = textParts.join(' ').replace(/\s+/g, ' ').trim();
        console.log(`📝 Extracted ${documentText.length} chars from document.xml`);
    }

    // Extract metadata
    let metadata: Record<string, unknown> = {};
    const coreXml = await zip.file('docProps/core.xml')?.async('string');
    if (coreXml) {
        const titleMatch = coreXml.match(/<dc:title>([^<]+)<\/dc:title>/);
        const creatorMatch = coreXml.match(/<dc:creator>([^<]+)<\/dc:creator>/);
        const subjectMatch = coreXml.match(/<dc:subject>([^<]+)<\/dc:subject>/);
        const keywordsMatch = coreXml.match(/<cp:keywords>([^<]+)<\/cp:keywords>/);

        metadata = {
            Title: titleMatch?.[1] || '',
            Creator: creatorMatch?.[1] || '',
            Subject: subjectMatch?.[1] || '',
            Keywords: keywordsMatch?.[1]?.split(',').map((keyword) => keyword.trim()).filter(Boolean) || [],
        };
        console.log('📝 DOCX metadata fields:', Object.keys(metadata));
    }

    const finalText = documentText.substring(0, DEFAULT_PROCESSING_OPTIONS.maxTextChars);
    console.log(`✅ DOCX extraction complete: ${finalText.length} chars`);

    return {
        text: finalText,
        metadata
    };
}

/**
 * Sample text intelligently
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
 * Process DOCX file
 */
export async function processDocx(
    fileUrl: string,
    fileName: string,
    apiKey: string
): Promise<AnalysisResult> {
    console.log('📝 Processing Word document');

    try {
        const { text, metadata } = await extractDocxText(fileUrl);
        const extractedText = text;

        // Use embedded title if meaningful
        let title = fileName.replace(/\.[^/.]+$/, '');
        if (metadata.Title && typeof metadata.Title === 'string' && metadata.Title.length > 3 && metadata.Title.length < 200) {
            title = cleanTitle(metadata.Title);
            console.log('📝 Using embedded DOCX title');
        }

        // Sample text for AI
        const textSample = extractedText.length > 15000
            ? sampleText(extractedText, DEFAULT_PROCESSING_OPTIONS.maxAiInputChars)
            : sampleText(extractedText, 2500);

        const prompt = buildAnalysisPrompt('application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileName, {
            textSample,
            metadata
        });

        const data = await callAiAnalysis(apiKey, prompt);

        const fallback = {
            title,
            description: 'Word document',
            tags: ['word', 'document'],
            category: 'other'
        };

        const { raw: aiRaw } = extractAiMetadata(data, fallback);
        const parsed = parseAiResponse(aiRaw, fallback);

        console.log('✅ DOCX analysis complete');

        return {
            title: parsed.title || title,
            description: parsed.description || 'Word document',
            tags: parsed.tags || ['word', 'document'],
            category: parsed.category || 'other',
            extractedText,
            summary: parsed.summary || '',
            keyPoints: parsed.keyPoints || []
        };
    } catch (error) {
        console.error('❌ DOCX processing error:', error);

        if (isApiError(error) && (error.code === "rate_limited" || error.code === "credits_exhausted")) {
            throw error;
        }

        return {
            title: fileName.replace(/\.[^/.]+$/, ''),
            description: 'Word document',
            tags: ['word', 'document'],
            category: 'other',
            extractedText: '',
            summary: '',
            keyPoints: []
        };
    }
}
