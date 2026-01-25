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
  const logger = createLogger({ requestId, startTime });

  const requestPath = new URL(req.url).pathname;
  let statusCode = 200;
  logger.info('request.start', { method: req.method, path: requestPath });

  if (req.method === 'OPTIONS') {
    const durationMs = Date.now() - startTime;
    logger.info('request.complete', { statusCode, durationMs });
    return new Response(null, { headers: { ...corsHeaders, 'x-request-id': requestId } });
  }

  try {
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    logger.info('analyze-image.requested');
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this image and categorize it. Provide: 1) A descriptive title (4-8 words), 2) A detailed description (2-3 sentences), 3) ONE tag from these options: "watch later" (for videos/entertainment), "read later" (for articles/documents/text), or "wishlist" (for products/items to buy). Respond in JSON format: {"title": "...", "description": "...", "tag": "watch later"}'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    
    let result;
    try {
      const content = aiData.choices[0].message.content;
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
    } catch (e) {
      console.error('Error parsing AI response:', e);
      result = {
        title: 'Uploaded Image',
        description: 'An image uploaded to your garden',
        tag: 'read later'
      };
    }

    const response = new Response(
      JSON.stringify({
        title: result.title,
        description: result.description,
        tag: result.tag || 'read later'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
    );
    return response;

  } catch (error) {
    statusCode = 500;
    logger.error('analyze-image.error', { statusCode, message: error instanceof Error ? error.message : 'Unknown error' });
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
