import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    const { tagName, prompt } = await req.json();
    
    if (!tagName || !prompt) {
      throw new Error('Tag name and prompt are required');
    }

    logger.info('generate-tag-icon.requested', { tagName });
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    
    // Use the image generation model
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: `Generate a simple, minimalist icon: ${prompt}. The icon should be clean, modern, and work well at small sizes. Style: flat design, monochromatic or subtle colors.`
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    const aiData = await aiResponse.json();
    logger.debug('generate-tag-icon.response-received');
    
    // Extract the generated image
    const imageData = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageData) {
      throw new Error('No image data received from AI');
    }

    return new Response(
      JSON.stringify({
        iconUrl: imageData,
        tagName
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
    );

  } catch (error) {
    statusCode = 500;
    logger.error('generate-tag-icon.error', { statusCode, message: error instanceof Error ? error.message : 'Unknown error' });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } 
      }
    );
  } finally {
    const durationMs = Date.now() - startTime;
    logger.info('request.complete', { statusCode, durationMs, path: requestPath });
  }
});
