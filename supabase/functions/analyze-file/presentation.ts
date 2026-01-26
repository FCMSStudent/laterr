/**
 * PowerPoint presentation processing module
 */

import JSZip from "https://esm.sh/jszip@3.10.1";
import { PresentationExtractionResult, AnalysisResult, isApiError } from "./types.ts";
import { callAiAnalysis, buildAnalysisPrompt } from "./ai.ts";
import { extractAiMetadata, parseAiResponse } from "./validation.ts";

/**
 * Extract content from PowerPoint presentation
 */
export async function extractPresentationContent(fileUrl: string): Promise<PresentationExtractionResult> {
    console.log('📽️ Fetching presentation bytes...');
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch presentation: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    console.log(`📽️ PowerPoint size: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);

    const zip = await JSZip.loadAsync(arrayBuffer);

    // Get all slide files
    const slideFiles = Object.keys(zip.files).filter(name => name.match(/ppt\/slides\/slide\d+\.xml/));
    slideFiles.sort((a, b) => {
        const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
        const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
        return aNum - bNum;
    });

    console.log(`📽️ Found ${slideFiles.length} slides`);

    const slideTitles: string[] = [];
    const bulletPoints: string[] = [];

    // Process each slide (max 20)
    for (const slideFile of slideFiles.slice(0, 20)) {
        const slideXml = await zip.file(slideFile)?.async('string');
        if (!slideXml) continue;

        // Extract all text from <a:t> tags
        const textMatches = slideXml.matchAll(/<a:t>([^<]+)<\/a:t>/g);
        const texts = Array.from(textMatches).map(m => m[1]);

        if (texts.length > 0) {
            slideTitles.push(texts[0]);

            for (let i = 1; i < Math.min(texts.length, 6); i++) {
                if (texts[i].length > 5) {
                    bulletPoints.push(texts[i]);
                }
            }
        }
    }

    console.log(`📽️ Extracted ${slideTitles.length} titles and ${bulletPoints.length} bullet points`);

    return {
        slideCount: slideFiles.length,
        slideTitles,
        bulletPoints: bulletPoints.slice(0, 15)
    };
}

/**
 * Process PowerPoint file
 */
export async function processPresentation(
    fileUrl: string,
    fileName: string,
    apiKey: string
): Promise<AnalysisResult> {
    console.log('📽️ Processing presentation');

    try {
        const { slideCount, slideTitles, bulletPoints } = await extractPresentationContent(fileUrl);

        const contentSample = [
            `Total slides: ${slideCount}`,
            `\nSlide titles:`,
            ...slideTitles.slice(0, 10).map((t, i) => `${i + 1}. ${t}`),
            `\nKey bullet points:`,
            ...bulletPoints.slice(0, 10).map(b => `• ${b}`)
        ].join('\n');

        const prompt = buildAnalysisPrompt('application/vnd.openxmlformats-officedocument.presentationml.presentation', fileName, {
            textSample: contentSample,
            slideCount
        });

        const data = await callAiAnalysis(apiKey, prompt);

        const fallback = {
            title: fileName.replace(/\.[^/.]+$/, ''),
            description: `Presentation with ${slideCount} slides`,
            tags: ['presentation', 'slides', 'powerpoint'],
            category: 'business'
        };

        const { raw: aiRaw } = extractAiMetadata(data, fallback);
        const parsed = parseAiResponse(aiRaw, fallback);

        console.log('✅ Presentation analysis complete');

        return {
            title: parsed.title || fallback.title,
            description: parsed.description || fallback.description,
            tags: parsed.tags || fallback.tags,
            category: parsed.category || 'business',
            extractedText: contentSample,
            summary: parsed.summary || '',
            keyPoints: parsed.keyPoints || []
        };
    } catch (error) {
        console.error('❌ Presentation processing error:', error);

        if (isApiError(error) && (error.code === "rate_limited" || error.code === "credits_exhausted")) {
            throw error;
        }

        return {
            title: fileName.replace(/\.[^/.]+$/, ''),
            description: 'Presentation slides',
            tags: ['presentation', 'slides'],
            category: 'business',
            extractedText: '',
            summary: '',
            keyPoints: []
        };
    }
}
