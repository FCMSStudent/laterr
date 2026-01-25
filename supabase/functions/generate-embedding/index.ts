import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Generates multimodal embeddings from text content (tags, summary, extracted text)
 * Uses OpenAI's text-embedding-3-small model for efficient semantic representation
 */
serve(async (req) => {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const startTime = Date.now();
  const requestPath = new URL(req.url).pathname;
  let statusCode = 200;
  const logger = createLogger({ requestId, startTime });

  logger.info('request.start', { method: req.method, path: requestPath });

  if (req.method === 'OPTIONS') {
    const durationMs = Date.now() - startTime;
    logger.info('request.complete', { statusCode, durationMs });
    return new Response(null, { headers: { ...corsHeaders, 'x-request-id': requestId } });
  }

  try {
    const { title, summary, tags, extractedText } = await req.json();

    console.log('🔮 Generating embedding for:', {
      titleLength: title?.length ?? 0,
      tagCount: Array.isArray(tags) ? tags.length : 0,
      summaryLength: summary?.length ?? 0,
      textLength: extractedText?.length ?? 0
    });

    // Construct multimodal text representation
    // Priority: tags (highest weight) > title > summary > extracted text (sample)
    const parts: string[] = [];
    
    // Tags have highest semantic weight
    if (tags && Array.isArray(tags) && tags.length > 0) {
      parts.push(`Tags: ${tags.join(', ')}`);
    }
    
    // Title provides context
    if (title && title.trim()) {
      parts.push(`Title: ${title.trim()}`);
    }
    
    // Summary provides concise semantic meaning
    if (summary && summary.trim()) {
      parts.push(`Summary: ${summary.trim()}`);
    }
    
    // Add sample of extracted text for additional context (limit to 500 chars)
    if (extractedText && extractedText.trim()) {
      const textSample = extractedText.trim().substring(0, 500);
      parts.push(`Content: ${textSample}`);
    }

    const combinedText = parts.join('\n\n');
    
    if (!combinedText.trim()) {
      console.warn('⚠️ No content available for embedding generation');
      return new Response(
        JSON.stringify({ 
          embedding: null,
          message: 'No content available for embedding' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
          status: 200 
        }
      );
    }

    console.log('📝 Combined text metrics for embedding:', { combinedTextLength: combinedText.length, partCount: parts.length });

    // Generate embedding using OpenAI's embedding model directly
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: combinedText,
        encoding_format: "float"
      }),
    });

    if (response.status === 429) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to continue.");
    }
    if (!response.ok) {
      console.error('❌ Embedding API error:', response.status);
      throw new Error(`Embedding generation failed: ${response.statusText}`);
    }

    const data = await response.json();
    const embedding = data.data?.[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Invalid embedding response format");
    }

    // Validate embedding dimension matches database schema (vector(1536))
    // Note: This constant is duplicated because edge functions run in Deno and cannot import from the frontend codebase
    const EXPECTED_DIMENSION = 1536;
    if (embedding.length !== EXPECTED_DIMENSION) {
      console.error(`❌ Embedding dimension mismatch: got ${embedding.length}, expected ${EXPECTED_DIMENSION}`);
      throw new Error(`Invalid embedding dimension: ${embedding.length} (expected ${EXPECTED_DIMENSION})`);
    }

    logger.info('generate-embedding.success', { dimension: embedding.length });

    return new Response(
      JSON.stringify({ 
        embedding,
        dimension: embedding.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
        status: 200 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    statusCode = errorMessage.includes('Rate limit') ? 429 :
                 errorMessage.includes('credits') ? 402 : 500;
    logger.error('generate-embedding.error', { statusCode, message: errorMessage });

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        embedding: null 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
        status: statusCode
      }
    );
  } finally {
    const durationMs = Date.now() - startTime;
    logger.info('request.complete', { statusCode, durationMs, path: requestPath });
  }
});
