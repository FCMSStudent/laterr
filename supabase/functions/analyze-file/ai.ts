/**
 * AI request handling with retry logic and structured output
 */

import { ApiError } from "./types.ts";

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

/**
 * Structured output schema for file analysis
 */
export const analyzeFileToolSchema = {
    type: "function",
    function: {
        name: "analyze_file",
        description: "Extract structured metadata from a file",
        parameters: {
            type: "object",
            properties: {
                title: {
                    type: "string",
                    description: "Clean, descriptive title for the file"
                },
                description: {
                    type: "string",
                    description: "Detailed description of file content and purpose"
                },
                tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "4-6 relevant categorization tags"
                },
                category: {
                    type: "string",
                    description: "Primary category (academic, business, personal, technical, medical, financial, legal, creative)",
                    enum: ["academic", "business", "personal", "technical", "medical", "financial", "legal", "creative", "other"]
                },
                extractedText: {
                    type: "string",
                    description: "Key text content extracted from the file (OCR for images, main content for documents)"
                },
                summary: {
                    type: "string",
                    description: "2-3 sentence summary of the file's main content and purpose"
                },
                keyPoints: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 key points or takeaways from the content"
                }
            },
            required: ["title", "description", "tags", "category"]
        }
    }
};

/**
 * Make AI API call with retry logic for rate limits (429 errors)
 */
export async function fetchWithRetry(
    url: string,
    options: RequestInit,
    retryCount = 0
): Promise<Response> {
    try {
        const response = await fetch(url, options);

        // If rate limited and we have retries left, wait and retry
        if (response.status === 429 && retryCount < MAX_RETRIES) {
            const delay = RETRY_DELAYS[retryCount];
            console.log(`⏳ Rate limit hit (429). Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retryCount + 1);
        }

        return response;
    } catch (error) {
        // For network errors, also retry if we have attempts left
        if (retryCount < MAX_RETRIES) {
            const delay = RETRY_DELAYS[retryCount];
            console.log(`⚠️ Network error. Retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return fetchWithRetry(url, options, retryCount + 1);
        }
        throw error;
    }
}

/**
 * Create AI provider error based on HTTP status
 */
export function createAiProviderError(status: number, statusText: string): ApiError {
    const isProviderFailure = status >= 500;
    const errorStatus = isProviderFailure ? 502 : 500;
    const code = isProviderFailure ? "ai_error" : "internal_error";
    return new ApiError(
        errorStatus,
        code,
        "AI provider error.",
        { status, statusText }
    );
}

/**
 * Call AI for file analysis with structured output
 */
export async function callAiAnalysis(
    apiKey: string,
    prompt: string,
    imageUrl?: string,
    pdfBase64?: string
): Promise<any> {
    const contentParts: any[] = [{ type: "text", text: prompt }];

    if (imageUrl) {
        contentParts.push({
            type: "image_url",
            image_url: { url: imageUrl }
        });
    }

    if (pdfBase64) {
        contentParts.push({
            type: "image_url",
            image_url: {
                url: `data:application/pdf;base64,${pdfBase64}`
            }
        });
    }

    const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{
                role: "user",
                content: contentParts
            }],
            tools: [analyzeFileToolSchema],
            tool_choice: { type: "function", function: { name: "analyze_file" } }
        }),
    });

    if (response.status === 429) {
        console.error('❌ Rate limit exceeded after retries');
        throw new ApiError(429, "rate_limited", "Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
        console.error('❌ AI credits exhausted');
        throw new ApiError(402, "credits_exhausted", "AI credits exhausted. Please add credits to continue.");
    }
    if (!response.ok) {
        console.error('❌ AI gateway error:', response.status);
        throw createAiProviderError(response.status, response.statusText);
    }

    return await response.json();
}

/**
 * Call AI for simple text generation (summary, etc.)
 */
export async function callAiSimple(
    apiKey: string,
    prompt: string,
    useJsonMode = false
): Promise<any> {
    const body: any = {
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
    };

    if (useJsonMode) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetchWithRetry("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (response.ok) {
        return await response.json();
    }

    return null;
}

/**
 * Build analysis prompt for different file types
 */
export function buildAnalysisPrompt(
    fileType: string,
    fileName: string,
    context: {
        textSample?: string;
        metadata?: Record<string, unknown>;
        pageCount?: number;
        rowCount?: number;
        columnCount?: number;
        slideCount?: number;
    }
): string {
    const baseInstruction = `**CRITICAL: Base your response ONLY on the provided content. Do not infer, assume, or add information not present in the text.**\n\n`;

    let prompt = baseInstruction;
    prompt += `**Filename**: ${fileName}\n\n`;

    if (context.metadata && Object.keys(context.metadata).length > 0) {
        prompt += `**Metadata**: ${JSON.stringify(context.metadata)}\n\n`;
    }

    if (context.pageCount) {
        prompt += `**Pages**: ${context.pageCount}\n\n`;
    }

    if (context.rowCount && context.columnCount) {
        prompt += `**Structure**: ${context.rowCount} rows, ${context.columnCount} columns\n\n`;
    }

    if (context.slideCount) {
        prompt += `**Total slides**: ${context.slideCount}\n\n`;
    }

    if (context.textSample) {
        prompt += `**Content Sample**:\n${context.textSample}\n\n`;
    }

    prompt += `Provide structured metadata:\n`;
    prompt += `1. **Title**: Descriptive title based on actual content\n`;
    prompt += `2. **Description**: Detailed description based only on visible content\n`;
    prompt += `3. **Category**: Classify as academic, business, personal, technical, medical, financial, legal, creative, or other\n`;
    prompt += `4. **Tags**: 4-6 specific tags based strictly on the content\n`;
    prompt += `5. **Summary**: 2-3 sentence summary of the main content\n`;
    prompt += `6. **Key Points**: 3-5 main topics or findings from the content\n\n`;
    prompt += `Use the analyze_file function to provide structured output.`;

    return prompt;
}
