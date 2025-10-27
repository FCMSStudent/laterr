import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      throw new Error('URL is required');
    }

    console.log('Fetching URL:', url);
    
    // Fetch the webpage
    const pageResponse = await fetch(url);
    const html = await pageResponse.text();
    
    // Extract Open Graph image
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
    const previewImageUrl = ogImageMatch ? ogImageMatch[1] : null;
    
    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1] : 'Untitled';
    
    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const metaDescription = descMatch ? descMatch[1] : '';
    
    // Strip HTML for cleaner text
    const cleanText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 3000);
    
    console.log('Analyzing content with AI...');
    
    // Use AI to generate summary and tags
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
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
            role: 'system',
            content: 'You are a helpful assistant that analyzes web content. Generate a concise summary (2-3 sentences) and 3-5 relevant tags. Respond in JSON format: {"title": "improved title", "summary": "...", "tags": ["tag1", "tag2"]}'
          },
          {
            role: 'user',
            content: `Analyze this webpage:\n\nTitle: ${pageTitle}\nDescription: ${metaDescription}\n\nContent: ${cleanText}`
          }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    console.log('AI response:', aiData);
    
    let result;
    try {
      const content = aiData.choices[0].message.content;
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content);
    } catch (e) {
      console.error('Error parsing AI response:', e);
      result = {
        title: pageTitle,
        summary: metaDescription || 'No summary available',
        tags: ['article']
      };
    }

    return new Response(
      JSON.stringify({
        title: result.title || pageTitle,
        summary: result.summary,
        tags: result.tags || [],
        previewImageUrl: previewImageUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-url:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});