/**
 * PDF processing module
 */

import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.6.82/legacy/build/pdf.mjs";
import { PdfExtractionResult, FileMetadata, DEFAULT_PROCESSING_OPTIONS, AnalysisResult, ApiError, isApiError } from "./types.ts";
import { callAiAnalysis, buildAnalysisPrompt } from "./ai.ts";
import { extractAiMetadata, parseAiResponse } from "./validation.ts";
import { cleanTitle } from "../_shared/metadata-utils.ts";

const pdfjs = pdfjsLib as unknown as {
    GlobalWorkerOptions?: { workerSrc: string };
};

if (pdfjs?.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.6.82/legacy/build/pdf.worker.mjs";
}

const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 200;
const MIN_TEXT_FOR_MULTIMODAL_BYPASS = 50;

/**
 * Extract text from PDF using pdfjs-dist
 */
export async function extractPdfText(fileUrl: string): Promise<PdfExtractionResult> {
    try {
        console.log('📄 Fetching PDF bytes...');
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        console.log(`📄 PDF size: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true,
        });

        const pdf = await loadingTask.promise;
        const pageCount = pdf.numPages;
        console.log(`📄 PDF has ${pageCount} pages`);

        // Extract metadata
        let metadata: FileMetadata = {};
        try {
            const pdfMetadata = await pdf.getMetadata();
            metadata = (pdfMetadata.info || {}) as FileMetadata;
            console.log('📄 PDF metadata:', Object.keys(metadata));
        } catch (e) {
            console.log('⚠️ Could not extract PDF metadata');
        }

        // Extract text from first N pages with guardrail
        const pagesToExtract = Math.min(pageCount, DEFAULT_PROCESSING_OPTIONS.maxPdfPages);
        const textParts: string[] = [];
        let totalChars = 0;
        const maxChars = DEFAULT_PROCESSING_OPTIONS.maxTextChars;

        for (let i = 1; i <= pagesToExtract && totalChars < maxChars; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items
                    .map((item: any) => (item.str || ''))
                    .join(' ')
                    .replace(/\s+/g, ' ')
                    .trim();

                if (pageText) {
                    textParts.push(pageText);
                    totalChars += pageText.length;
                    console.log(`📄 Page ${i}: ${pageText.length} chars extracted`);
                }
            } catch (pageError) {
                console.error(`⚠️ Error extracting page ${i}:`, pageError);
            }
        }

        const fullText = textParts.join('\n\n').substring(0, maxChars);
        console.log(`✅ PDF extraction complete: ${fullText.length} total chars from ${textParts.length} pages`);

        return {
            text: fullText,
            pageCount,
            metadata
        };
    } catch (error) {
        console.error('❌ PDF extraction failed:', error);
        // Return empty result instead of throwing
        return {
            text: '',
            pageCount: 0,
            metadata: {}
        };
    }
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

/**
 * Analyze PDF using multimodal AI (sends raw PDF bytes)
 */
async function analyzePdfWithMultimodal(
    fileUrl: string,
    fileName: string,
    apiKey: string,
    extractedText?: string,
    metadata?: FileMetadata
): Promise<AnalysisResult> {
    console.log('🔄 Using RAW PDF BYTES approach with Gemini multimodal...');
    console.log(`📊 Text available: ${extractedText ? extractedText.length : 0} chars`);

    // Fetch raw PDF bytes
    const pdfResponse = await fetch(fileUrl);
    if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
    }

    const pdfArrayBuffer = await pdfResponse.arrayBuffer();
    const pdfSizeKB = (pdfArrayBuffer.byteLength / 1024).toFixed(2);
    console.log(`📄 PDF size for multimodal: ${pdfSizeKB} KB`);

    // Check size limit
    if (pdfArrayBuffer.byteLength > DEFAULT_PROCESSING_OPTIONS.maxPdfSizeBytes) {
        console.warn(`⚠️ PDF too large for inline processing (${pdfSizeKB} KB > 20MB)`);
        throw new Error('PDF too large for multimodal processing');
    }

    // Convert to base64
    const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);
    console.log(`✅ Converted PDF to base64`);

    // Build prompt
    let promptText = `Analyze this PDF document and extract structured metadata.\n\n**Filename**: ${fileName}\n\n`;

    if (metadata && Object.keys(metadata).length > 0) {
        promptText += `**PDF Metadata**:\n`;
        const metaTitle = metadata.Title || metadata.title;
        const metaAuthor = metadata.Author || metadata.author;
        const metaSubject = metadata.Subject || metadata.subject;

        if (metaTitle) promptText += `- Title: ${metaTitle}\n`;
        if (metaAuthor) promptText += `- Author: ${metaAuthor}\n`;
        if (metaSubject) promptText += `- Subject: ${metaSubject}\n`;
        promptText += '\n';
    }

    if (extractedText && extractedText.trim().length > 0) {
        const textSample = extractedText.substring(0, 1000);
        promptText += `**Supplementary extracted text** (first ${Math.min(extractedText.length, 1000)} chars):\n${textSample}\n\n`;
    }

    promptText += `Provide: title, description, category, 4-6 tags, 2-3 sentence summary, and 3-5 key points.\n\nUse the analyze_file function.`;

    const data = await callAiAnalysis(apiKey, promptText, undefined, pdfBase64);

    // Build fallback
    const metaTitle = metadata?.Title || metadata?.title;
    const fallback = {
        title: (metaTitle && typeof metaTitle === 'string' && metaTitle.length > MIN_TITLE_LENGTH)
            ? cleanTitle(metaTitle)
            : fileName.replace(/\.[^/.]+$/, ''),
        description: 'PDF document',
        tags: ['pdf', 'document'],
        category: 'other',
        summary: '',
        keyPoints: []
    };

    const { raw: aiRaw } = extractAiMetadata(data, fallback);
    const parsed = parseAiResponse(aiRaw, fallback);

    console.log('✅ PDF multimodal analysis complete');

    return {
        title: parsed.title || fallback.title,
        description: parsed.description || fallback.description,
        tags: parsed.tags || fallback.tags,
        category: parsed.category || fallback.category,
        summary: parsed.summary || fallback.summary,
        keyPoints: parsed.keyPoints || fallback.keyPoints
    };
}

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
 * Process PDF file
 */
export async function processPdf(
    fileUrl: string,
    fileName: string,
    apiKey: string
): Promise<AnalysisResult> {
    console.log('📄 Processing PDF with enhanced analysis');

    const { text, pageCount, metadata } = await extractPdfText(fileUrl);
    let extractedText = text;

    console.log(`📊 PDF: ${pageCount} pages, ${extractedText.length} chars extracted`);

    // Check if we should use multimodal
    const hasMinimalText = extractedText && extractedText.trim().length > 0 && extractedText.trim().length < MIN_TEXT_FOR_MULTIMODAL_BYPASS;
    const hasNoText = !extractedText || extractedText.trim().length === 0;

    if (hasNoText || hasMinimalText) {
        console.log(`⚠️ PDF text extraction ${hasNoText ? 'failed' : 'minimal'} (${extractedText.trim().length} chars)`);
        console.log('🔄 Attempting multimodal fallback...');

        try {
            const result = await analyzePdfWithMultimodal(fileUrl, fileName, apiKey, extractedText, metadata);
            return { ...result, extractedText };
        } catch (multimodalError) {
            console.error('❌ Multimodal fallback failed');
            if (isApiError(multimodalError) && (multimodalError.code === "rate_limited" || multimodalError.code === "credits_exhausted")) {
                throw multimodalError;
            }

            // Metadata-based fallback
            const metaTitle = metadata.Title || metadata.title;
            const title = (metaTitle && typeof metaTitle === 'string' && metaTitle.length > MIN_TITLE_LENGTH && metaTitle.length < MAX_TITLE_LENGTH)
                ? cleanTitle(metaTitle)
                : fileName.replace(/\.[^/.]+$/, '');

            return {
                title,
                description: `PDF document with ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`,
                tags: ['pdf', 'document'],
                category: 'other',
                extractedText,
                summary: extractedText && extractedText.trim().length > 0
                    ? `PDF document containing ${extractedText.trim().length} characters of text.`
                    : '',
                keyPoints: []
            };
        }
    }

    // Text-based analysis
    console.log('✅ Using text-based AI analysis');

    const textSample = extractedText.length > 15000
        ? sampleText(extractedText, DEFAULT_PROCESSING_OPTIONS.maxAiInputChars)
        : sampleText(extractedText, 2500);

    const prompt = buildAnalysisPrompt('application/pdf', fileName, {
        textSample,
        metadata,
        pageCount
    });

    const data = await callAiAnalysis(apiKey, prompt);

    const metaTitle = metadata.Title || metadata.title;
    let title = (metaTitle && typeof metaTitle === 'string' && metaTitle.length > MIN_TITLE_LENGTH && metaTitle.length < MAX_TITLE_LENGTH)
        ? cleanTitle(metaTitle)
        : fileName.replace(/\.[^/.]+$/, '');

    const fallback = {
        title,
        description: `PDF document with ${pageCount} pages`,
        tags: ['pdf', 'document'],
        category: 'other'
    };

    const { raw: aiRaw } = extractAiMetadata(data, fallback);
    const parsed = parseAiResponse(aiRaw, fallback);

    console.log('✅ PDF text-based analysis complete');

    return {
        title: parsed.title || title,
        description: parsed.description || fallback.description,
        tags: parsed.tags || fallback.tags,
        category: parsed.category || fallback.category,
        extractedText,
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || []
    };
}

/**
 * Generate PDF thumbnail (placeholder - not available in edge runtime)
 */
export async function generatePdfThumbnail(): Promise<string | null> {
    console.log('🖼️ PDF thumbnail generation not supported in edge runtime');
    return null;
}
