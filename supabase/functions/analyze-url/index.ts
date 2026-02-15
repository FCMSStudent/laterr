import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { cleanMetadataFields, validateAndParseAiJson } from "../_shared/metadata-utils.ts";
import { parseHTML } from "https://esm.sh/linkedom@0.18.5";
import { Readability } from "https://esm.sh/@mozilla/readability@0.5.0";
import { createLogger } from "../_shared/logger.ts";
// Mercury Parser cannot run in Deno (github deps). Using enhanced Readability instead.

// Configuration constants
const AI_TEMPERATURE = 0.3; // Lower temperature for consistent results
const LATEST_CHROME_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Multi-layer metadata extraction interface
interface ExtractedMetadata {
  title?: string;
  description?: string;
  image?: string;
  author?: string;
  siteName?: string;
  type?: string;
  publishedTime?: string;
  modifiedTime?: string;
  tags?: string[];
}

class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const isDebugLoggingEnabled = () => {
  const logLevel = Deno.env.get('LOG_LEVEL')?.toLowerCase();
  return Deno.env.get('DEBUG') === 'true' || logLevel === 'debug' || logLevel === 'trace';
};

const summarizeAiResponse = (data: any, status: number) => ({
  model: data?.model ?? data?.model_id ?? 'unknown',
  status,
  responseSize: JSON.stringify(data ?? {}).length,
  hasToolCalls: Boolean(data?.choices?.[0]?.message?.tool_calls?.length),
});

/**
 * Extract metadata from Open Graph tags
 */
