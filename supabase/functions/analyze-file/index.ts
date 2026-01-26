import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { createLogger } from "../_shared/logger.ts";
import { cleanMetadataFields } from "../_shared/metadata-utils.ts";
import { ApiError, isApiError, AnalysisResult } from "./types.ts";
import { validateRequestBody, validateFileUrl } from "./validation.ts";
import { processPdf, generatePdfThumbnail } from "./pdf.ts";
import { processImage } from "./image.ts";
import { processDocx } from "./docx.ts";
import { processSpreadsheet } from "./spreadsheet.ts";
import { processPresentation } from "./presentation.ts";
import { processTextFile } from "./text.ts";
import { processVideo, processAudio, generateVideoThumbnail } from "./video.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Create standardized error response
 */
const createErrorResponse = (
  status: number,
  code: string,
  message: string,
  details?: string[],
  requestId?: string
) => {
  const body = {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
};

/**
 * Route file to appropriate processor based on type
 */
async function routeFileProcessor(
  fileUrl: string,
  fileType: string,
  fileName: string,
  apiKey: string,
  userId?: string
): Promise<AnalysisResult> {
  console.log('🔍 Analyzing file:', { fileType, fileName });

  let result: AnalysisResult;
  let previewImageUrl: string | null = null;

  // Route based on file type
  if (fileType.startsWith('image/')) {
    result = await processImage(fileUrl, fileName, apiKey);
  } else if (fileType === 'application/pdf') {
    result = await processPdf(fileUrl, fileName, apiKey);
    // Generate thumbnail if userId available
    if (userId) {
      previewImageUrl = await generatePdfThumbnail();
    }
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileType === 'application/msword') {
    result = await processDocx(fileUrl, fileName, apiKey);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileType === 'application/vnd.ms-excel' || fileType === 'text/csv') {
    result = await processSpreadsheet(fileUrl, fileName, fileType, apiKey);
  } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || fileType === 'application/vnd.ms-powerpoint') {
    result = await processPresentation(fileUrl, fileName, apiKey);
  } else if (fileType === 'text/plain' || fileType === 'text/markdown') {
    result = await processTextFile(fileUrl, fileName, fileType, apiKey);
  } else if (fileType.startsWith('video/')) {
    result = await processVideo(fileName);
    if (userId) {
      previewImageUrl = await generateVideoThumbnail();
    }
  } else if (fileType.startsWith('audio/')) {
    result = await processAudio(fileName);
  } else {
    // Generic file
    console.log('📦 Processing generic file');
    result = {
      title: fileName.replace(/\.[^/.]+$/, ''),
      description: 'Uploaded file',
      tags: ['file'],
      category: 'other',
      extractedText: '',
      summary: '',
      keyPoints: []
    };
  }

  // Add preview image if generated
  if (previewImageUrl) {
    result.previewImageUrl = previewImageUrl;
  }

  return result;
}

/**
 * Main request handler
 */
serve(async (req) => {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const startTime = Date.now();
  const requestPath = new URL(req.url).pathname;
  let statusCode = 200;
  const logger = createLogger({ requestId, startTime });
  let activeLogger = logger;

  logger.info('request.start', { method: req.method, path: requestPath });

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const durationMs = Date.now() - startTime;
    logger.info('request.complete', { statusCode, durationMs });
    return new Response(null, { headers: { ...corsHeaders, 'x-request-id': requestId } });
  }

  try {
    // Validate authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      statusCode = 401;
      logger.warn('auth.missing', { message: 'Missing Authorization header' });
      return createErrorResponse(401, 'auth_missing', 'Authorization header is required.', undefined, requestId);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('Supabase credentials are not configured');
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      statusCode = 401;
      logger.warn('auth.invalid', { message: 'Invalid authorization token', error: authError?.message });
      return createErrorResponse(401, 'auth_invalid', 'Invalid authorization token.', undefined, requestId);
    }

    const userId = user.id;
    console.log('✅ User authenticated');
    const userLogger = createLogger({ requestId, startTime, userId: userId ?? undefined });
    activeLogger = userLogger;

    // Parse and validate request body
    let body: unknown;
    try {
      body = await req.json();
    } catch (parseError) {
      statusCode = 400;
      logger.warn('request.invalid_json', { message: 'Invalid JSON body', error: parseError });
      return createErrorResponse(400, 'invalid_json', 'Request body must be valid JSON.', undefined, requestId);
    }

    const { fileUrl, fileType, fileName } = validateRequestBody(body);
    validateFileUrl(fileUrl);

    // Get API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Process file
    const result = await routeFileProcessor(fileUrl, fileType, fileName, LOVABLE_API_KEY, userId);

    // Ensure tags have fallback
    if (!result.tags || result.tags.length === 0 || result.tags[0] === 'file') {
      const typeTag = fileType.split('/')[1] || 'file';
      result.tags = [typeTag, 'document'];
    }

    // Final cleanup pass on metadata
    const finalMetadata = cleanMetadataFields({
      title: result.title,
      description: result.description,
      tags: result.tags,
      extractedText: result.extractedText?.substring(0, 5000), // Store first 5k
      category: result.category,
      summary: result.summary,
      keyPoints: result.keyPoints
    });

    console.log('✅ Analysis complete:', {
      titleLength: finalMetadata.title?.length || 0,
      category: finalMetadata.category,
      tagCount: finalMetadata.tags?.length || 0,
      extractedTextLength: finalMetadata.extractedText?.length || 0,
      hasSummary: !!finalMetadata.summary,
      summaryLength: finalMetadata.summary?.length || 0,
      keyPointsCount: finalMetadata.keyPoints?.length || 0,
      hasPreviewImage: !!result.previewImageUrl
    });

    return new Response(
      JSON.stringify({
        title: finalMetadata.title,
        description: finalMetadata.description,
        tags: finalMetadata.tags,
        extractedText: finalMetadata.extractedText,
        category: finalMetadata.category,
        summary: finalMetadata.summary,
        keyPoints: finalMetadata.keyPoints,
        previewImageUrl: result.previewImageUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
      }
    );
  } catch (error) {
    const apiError = isApiError(error) ? error : new ApiError(500, "internal_error", "An unexpected error occurred");
    statusCode = apiError.status;
    activeLogger.error('analyze-file.error', {
      statusCode,
      code: apiError.code,
      message: apiError.message,
      details: apiError.details
    });
    return new Response(
      JSON.stringify({
        error: {
          code: apiError.code,
          message: apiError.message,
          details: apiError.details
        }
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
      }
    );
  } finally {
    const durationMs = Date.now() - startTime;
    activeLogger.info('request.complete', { statusCode, durationMs, path: requestPath });
  }
});
