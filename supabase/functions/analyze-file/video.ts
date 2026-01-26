/**
 * Video and audio file processing module
 */

import { AnalysisResult } from "./types.ts";
import { cleanTitle, cleanMetadataFields } from "../_shared/metadata-utils.ts";

/**
 * Process video file
 */
export async function processVideo(
    fileName: string
): Promise<AnalysisResult> {
    console.log('🎬 Processing video file');

    const title = cleanTitle(fileName || 'Video');
    const cleaned = cleanMetadataFields({
        tags: ['video', 'media', 'watch later']
    });

    console.log('✅ Video file processed');

    return {
        title,
        description: 'Video file',
        tags: cleaned.tags || ['video', 'media'],
        category: 'other',
        extractedText: '',
        summary: `Video file: ${fileName}`,
        keyPoints: [],
        previewImageUrl: null
    };
}

/**
 * Process audio file
 */
export async function processAudio(
    fileName: string
): Promise<AnalysisResult> {
    console.log('🎵 Processing audio file');

    const title = cleanTitle(fileName || 'Audio');
    const cleaned = cleanMetadataFields({
        tags: ['audio', 'media']
    });

    console.log('✅ Audio file processed');

    return {
        title,
        description: 'Audio file',
        tags: cleaned.tags || ['audio', 'media'],
        category: 'other',
        extractedText: '',
        summary: `Audio file: ${fileName}`,
        keyPoints: [],
        previewImageUrl: null
    };
}

/**
 * Generate video thumbnail (placeholder - not available in edge runtime)
 */
export async function generateVideoThumbnail(): Promise<string | null> {
    console.log('🎬 Video thumbnail: Marking for client-side extraction');
    return null;
}
