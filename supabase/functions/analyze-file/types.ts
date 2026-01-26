/**
 * Shared types and interfaces for analyze-file edge function
 */

/**
 * Standard result format returned by all file analyzers
 */
export interface AnalysisResult {
    title: string;
    description: string;
    tags: string[];
    category: string;
    extractedText?: string;
    summary?: string;
    keyPoints?: string[];
    previewImageUrl?: string | null;
}

/**
 * Metadata extracted from file formats (PDF, DOCX, etc.)
 */
export interface FileMetadata {
    Title?: string | unknown;
    title?: string | unknown;
    Author?: string | unknown;
    author?: string | unknown;
    Subject?: string | unknown;
    subject?: string | unknown;
    Keywords?: string[] | string | unknown;
    Creator?: string | unknown;
    [key: string]: unknown;
}

/**
 * Processing options with timeout/memory guardrails
 */
export interface ProcessingOptions {
    maxPdfPages: number;
    maxTextChars: number;
    maxAiInputChars: number;
    maxPdfSizeBytes: number;
}

/**
 * Default processing limits to prevent timeouts
 */
export const DEFAULT_PROCESSING_OPTIONS: ProcessingOptions = {
    maxPdfPages: 10,
    maxTextChars: 50000,
    maxAiInputChars: 3000,
    maxPdfSizeBytes: 20 * 1024 * 1024, // 20MB
};

/**
 * API error details type
 */
export type ApiErrorDetails = Record<string, unknown> | string | undefined;

/**
 * Custom error class for API errors with status codes
 */
export class ApiError extends Error {
    status: number;
    code: string;
    details?: ApiErrorDetails;

    constructor(status: number, code: string, message: string, details?: ApiErrorDetails) {
        super(message);
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

/**
 * Type guard for ApiError
 */
export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;

/**
 * Validated request body structure
 */
export interface ValidatedRequest {
    fileUrl: string;
    fileType: string;
    fileName: string;
}

/**
 * AI response metadata extraction result
 */
export interface AiMetadataExtraction {
    raw: string | undefined;
    source: 'tool_calls' | 'content_json' | 'content_text' | 'none';
}

/**
 * PDF extraction result
 */
export interface PdfExtractionResult {
    text: string;
    pageCount: number;
    metadata: FileMetadata;
}

/**
 * DOCX extraction result
 */
export interface DocxExtractionResult {
    text: string;
    metadata: FileMetadata;
}

/**
 * Spreadsheet extraction result
 */
export interface SpreadsheetExtractionResult {
    headers: string[];
    firstRows: string[][];
    rowCount: number;
    columnCount: number;
}

/**
 * Presentation extraction result
 */
export interface PresentationExtractionResult {
    slideCount: number;
    slideTitles: string[];
    bulletPoints: string[];
}