function extractOpenGraph(html: string): ExtractedMetadata {
  const metadata: ExtractedMetadata = {};
  
  const ogTags = [
    { pattern: /property=["']og:title["'][^>]*content=["']([^"']*)["']/i, key: 'title' },
    { pattern: /property=["']og:description["'][^>]*content=["']([^"']*)["']/i, key: 'description' },
    { pattern: /property=["']og:image["'][^>]*content=["']([^"']*)["']/i, key: 'image' },
    { pattern: /property=["']og:site_name["'][^>]*content=["']([^"']*)["']/i, key: 'siteName' },
    { pattern: /property=["']og:type["'][^>]*content=["']([^"']*)["']/i, key: 'type' },
    { pattern: /property=["']article:published_time["'][^>]*content=["']([^"']*)["']/i, key: 'publishedTime' },
    { pattern: /property=["']article:modified_time["'][^>]*content=["']([^"']*)["']/i, key: 'modifiedTime' },
    { pattern: /property=["']article:author["'][^>]*content=["']([^"']*)["']/i, key: 'author' },
  ];
  
  for (const tag of ogTags) {
    const match = html.match(tag.pattern);
    if (match && match[1]) {
      (metadata as any)[tag.key] = match[1];
    }
  }
  
  return metadata;
}

/**
 * Extract metadata from Twitter Card tags
 */
function extractTwitterCard(html: string): ExtractedMetadata {
  const metadata: ExtractedMetadata = {};
  
  const twitterTags = [
    { pattern: /name=["']twitter:title["'][^>]*content=["']([^"']*)["']/i, key: 'title' },
    { pattern: /name=["']twitter:description["'][^>]*content=["']([^"']*)["']/i, key: 'description' },
    { pattern: /name=["']twitter:image["'][^>]*content=["']([^"']*)["']/i, key: 'image' },
    { pattern: /name=["']twitter:creator["'][^>]*content=["']([^"']*)["']/i, key: 'author' },
  ];
  
  for (const tag of twitterTags) {
    const match = html.match(tag.pattern);
    if (match && match[1]) {
      (metadata as any)[tag.key] = match[1];
    }
  }
  
  return metadata;
}

/**
 * Extract metadata from standard HTML meta tags
 */
function extractHtmlMeta(html: string): ExtractedMetadata {
  const metadata: ExtractedMetadata = {};
  
  // Title from <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    metadata.title = titleMatch[1];
  }
  
  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  if (descMatch && descMatch[1]) {
    metadata.description = descMatch[1];
  }
  
  // Meta author
  const authorMatch = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']*)["']/i);
  if (authorMatch && authorMatch[1]) {
    metadata.author = authorMatch[1];
  }
  
  // Meta keywords (convert to tags)
  const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i);
  if (keywordsMatch && keywordsMatch[1]) {
    metadata.tags = keywordsMatch[1].split(',').map(k => k.trim()).filter(k => k.length > 0);
  }
  
  return metadata;
}

/**
 * Extract JSON-LD structured data
 */
function extractJsonLd(html: string): ExtractedMetadata {
  const metadata: ExtractedMetadata = {};
  
  try {
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    
    for (const match of jsonLdMatches) {
      try {
        const data = JSON.parse(match[1]);
        
        // Handle different schema.org types
        if (data['@type'] === 'Article' || data['@type'] === 'BlogPosting' || data['@type'] === 'NewsArticle') {
          metadata.title = metadata.title || data.headline || data.name;
          metadata.description = metadata.description || data.description;
          metadata.author = metadata.author || data.author?.name || data.author;
          metadata.publishedTime = metadata.publishedTime || data.datePublished;
          metadata.modifiedTime = metadata.modifiedTime || data.dateModified;
          metadata.image = metadata.image || data.image?.url || data.image;
        } else if (data['@type'] === 'WebPage' || data['@type'] === 'WebSite') {
          metadata.title = metadata.title || data.name || data.headline;
          metadata.description = metadata.description || data.description;
        } else if (data['@type'] === 'VideoObject') {
          metadata.title = metadata.title || data.name;
          metadata.description = metadata.description || data.description;
          metadata.image = metadata.image || data.thumbnailUrl;
        }
      } catch (e) {
        // Skip invalid JSON-LD
        console.log('⚠️ Invalid JSON-LD block, skipping');
      }
    }
  } catch (e) {
    console.log('⚠️ Error extracting JSON-LD:', e);
  }
  
  return metadata;
}

/**
 * Multi-layer fallback metadata extraction
 * Priority: Open Graph → Twitter Cards → JSON-LD → HTML meta
 */
function extractMetadataWithFallback(html: string): ExtractedMetadata {
  console.log('🔍 Starting multi-layer metadata extraction');
  
  // Layer 1: Open Graph
  const ogMetadata = extractOpenGraph(html);
  console.log('📊 Open Graph:', Object.keys(ogMetadata).length, 'fields');
  
  // Layer 2: Twitter Cards
  const twitterMetadata = extractTwitterCard(html);
  console.log('🐦 Twitter Cards:', Object.keys(twitterMetadata).length, 'fields');
  
  // Layer 3: JSON-LD
  const jsonLdMetadata = extractJsonLd(html);
  console.log('📋 JSON-LD:', Object.keys(jsonLdMetadata).length, 'fields');
  
  // Layer 4: HTML meta tags
  const htmlMetadata = extractHtmlMeta(html);
  console.log('📄 HTML Meta:', Object.keys(htmlMetadata).length, 'fields');
  
  // Merge with priority (first non-empty value wins)
  const merged: ExtractedMetadata = {
    title: ogMetadata.title || twitterMetadata.title || jsonLdMetadata.title || htmlMetadata.title,
    description: ogMetadata.description || twitterMetadata.description || jsonLdMetadata.description || htmlMetadata.description,
    image: ogMetadata.image || twitterMetadata.image || jsonLdMetadata.image,
    author: ogMetadata.author || twitterMetadata.author || jsonLdMetadata.author || htmlMetadata.author,
    siteName: ogMetadata.siteName,
    type: ogMetadata.type,
    publishedTime: ogMetadata.publishedTime || jsonLdMetadata.publishedTime,
    modifiedTime: ogMetadata.modifiedTime || jsonLdMetadata.modifiedTime,
    tags: htmlMetadata.tags,
  };
  
  // Remove undefined values
  Object.keys(merged).forEach(key => {
    if ((merged as any)[key] === undefined) {
      delete (merged as any)[key];
    }
  });
  
  console.log('✅ Merged metadata:', Object.keys(merged).length, 'fields');
  return merged;
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Retry failed without error');
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx)
      if (error instanceof HttpError && error.status >= 400 && error.status < 500) {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

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
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new HttpError(401, 'auth_missing', 'Missing authorization header');
    }

    const { url } = await req.json();
    
    if (!url || typeof url !== 'string') {
      throw new HttpError(400, 'invalid_input', 'Valid URL is required');
    }

    // Validate URL length
    if (url.length > 2048) {
      throw new HttpError(400, 'invalid_input', 'URL too long (max 2048 characters)');
    }

    // Validate URL format and block dangerous URLs
    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new HttpError(400, 'invalid_input', 'Invalid URL format');
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new HttpError(403, 'url_blocked', 'Only HTTP and HTTPS protocols are allowed');
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
      throw new HttpError(403, 'url_blocked', 'Access to this host is not allowed');
    }

    // Block private IP ranges
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)
    ) {
      throw new HttpError(403, 'url_blocked', 'Access to private IP ranges is not allowed');
    }

    // Helper function to detect platform with oEmbed support
    type OEmbedPlatform = 'youtube' | 'vimeo' | 'tiktok' | 'twitter' | 'github' | 'spotify' | 'soundcloud' | 'reddit' | 'codepen';
    
    const detectPlatform = (url: string): OEmbedPlatform | null => {
      const hostname = url.toLowerCase();
      if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) return 'youtube';
      if (hostname.includes('vimeo.com')) return 'vimeo';
      if (hostname.includes('tiktok.com')) return 'tiktok';
      if (hostname.includes('twitter.com') || hostname.includes('x.com')) return 'twitter';
      if (hostname.includes('github.com')) return 'github';
      if (hostname.includes('open.spotify.com')) return 'spotify';
      if (hostname.includes('soundcloud.com')) return 'soundcloud';
      if (hostname.includes('reddit.com/r/')) return 'reddit';
      if (hostname.includes('codepen.io')) return 'codepen';
      return null;
    };
    
    const VIDEO_PLATFORMS: OEmbedPlatform[] = ['youtube', 'vimeo', 'tiktok'];
    const detectVideoPlatform = (url: string): OEmbedPlatform | null => {
      const p = detectPlatform(url);
      return p && VIDEO_PLATFORMS.includes(p) ? p : null;
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

    // Helper function to fetch oEmbed data (extended with Twitter, GitHub, etc.)
    const fetchOembedData = async (url: string, platform: string) => {
      const oembedUrls: Record<string, string> = {
        youtube: `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        vimeo: `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`,
        tiktok: `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
        twitter: `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        github: `https://github.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        spotify: `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`,
        soundcloud: `https://soundcloud.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        reddit: `https://www.reddit.com/oembed?url=${encodeURIComponent(url)}&format=json`,
        codepen: `https://codepen.io/api/oembed?url=${encodeURIComponent(url)}&format=json`,
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

    // Firecrawl fallback function
    const fetchWithFirecrawl = async (targetUrl: string): Promise<{
      title: string;
      content: string;
      description: string;
      imageUrl: string | null;
    } | null> => {
      const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
      if (!apiKey) {
        console.log('Firecrawl API key not configured, skipping fallback');
        return null;
      }
      
      try {
        console.log('Attempting Firecrawl fallback for:', targetUrl);
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: targetUrl,
            formats: ['markdown'],
            onlyMainContent: true,
          }),
        });
        
        if (!response.ok) {
          console.error('Firecrawl API returned status:', response.status);
          return null;
        }
        
        const data = await response.json();
        console.log('Firecrawl response received successfully');
        
        // Access nested data structure
        const scrapeData = data.data || data;
        const metadata = scrapeData?.metadata || {};
        
        return {
          title: metadata.title || '',
          content: (scrapeData?.markdown || '').substring(0, 3000),
          description: metadata.description || metadata.ogDescription || '',
          imageUrl: metadata.ogImage || null,
        };
      } catch (error) {
        console.error('Firecrawl fallback failed:', error);
        return null;
      }
    };

    console.log('Fetching URL:', url);

    // Detect platforms (video + rich embed)
    const videoPlatform = detectVideoPlatform(url);
    const richPlatform = detectPlatform(url);
    const platform = videoPlatform || richPlatform;
    let pageTitle = '';
    let previewImageUrl: string | null = null;
    let metaDescription = '';
    let authorName = '';
    let shouldFetchHtml = true;
    let oembedHtml: string | null = null;
    let oembedProviderName: string | null = null;

    // Try oEmbed for any supported platform
    if (platform) {
      console.log(`Detected ${platform} content, trying oEmbed...`);
      const oembedData = await fetchOembedData(url, platform);
      
      if (oembedData) {
        pageTitle = oembedData.title || '';
        previewImageUrl = oembedData.thumbnail_url || null;
        authorName = oembedData.author_name || '';
        oembedHtml = oembedData.html || null;
        oembedProviderName = oembedData.provider_name || platform;
        
        // For YouTube, try to get maxresdefault thumbnail for better quality
        if (platform === 'youtube' && previewImageUrl) {
          const videoId = extractYoutubeVideoId(url);
          if (videoId) {
            previewImageUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
          }
        }
        
        // Skip HTML fetch for video platforms with good oEmbed data
        if (videoPlatform) {
          shouldFetchHtml = false;
        }
        console.log('oEmbed data retrieved successfully');
      } else {
        console.log('oEmbed failed, falling back to HTML scraping');
      }
    }

    // Fallback to HTML scraping if needed
    let cleanText = '';
    let firecrawlUsed = false;
    let extractedMetadata: ExtractedMetadata = {};
    
    if (shouldFetchHtml) {
      try {
        // Use retry mechanism for fetching
        const html = await retryWithBackoff(async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);
          
          const pageResponse = await fetch(url, {
            signal: controller.signal,
            redirect: 'follow',
            headers: { 
              'User-Agent': LATEST_CHROME_USER_AGENT,
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            }
          });
          clearTimeout(timeoutId);
          
          if (!pageResponse.ok) {
            throw new Error(`HTTP ${pageResponse.status}: ${pageResponse.statusText}`);
          }
          
          return await pageResponse.text();
        });
        
        // Multi-layer metadata extraction
        extractedMetadata = extractMetadataWithFallback(html);
        
        // Use extracted metadata with fallback to existing values
        pageTitle = pageTitle || extractedMetadata.title || 'Untitled';
        metaDescription = metaDescription || extractedMetadata.description || '';
        previewImageUrl = previewImageUrl || extractedMetadata.image || null;
        authorName = authorName || extractedMetadata.author || '';
        
        // Enhanced Readability extraction with better metadata fallbacks
        try {
          const parsed: any = parseHTML(html);
          const doc = parsed.document || parsed;
          const reader = new Readability(doc, { keepClasses: false });
          const article = reader.parse();
          
          if (article && article.textContent) {
            cleanText = article.textContent.trim().replace(/\s+/g, ' ').substring(0, 3000);
            // Use Readability's extracted metadata as additional fallbacks
            pageTitle = pageTitle || article.title || 'Untitled';
            authorName = authorName || article.byline || '';
            metaDescription = metaDescription || article.excerpt || '';
            console.log('✅ Successfully extracted article content using Readability');
          } else {
            cleanText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 3000);
            console.log('⚠️ Readability extraction failed, using fallback HTML stripping');
          }
        } catch (error) {
          console.error('⚠️ Error using Readability:', error);
          cleanText = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').substring(0, 3000);
        }
      } catch (primaryError) {
        console.log('⚠️ Primary fetch failed, trying Firecrawl fallback:', primaryError);
        
        // Firecrawl fallback with retry
        const firecrawlData = await retryWithBackoff(
          () => fetchWithFirecrawl(url),
          2,
          2000
        ).catch(() => null);
        
        if (firecrawlData) {
          pageTitle = firecrawlData.title || pageTitle || 'Untitled';
          cleanText = firecrawlData.content;
          metaDescription = firecrawlData.description;
          previewImageUrl = firecrawlData.imageUrl || previewImageUrl;
          firecrawlUsed = true;
          console.log('✅ Successfully retrieved content via Firecrawl fallback');
        } else {
          // Graceful degradation - return minimal metadata
          console.error('❌ Both primary fetch and Firecrawl fallback failed, using minimal metadata');
          pageTitle = url;
          metaDescription = 'Content could not be retrieved';
          cleanText = '';
        }
      }
    }
    
    console.log('🤖 Analyzing content with AI...');
    
    // Use AI to generate summary and tags with retry mechanism
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    
    // Enhanced AI prompt with better instructions
    const systemPrompt = `You are an expert content analyzer that extracts metadata from web content with high accuracy. 

Your task is to analyze the provided content and return a JSON object with the following fields:
{
  "title": "A clear, descriptive title (improve if needed)",
  "summary": "A concise 2-3 sentence summary of the main content",
  "tags": ["tag1", "tag2", "tag3"],
  "category": "article|video|product|tutorial|news|blog|documentation|social|entertainment|other",
  "contentType": "article|video|product|document|social-media|news",
  "confidence": 0.0-1.0
}

Rules:
1. Base your response ONLY on the provided content
2. Generate 3-6 relevant tags based on topics, themes, and categories
3. Choose the most specific category that fits
4. Confidence should reflect how much content was available (0.9+ if full content, 0.5-0.8 if limited)
5. Keep tags lowercase and use hyphens instead of spaces
6. Make the title informative but concise (max 100 chars)
7. Summary should capture the essence without speculation`;

    const userPrompt = platform 
      ? `Analyze this ${platform} video:

Title: ${pageTitle}
${authorName ? `Channel/Author: ${authorName}` : ''}
${metaDescription ? `Description: ${metaDescription}` : ''}

Provide metadata in JSON format.`
      : `Analyze this webpage:

Title: ${pageTitle}
${metaDescription ? `Meta Description: ${metaDescription}` : ''}
${extractedMetadata.author ? `Author: ${extractedMetadata.author}` : ''}
${extractedMetadata.siteName ? `Site: ${extractedMetadata.siteName}` : ''}
${extractedMetadata.publishedTime ? `Published: ${extractedMetadata.publishedTime}` : ''}
URL: ${url}

${cleanText ? `Content (first 3000 chars):\n${cleanText}` : 'No content extracted'}

${extractedMetadata.tags?.length ? `Existing tags: ${extractedMetadata.tags.join(', ')}` : ''}

Provide comprehensive metadata in JSON format.`;

    const aiResponse = await retryWithBackoff(async () => {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: AI_TEMPERATURE,
        }),
      });
      
      if (response.status === 429) {
        throw new HttpError(429, 'rate_limited', 'AI provider rate limited', { providerStatus: response.status });
      }
      
      if (response.status === 402) {
        throw new HttpError(402, 'credits_exhausted', 'AI provider credits exhausted', { providerStatus: response.status });
      }
      
      if (!response.ok) {
        throw new Error(`AI request failed with status ${response.status}`);
      }
      
      return response;
    }, 3, 2000);

    const aiData = await aiResponse.json();
    console.log('📊 AI response summary:', summarizeAiResponse(aiData, aiResponse.status));
    if (isDebugLoggingEnabled()) {
      console.log('AI response payload:', aiData);
    }
    
    let rawResult;
    try {
      const content = aiData.choices[0].message.content;
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      rawResult = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    } catch (e) {
      console.error('⚠️ Error extracting AI response content:', e);
      rawResult = undefined;
    }

    // Use validateAndParseAiJson with comprehensive fallback
    const fallback = {
      title: pageTitle,
      summary: metaDescription || 'No summary available',
      tags: extractedMetadata.tags || ['article'],
      category: platform ? 'video' : 'article'
    };
    
    const result = validateAndParseAiJson(rawResult, fallback);

    // Merge AI results with extracted metadata for best quality
    const mergedTags = result.tags && result.tags.length > 0 
      ? result.tags 
      : extractedMetadata.tags || fallback.tags;

    // Final cleanup pass on all metadata before returning
    const finalMetadata = cleanMetadataFields({
      title: result.title || pageTitle,
      summary: result.summary,
      tags: mergedTags,
      category: result.category || fallback.category
    });

    // Determine tag based on content type
    const primaryTag = platform 
      ? 'watch later' 
      : (result.contentType === 'product' ? 'wishlist' : 'read later');

    console.log('✅ Metadata extraction complete:', {
      title: finalMetadata.title?.substring(0, 50),
      tagCount: finalMetadata.tags?.length || 0,
      category: finalMetadata.category,
      hasImage: !!previewImageUrl,
      confidence: result.confidence || 'unknown'
    });

    return new Response(
      JSON.stringify({
        title: finalMetadata.title || pageTitle,
        summary: finalMetadata.summary,
        tags: finalMetadata.tags,
        tag: result.tag || primaryTag,
        category: finalMetadata.category,
        previewImageUrl: previewImageUrl,
        author: authorName || extractedMetadata.author || undefined,
        platform: platform || undefined,
        contentType: result.contentType || (videoPlatform ? 'video' : 'article'),
        siteName: extractedMetadata.siteName || oembedProviderName || undefined,
        publishedTime: extractedMetadata.publishedTime || undefined,
        confidence: result.confidence || undefined,
        oembedHtml: oembedHtml || undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
    );

  } catch (error) {
    const httpError = error instanceof HttpError ? error : null;
    statusCode = httpError?.status ?? 500;
    const errorMessage = httpError?.message ?? (error instanceof Error ? error.message : 'Unknown error');
    const errorCode = httpError?.code ?? 'internal_error';
    logger.error('analyze-url.error', {
      statusCode,
      message: errorMessage,
      code: errorCode,
      details: httpError?.details,
    });
    return new Response(
      JSON.stringify({
        error: {
          code: errorCode,
          message: errorMessage,
          ...(httpError?.details ? { details: httpError.details } : {}),
        },
      }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } 
      }
    );
  } finally {
    const durationMs = Date.now() - startTime;
    logger.info('request.complete', { statusCode, durationMs, path: requestPath });
  }
});
