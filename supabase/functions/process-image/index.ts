import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createLogger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error = new Error('Retry failed');
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (error instanceof HttpError && error.status >= 400 && error.status < 500) throw error;
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

/**
 * Upload an image to Cloudinary and run OCR + auto-tagging.
 * Accepts either { imageUrl } or { imageBase64, fileName }.
 */
serve(async (req) => {
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const startTime = Date.now();
  const logger = createLogger({ requestId, startTime });

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, 'x-request-id': requestId } });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new HttpError(401, 'auth_missing', 'Missing authorization header');

    const cloudName = Deno.env.get('CLOUDINARY_CLOUD_NAME');
    const apiKey = Deno.env.get('CLOUDINARY_API_KEY');
    const apiSecret = Deno.env.get('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      throw new HttpError(500, 'config_missing', 'Cloudinary credentials not configured');
    }

    const body = await req.json();
    const { imageUrl, imageBase64, fileName } = body;

    if (!imageUrl && !imageBase64) {
      throw new HttpError(400, 'invalid_input', 'Either imageUrl or imageBase64 is required');
    }

    // Build Cloudinary upload URL
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    // Generate signature timestamp
    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Params for upload with OCR + auto-tagging
    const params: Record<string, string> = {
      timestamp,
      detection: 'adv_face',
      categorization: 'google_tagging,aws_rek_tagging',
      auto_tagging: '0.6',
      ocr: 'adv_ocr',
    };

    // Generate signature: sort params alphabetically and sign with API secret
    const sortedParams = Object.keys(params)
      .sort()
      .map(k => `${k}=${params[k]}`)
      .join('&');

    const encoder = new TextEncoder();
    const keyData = encoder.encode(apiSecret);
    const msgData = encoder.encode(sortedParams);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);

    // Cloudinary uses SHA-1 for signatures, let's use the simple hash approach
    // Actually Cloudinary expects SHA-1 of the params string + api_secret
    // We need to compute SHA-1(sortedParams + apiSecret)
    const sha1Data = encoder.encode(sortedParams + apiSecret);
    const hashBuffer = await crypto.subtle.digest('SHA-1', sha1Data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Build form data for upload
    const formData = new FormData();
    if (imageUrl) {
      formData.append('file', imageUrl);
    } else if (imageBase64) {
      formData.append('file', `data:image/png;base64,${imageBase64}`);
    }
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('signature', signature);
    formData.append('detection', 'adv_face');
    formData.append('categorization', 'google_tagging,aws_rek_tagging');
    formData.append('auto_tagging', '0.6');
    formData.append('ocr', 'adv_ocr');

    logger.info('cloudinary.upload.start', { hasUrl: !!imageUrl, hasBase64: !!imageBase64 });

    const cloudinaryResponse = await retryWithBackoff(async () => {
      const resp = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Cloudinary upload failed (${resp.status}): ${errText}`);
      }
      return resp.json();
    }, 2, 2000);

    // Extract OCR text
    const ocrText = cloudinaryResponse?.info?.ocr?.adv_ocr?.data
      ?.map((page: any) => page?.fullTextAnnotation?.text || '')
      .join('\n')
      .trim() || '';

    // Extract auto-tags
    const googleTags = (cloudinaryResponse?.info?.categorization?.google_tagging?.data || [])
      .map((t: any) => t.tag?.toLowerCase())
      .filter(Boolean);
    const awsTags = (cloudinaryResponse?.info?.categorization?.aws_rek_tagging?.data || [])
      .map((t: any) => t.tag?.toLowerCase())
      .filter(Boolean);
    
    // Deduplicate and merge tags
    const allTags = [...new Set([...googleTags, ...awsTags])].slice(0, 10);

    const result = {
      ocrText,
      tags: allTags,
      secureUrl: cloudinaryResponse.secure_url,
      width: cloudinaryResponse.width,
      height: cloudinaryResponse.height,
      format: cloudinaryResponse.format,
      publicId: cloudinaryResponse.public_id,
    };

    logger.info('cloudinary.upload.complete', {
      ocrLength: ocrText.length,
      tagCount: allTags.length,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId },
    });

  } catch (error) {
    const httpError = error instanceof HttpError ? error : null;
    const statusCode = httpError?.status ?? 500;
    const errorMessage = httpError?.message ?? (error instanceof Error ? error.message : 'Unknown error');
    logger.error('process-image.error', { statusCode, message: errorMessage });

    return new Response(
      JSON.stringify({ error: { code: httpError?.code ?? 'internal_error', message: errorMessage } }),
      { status: statusCode, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'x-request-id': requestId } }
    );
  } finally {
    logger.info('request.complete', { durationMs: Date.now() - startTime });
  }
});
