/**
 * Input validation and security checks
 */

import { ValidatedRequest, ApiError, AiMetadataExtraction } from "./types.ts";
import { validateAndParseAiJson } from "../_shared/metadata-utils.ts";

const MAX_FILE_URL_LENGTH = 2048;
const MAX_FILE_NAME_LENGTH = 255;

/**
 * Check if hostname is blocked (SSRF protection)
 */
export const isBlockedHostname = (hostname: string): boolean => {
    const normalized = hostname.toLowerCase();
    const blockedHosts = new Set([
        "localhost",
        "127.0.0.1",
        "0.0.0.0",
        "169.254.169.254",
        "::1",
    ]);

    if (blockedHosts.has(normalized) || normalized.endsWith(".localhost")) {
        return true;
    }

    const ipv4Match = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
        const [_, a, b] = ipv4Match;
        const first = Number(a);
        const second = Number(b);
        if (first === 10) return true;
        if (first === 127) return true;
        if (first === 0) return true;
        if (first === 192 && second === 168) return true;
        if (first === 169 && second === 254) return true;
        if (first === 172 && second >= 16 && second <= 31) return true;
        return false;
    }

    if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) {
        return true;
    }

    return false;
};

/**
 * Validate and parse request body
 */
export function validateRequestBody(body: unknown): ValidatedRequest {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw new ApiError(400, 'invalid_input', 'Request body must be an object.');
    }

    const { fileUrl: rawFileUrl, fileType: rawFileType, fileName: rawFileName } = body as Record<string, unknown>;
    const validationErrors: string[] = [];

    if (typeof rawFileUrl !== 'string' || rawFileUrl.trim().length === 0) {
        validationErrors.push('fileUrl is required and must be a non-empty string.');
    } else if (rawFileUrl.length > MAX_FILE_URL_LENGTH) {
        validationErrors.push(`fileUrl must be at most ${MAX_FILE_URL_LENGTH} characters.`);
    }

    if (typeof rawFileType !== 'string' || rawFileType.trim().length === 0) {
        validationErrors.push('fileType is required and must be a non-empty string.');
    }

    if (typeof rawFileName !== 'string' || rawFileName.trim().length === 0) {
        validationErrors.push('fileName is required and must be a non-empty string.');
    } else if (rawFileName.length > MAX_FILE_NAME_LENGTH) {
        validationErrors.push(`fileName must be at most ${MAX_FILE_NAME_LENGTH} characters.`);
    }

    if (validationErrors.length > 0) {
        throw new ApiError(400, 'invalid_input', 'Invalid input parameters.', { errors: validationErrors });
    }

    return {
        fileUrl: rawFileUrl as string,
        fileType: rawFileType as string,
        fileName: rawFileName as string,
    };
}

/**
 * Validate file URL format and security
 */
export function validateFileUrl(fileUrl: string): void {
    let parsedUrl: URL;
    try {
        parsedUrl = new URL(fileUrl);
    } catch (urlError) {
        throw new ApiError(400, 'invalid_input', 'fileUrl must be a valid URL.');
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new ApiError(400, 'invalid_input', 'fileUrl must use http or https.');
    }

    if (isBlockedHostname(parsedUrl.hostname)) {
        throw new ApiError(403, 'url_blocked', 'Access to the requested URL is not allowed.');
    }
}

/**
 * Extract AI metadata from response, trying tool_calls first then content field
 */
export function extractAiMetadata(data: any, fallback: Record<string, unknown>): AiMetadataExtraction {
    const isDebug = Deno.env.get('DEBUG') === 'true' || Deno.env.get('LOG_LEVEL')?.toLowerCase() === 'debug';

    console.log('📥 AI response summary:', {
        model: data?.model ?? data?.model_id ?? 'unknown',
        status: 200,
        responseSize: JSON.stringify(data ?? {}).length,
        hasToolCalls: Boolean(data?.choices?.[0]?.message?.tool_calls?.length),
    });

    if (isDebug) {
        console.log('📥 Full AI response:', JSON.stringify(data, null, 2));
    }

    // Try tool_calls first (preferred structured output)
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
        console.log('✅ Found tool_calls response');
        return { raw: toolCall.function.arguments, source: 'tool_calls' };
    }

    // Fallback to content field (Gemini sometimes returns JSON here)
    const content = data.choices?.[0]?.message?.content;
    if (content && typeof content === 'string') {
        console.log('🔄 No tool_calls found, checking content field...');
        if (isDebug) {
            console.log('📄 Content field value:', content.substring(0, 500));
        }

        // Try to extract JSON from content
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            console.log('✅ Found JSON in content field');
            return { raw: jsonMatch[0], source: 'content_json' };
        }

        // Return raw content for text parsing
        console.log('📄 No JSON found, returning raw content for text parsing');
        return { raw: content, source: 'content_text' };
    }

    console.warn('⚠️ No usable AI response found in tool_calls or content');
    return { raw: undefined, source: 'none' };
}

/**
 * Parse AI response with safe fallback
 */
export function parseAiResponse(aiRaw: string | undefined, fallback: Record<string, unknown>): any {
    return validateAndParseAiJson(aiRaw, fallback);
}
