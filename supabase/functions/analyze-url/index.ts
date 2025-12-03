import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { cleanMetadataFields, validateAndParseAiJson } from "../_shared/metadata-utils.ts";
import { parseHTML } from "https://esm.sh/linkedom@0.18.5";
import { Readability } from "https://esm.sh/@mozilla/readability@0.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { url } = await req.json();
    
    if (!url || typeof url !== 'string') {
      throw new Error('Valid URL is required');
    }

    // Validate URL length
    if (url.length > 2048) {
      throw new Error('URL too long (max 2048 characters)');
    }

    // Validate URL format and block dangerous URLs
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('Invalid URL format');
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are allowed');
    }

    // Block private IP ranges and localhost
    const hostname = parsedUrl.hostname.toLowerCase();
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '169.254.169.254', // AWS metadata
      '::1',
    ];
    
    if (blockedHosts.includes(hostname)) {
      throw new Error('Access to this host is not allowed');
    }

    // Block private IP ranges
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)
    ) {
      throw new Error('Access to private IP ranges is not allowed');
    }

    // Helper function to detect video platform
    const detectVideoPlatform = (url: string): 'youtube' | 'vimeo' | 'tiktok' | null => {
      const hostname = url.toLowerCase();
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
        return 'youtube';
      }
      if (hostname.includes('vimeo.com')) {
        return 'vimeo';
      }
      if (hostname.includes('tiktok.com')) {
        return 'tiktok';
      }
      return null;
    };

    // Helper function to extract YouTube video ID
    const extractYoutubeVideoId = (url: string): string | null => {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
        /youtube\.com\/embed\/([^&\n?#]+)/,
        /youtube\.com\/v\/([^&\n?#]+)/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) return match[1];
      }
      return null;
    };

    // Helper function to fetch oEmbed data
    const fetchOembedData = async (url: string, platform: string) => {
      const oembedUrls: Record<string, string> = {
        youtube: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        vimeo: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
        tiktok: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`
      };
      
      const oembedUrl = oembedUrls[platform];
      if (!oembedUrl) return null;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(oembedUrl, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Laterr-Bot/1.0' }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) return null;
        return await response.json();
      } catch (error) {
        console.error(`oEmbed fetch failed for ${platform}:`, error);
        return null;
      }
    };

    console.log('Fetching URL:', url);

    // Detect video platform
    const platform = detectVideoPlatform(url);
    let pageTitle = '';
    let previewImageUrl: string | null = null;
    let metaDescription = '';
    let authorName = '';
    let shouldFetchHtml = true;

    // Try oEmbed for video platforms
    if (platform) {
      console.log(`Detected ${platform} video, trying oEmbed...`);
      const oembedData = await fetchOembedData(url, platform);
      
      if (oembedData) {
        pageTitle = oembedData.title || '';
        previewImageUrl = oembedData.thumbnail_url || null;
        authorName = oembedData.author_name || '';
        
        // For YouTube, try to get maxresdefault thumbnail for better quality
        if (platform === 'youtube' && previewImageUrl) {
          const videoId = extractYoutubeVideoId(url);
          if (videoId) {
            previewImageUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
          }
        }
        
        shouldFetchHtml = false; // Skip HTML fetching since we have good data
        console.log('oEmbed data retrieved successfully');
      } else {
        console.log('oEmbed failed, falling back to HTML scraping');
      }
    }

    // Fallback to HTML scraping if needed
    let cleanText = '';
    if (shouldFetchHtml) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const pageResponse = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'User-Agent': 'Laterr-Bot/1.0' }
      });
      clearTimeout(timeoutId);
      const html = await pageResponse.text();
      
      // Extract Open Graph image
      const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
      previewImageUrl = previewImageUrl || (ogImageMatch ? ogImageMatch[1] : null);
      
      // Extract page title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      pageTitle = pageTitle || (titleMatch ? titleMatch[1] : 'Untitled');
      
      // Extract meta description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
      metaDescription = descMatch ? descMatch[1] : '';
      
      // Use Readability to extract main article content
      try {
        const parsed: any = parseHTML(html);
        const doc = parsed.document || parsed;
        const reader = new Readability(doc, { 
          keepClasses: false 
        });
        const article = reader.parse();
        
        if (article && article.textContent) {
          // Use the extracted article text content (already cleaned by Readability)
          cleanText = article.textContent.trim().replace(/\s+/g, ' ').substring(0, 3000);
          console.log('Successfully extracted article content using Readability');
        } else {
          // Fallback to simple HTML stripping if Readability fails
          cleanText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 3000);
          console.log('Readability extraction failed, using fallback HTML stripping');
        }
      } catch (error) {
        // Fallback to simple HTML stripping on error
        console.error('Error using Readability:', error);
        cleanText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 3000);
      }
    }
    
    console.log('Analyzing content with AI...');
    
    // Use AI to generate summary and tags
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
            role: 'system',
            content: '**CRITICAL: Base your response ONLY on the provided content. Do not infer, assume, or add information not present in the text.** You are a helpful assistant that analyzes web content and categorizes it. Respond in JSON format: {"title": "improved title", "summary": "2-3 sentence summary", "tag": "read later", "contentType": "video|article|product|document"}. Use ONLY one of these tags: "watch later" (videos/entertainment), "read later" (articles/documents/text), or "wishlist" (products/items to buy). Choose only ONE tag that best fits the content based on what is actually provided.'
          },
          {
            role: 'user',
            content: platform 
              ? `**Extract factual information only from the provided data.**\n\nAnalyze this ${platform} video:\n\nTitle: ${pageTitle}\nChannel: ${authorName}\n\nCategorize based strictly on this information and provide a summary.`
              : `**Extract factual information only from the provided data.**\n\nAnalyze this webpage:\n\nTitle: ${pageTitle}\nDescription: ${metaDescription}\n\nURL: ${url}\n\nArticle Content: ${cleanText}\n\nDetermine the content type based only on what is visible in the article content above. Categorize appropriately.`
          }
        ],
      }),
    });

    const aiData = await aiResponse.json();
    console.log('AI response:', aiData);
    
    let rawResult;
    try {
      const content = aiData.choices[0].message.content;
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      rawResult = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    } catch (e) {
      console.error('Error extracting AI response content:', e);
      rawResult = undefined;
    }

    // Use validateAndParseAiJson with fallback
    const fallback = {
      title: pageTitle,
      summary: metaDescription || 'No summary available',
      tags: ['article']
    };
    
    const result = validateAndParseAiJson(rawResult, fallback);

    // Final cleanup pass on all metadata before returning
    const finalMetadata = cleanMetadataFields({
      title: result.title || pageTitle,
      summary: result.summary,
      tags: result.tags
    });

    return new Response(
      JSON.stringify({
        title: finalMetadata.title || pageTitle,
        summary: finalMetadata.summary,
        tag: result.tag || (platform ? 'watch later' : 'read later'),
        previewImageUrl: previewImageUrl,
        author: authorName || undefined,
        platform: platform || undefined,
        contentType: result.contentType || 'article'
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