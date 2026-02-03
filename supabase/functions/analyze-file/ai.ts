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
    const baseInstruction = `You are an expert document analyzer that extracts comprehensive metadata with high accuracy.

**CRITICAL RULES**:
1. Base your response ONLY on the provided content
2. Do not infer, assume, or add information not present in the text
3. Be specific and factual in all fields
4. Generate descriptive tags based on actual content themes
5. Provide confidence assessment based on available content

`;

    let prompt = baseInstruction;
    prompt += `**Filename**: ${fileName}\n`;
    prompt += `**File Type**: ${fileType}\n\n`;

    if (context.metadata && Object.keys(context.metadata).length > 0) {
        prompt += `**Metadata**: ${JSON.stringify(context.metadata)}\n\n`;
    }

    if (context.pageCount) {
        prompt += `**Document Structure**: ${context.pageCount} pages\n\n`;
    }

    if (context.rowCount && context.columnCount) {
        prompt += `**Spreadsheet Structure**: ${context.rowCount} rows × ${context.columnCount} columns\n\n`;
    }

    if (context.slideCount) {
        prompt += `**Presentation**: ${context.slideCount} slides\n\n`;
    }

    if (context.textSample) {
        const sampleLength = context.textSample.length;
        prompt += `**Content Sample** (${sampleLength} chars):\n${context.textSample}\n\n`;
    }

    prompt += `**Your Task**: Extract comprehensive metadata using the analyze_file function:\n\n`;
    prompt += `1. **Title**: Create a clear, descriptive title based on actual content (max 100 chars)\n`;
    prompt += `   - Use document heading or main topic\n`;
    prompt += `   - Improve filename if needed for clarity\n`;
    prompt += `   - Be concise but informative\n\n`;
    
    prompt += `2. **Description**: Write a detailed description (100-300 chars)\n`;
    prompt += `   - Describe what the document is about\n`;
    prompt += `   - Include purpose and key information\n`;
    prompt += `   - Base only on visible content\n\n`;
    
    prompt += `3. **Category**: Choose ONE most specific category:\n`;
    prompt += `   - academic: Research papers, theses, study materials\n`;
    prompt += `   - business: Reports, proposals, contracts, invoices\n`;
    prompt += `   - personal: Letters, resumes, journals, notes\n`;
    prompt += `   - technical: Manuals, specs, documentation, code\n`;
    prompt += `   - medical: Health records, prescriptions, research\n`;
    prompt += `   - financial: Statements, budgets, tax documents\n`;
    prompt += `   - legal: Contracts, agreements, policies\n`;
    prompt += `   - creative: Designs, artwork, stories, music\n`;
    prompt += `   - other: If none of the above fit\n\n`;
    
    prompt += `4. **Tags**: Generate 4-6 specific, relevant tags\n`;
    prompt += `   - Use lowercase with hyphens (e.g., "project-management")\n`;
    prompt += `   - Focus on topics, themes, and content types\n`;
    prompt += `   - Include document type (pdf, report, presentation, etc.)\n`;
    prompt += `   - Add domain-specific tags when applicable\n\n`;
    
    prompt += `5. **Summary**: Write a concise 2-3 sentence summary\n`;
    prompt += `   - Capture the main point or purpose\n`;
    prompt += `   - Include key findings or conclusions if present\n`;
    prompt += `   - Keep it factual and informative\n\n`;
    
    prompt += `6. **Key Points**: Extract 3-5 main points or takeaways\n`;
    prompt += `   - Focus on important information\n`;
    prompt += `   - Use bullet-point style\n`;
    prompt += `   - Be specific and actionable\n\n`;
    
    prompt += `7. **Extracted Text**: Include important text content\n`;
    prompt += `   - Main headings and subheadings\n`;
    prompt += `   - Key quotes or statements\n`;
    prompt += `   - Important data or findings\n\n`;

    prompt += `Provide all metadata using the analyze_file function with structured output.`;

    return prompt;
}
