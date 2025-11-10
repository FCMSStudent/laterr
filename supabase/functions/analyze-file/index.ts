import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.6.82/legacy/build/pdf.mjs";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { cleanMetadataFields, validateAndParseAiJson, cleanTitle } from "../_shared/metadata-utils.ts";


const pdfjs = pdfjsLib as unknown as {
  GlobalWorkerOptions?: { workerSrc: string };
};

if (pdfjs?.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.6.82/legacy/build/pdf.worker.mjs";
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define structured output schema
const analyzeFileToolSchema = {
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

// Legacy normalizeTags wrapper for backward compatibility
function normalizeTags(tags: string[]): string[] {
  const cleaned = cleanMetadataFields({ tags });
  return cleaned.tags || [];
}

// Extract text from PDF
async function extractPdfText(fileUrl: string): Promise<{ text: string; pageCount: number; metadata: Record<string, unknown> }> {
  try {
    console.log('📄 Fetching PDF bytes...');
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log(`📄 PDF size: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    console.log(`📄 PDF has ${pageCount} pages`);
    
    // Extract metadata
    let metadata = {};
    try {
      const pdfMetadata = await pdf.getMetadata();
      metadata = pdfMetadata.info || {};
      console.log('📄 PDF metadata:', Object.keys(metadata));
    } catch (e) {
      console.log('⚠️ Could not extract PDF metadata');
    }
    
    // Extract text from first 10 pages max (or all pages if fewer)
    const pagesToExtract = Math.min(pageCount, 10);
    const textParts: string[] = [];
    let totalChars = 0;
    const maxChars = 50000;
    
    for (let i = 1; i <= pagesToExtract && totalChars < maxChars; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: { str: string }) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (pageText) {
          textParts.push(pageText);
          totalChars += pageText.length;
          console.log(`📄 Page ${i}: ${pageText.length} chars extracted`);
        }
      } catch (pageError) {
        console.error(`⚠️ Error extracting page ${i}:`, pageError);
      }
    }
    
    const fullText = textParts.join('\n\n').substring(0, maxChars);
    console.log(`✅ PDF extraction complete: ${fullText.length} total chars from ${textParts.length} pages`);
    
    return {
      text: fullText,
      pageCount,
      metadata
    };
  } catch (error) {
    console.error('❌ PDF extraction failed:', error);
    throw error;
  }
}

// Generate thumbnail from PDF first page (disabled - skia_canvas not supported in Edge runtime)
async function generatePdfThumbnail(
  fileUrl: string,
  userId: string
): Promise<string | null> {
  console.log('🖼️ Skipping PDF thumbnail generation in this environment');
  return null;
}

// Extract text from DOCX
async function extractDocxText(fileUrl: string): Promise<{ text: string; metadata: Record<string, unknown> }> {
  try {
    console.log('📝 Fetching DOCX bytes...');
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch DOCX: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`📝 DOCX size: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);
    
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Extract document text from word/document.xml
    let documentText = '';
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (docXml) {
      // Extract all text content from <w:t> tags
      const textMatches = docXml.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      const textParts = Array.from(textMatches).map(match => match[1]);
      documentText = textParts.join(' ').replace(/\s+/g, ' ').trim();
      console.log(`📝 Extracted ${documentText.length} chars from document.xml`);
    }
    
    // Extract metadata from docProps/core.xml
    let metadata: Record<string, unknown> = {};
    const coreXml = await zip.file('docProps/core.xml')?.async('string');
    if (coreXml) {
      const titleMatch = coreXml.match(/<dc:title>([^<]+)<\/dc:title>/);
      const creatorMatch = coreXml.match(/<dc:creator>([^<]+)<\/dc:creator>/);
      const subjectMatch = coreXml.match(/<dc:subject>([^<]+)<\/dc:subject>/);
      const keywordsMatch = coreXml.match(/<cp:keywords>([^<]+)<\/cp:keywords>/);

      metadata = {
        Title: titleMatch?.[1] || '',
        Creator: creatorMatch?.[1] || '',
        Subject: subjectMatch?.[1] || '',
        Keywords: keywordsMatch?.[1]?.split(',').map((keyword) => keyword.trim()).filter(Boolean) || [],
      };
      console.log('📝 DOCX metadata:', metadata);
    }
    
    // Cap at 50k chars
    const finalText = documentText.substring(0, 50000);
    console.log(`✅ DOCX extraction complete: ${finalText.length} chars`);
    
    return {
      text: finalText,
      metadata
    };
  } catch (error) {
    console.error('❌ DOCX extraction failed:', error);
    throw error;
  }
}

// Sample text intelligently (head, middle, tail)
function sampleText(text: string, maxChars: number = 2500): string {
  if (text.length <= maxChars) return text;
  
  const chunkSize = Math.floor(maxChars / 3);
  const head = text.substring(0, chunkSize);
  const middle = text.substring(Math.floor(text.length / 2) - Math.floor(chunkSize / 2), Math.floor(text.length / 2) + Math.floor(chunkSize / 2));
  const tail = text.substring(text.length - chunkSize);
  
  return `${head}\n\n[...middle section...]\n\n${middle}\n\n[...end section...]\n\n${tail}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileType, fileName } = await req.json();

    console.log('🔍 Analyzing file:', { fileName, fileType, fileUrl: fileUrl.substring(0, 100) + '...' });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user ID from authorization header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      try {
        const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
        const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: authHeader } }
        });
        
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (user) {
          userId = user.id;
          console.log('✅ User authenticated:', userId);
        }
      } catch (authError) {
        console.warn('⚠️ Failed to authenticate user:', authError);
      }
    }

    let title = cleanTitle(fileName || 'Untitled File');
    let description = '';
    let tags: string[] = ['file'];
    let extractedText = '';
    let category = 'other';
    let summary = '';
    let keyPoints: string[] = [];
    let previewImageUrl: string | null = null;

    // Handle different file types
    if (fileType.startsWith('image/')) {
      // ========== IMAGE PROCESSING ==========
      console.log('🖼️ Processing image with enhanced OCR and analysis');
      
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `**CRITICAL: Base your response ONLY on the provided image content. Do not infer, assume, or add information not directly visible in the image.**

Analyze this image and extract factual information:

1. **OCR Extraction**: Extract ALL visible text exactly as it appears in the image. Include:
   - Main text content, headers, titles
   - Labels, captions, table text
   - Small print or footnotes
   - Any logos with text

2. **Title**: Create a descriptive title based ONLY on visible text or the primary subject matter shown in the image.

3. **Visual Description**: Describe only what is actually visible:
   - Type: document, screenshot, photo, diagram, chart, receipt, form, etc.
   - Main subject or purpose as shown
   - Notable visual elements present (logos, signatures, graphs, etc.)
   - Layout and structure

4. **Categorization**: Determine category and provide 4-6 specific tags based solely on visible content.

5. **Key Information**: Extract and list only factual information visible in the image.

Use the analyze_file function to provide structured output.`
                  },
                  {
                    type: "image_url",
                    image_url: { url: fileUrl }
                  }
                ]
              }
            ],
            tools: [analyzeFileToolSchema],
            tool_choice: { type: "function", function: { name: "analyze_file" } }
          }),
        });

        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (response.status === 402) {
          throw new Error("AI credits exhausted. Please add credits to continue.");
        }
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ AI gateway error:', response.status, errorText);
          throw new Error(`AI analysis failed: ${response.statusText}`);
        }

        const data = await response.json();
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        
        // Use validateAndParseAiJson with fallback
        const fallback = {
          title,
          description: 'Image file',
          tags: ['image'],
          category: 'other'
        };
        
        const parsed = validateAndParseAiJson(toolCall?.function?.arguments, fallback);
        title = parsed.title || title;
        description = parsed.description || 'Image file';
        extractedText = parsed.extractedText || '';
        tags = parsed.tags || ['image'];
        category = parsed.category || 'other';
        summary = parsed.summary || '';
        keyPoints = parsed.keyPoints || [];
        console.log('✅ Image analysis:', { title, tags, category, extractedTextLength: extractedText.length });
      } catch (error) {
        console.error('❌ Image analysis error:', error);
        description = 'Image file';
        tags = ['image'];
        if (error instanceof Error && (error.message.includes('Rate limit') || error.message.includes('credits'))) {
          throw error; // Propagate rate limit/credit errors to client
        }
      }

    } else if (fileType === 'application/pdf') {
      // ========== PDF PROCESSING ==========
      console.log('📄 Processing PDF with content extraction');
      
      try {
        const { text, pageCount, metadata } = await extractPdfText(fileUrl);
        extractedText = text;
        
        // Prefer embedded title if it's clean and meaningful
        const embeddedTitle = metadata.Title || metadata.title;
        if (embeddedTitle && embeddedTitle.length > 3 && embeddedTitle.length < 200 && !embeddedTitle.match(/^[a-f0-9-]{20,}$/i)) {
          title = embeddedTitle;
        }
        
        // Sample text for AI analysis
        const textSample = sampleText(extractedText, 2500);
        
        const prompt = `**CRITICAL: Base your response ONLY on the provided content. Do not infer, assume, or add information not present in the text.**

Analyze this PDF document with ${pageCount} pages and extract factual information.

**Filename**: ${fileName}

**Extracted Text Sample**:
${textSample}

**Metadata**: ${JSON.stringify(metadata)}

Provide analysis based strictly on the content above:

1. **Title**: Use the embedded metadata title if present and meaningful. Otherwise, create a title from the document's actual content.

2. **Description**: Describe the document based only on visible content. Identify:
   - Academic identifiers if present (DOI, PMID, journal names, citations)
   - Medical/scientific terminology that appears in text
   - Business patterns visible (invoices, reports, proposals, contracts)
   - Technical documentation elements (API docs, manuals, specifications)
   - Date patterns, version numbers found in text

3. **Category**: Classify based on actual content as: academic, business, personal, technical, medical, financial, legal, creative, or other

4. **Tags**: Provide 4-6 highly specific tags based strictly on the content and type present in the document

5. **Summary**: Write a 2-3 sentence summary of what is actually in the content

6. **Key Points**: List 3-5 main topics or findings that are explicitly mentioned in the document

Use the analyze_file function to provide structured output.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            tools: [analyzeFileToolSchema],
            tool_choice: { type: "function", function: { name: "analyze_file" } }
          }),
        });

        if (aiResponse.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (aiResponse.status === 402) {
          throw new Error("AI credits exhausted. Please add credits to continue.");
        }

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          
          // Use validateAndParseAiJson with fallback
          const fallback = {
            title,
            description: `PDF document with ${pageCount} pages`,
            tags: ['pdf', 'document'],
            category: 'other'
          };
          
          const parsed = validateAndParseAiJson(toolCall?.function?.arguments, fallback);
          title = parsed.title || title;
          description = parsed.description || `PDF document with ${pageCount} pages`;
          tags = parsed.tags || ['pdf', 'document'];
          category = parsed.category || 'other';
          summary = parsed.summary || '';
          keyPoints = parsed.keyPoints || [];
          
          console.log('✅ PDF analysis:', { title, tags, category, pageCount, textLength: extractedText.length });
        } else {
          console.error('❌ AI analysis failed:', await aiResponse.text());
          tags = ['pdf', 'document'];
          description = `PDF document with ${pageCount} pages`;
        }

        // Fallback: ensure we have a non-empty summary for PDFs
        if ((!summary || summary.trim().length < 5) && extractedText && extractedText.trim().length > 0) {
          try {
            const fallbackPrompt = `Write a concise 2-3 sentence summary of this PDF content. Focus on the main topic and purpose.\n\n${sampleText(extractedText, 1500)}`;
            const sumResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [{ role: "user", content: fallbackPrompt }],
              }),
            });
            if (sumResp.ok) {
              const sumData = await sumResp.json();
              const sumText = sumData.choices?.[0]?.message?.content?.trim();
              if (sumText) summary = sumText;
            } else {
              console.warn('⚠️ Fallback summary failed with status', sumResp.status);
            }
          } catch (e) {
            console.warn('⚠️ Fallback PDF summary error:', e);
          }
        }
        
        // Generate thumbnail from first page if userId is available
        if (userId) {
          previewImageUrl = await generatePdfThumbnail(fileUrl, userId);
        } else {
          console.log('⚠️ Skipping thumbnail generation - user not authenticated');
        }
      } catch (error) {
        console.error('❌ PDF processing error:', error);
        description = 'PDF document';
        tags = ['pdf', 'document'];
        if (error instanceof Error && (error.message.includes('Rate limit') || error.message.includes('credits'))) {
          throw error;
        }
      }
      
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileType === 'application/msword') {
      // ========== DOCX PROCESSING ==========
      console.log('📝 Processing Word document with content extraction');
      
      try {
        const { text, metadata } = await extractDocxText(fileUrl);
        extractedText = text;
        
        // Prefer embedded title if meaningful
        if (metadata.Title && metadata.Title.length > 3 && metadata.Title.length < 200) {
          title = metadata.Title;
        }
        
        const textSample = sampleText(extractedText, 2500);
        
        const prompt = `**CRITICAL: Base your response ONLY on the provided content. Do not infer, assume, or add information not present in the text.**

Analyze this Word document and extract factual information.

**Filename**: ${fileName}

**Extracted Text Sample**:
${textSample}

**Metadata**: ${JSON.stringify(metadata)}

Provide analysis based strictly on the content above:

1. **Title**: Use embedded metadata title if present and meaningful. Otherwise, create a title from the document's actual content.
2. **Description**: Detailed description based only on visible content in the document.
3. **Category**: Classify based on actual content as: academic, business, personal, technical, medical, financial, legal, creative, or other
4. **Tags**: 4-6 specific tags based strictly on the content present
5. **Summary**: 2-3 sentence summary of what is actually in the content
6. **Key Points**: 3-5 main topics explicitly mentioned in the document

Use the analyze_file function to provide structured output.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            tools: [analyzeFileToolSchema],
            tool_choice: { type: "function", function: { name: "analyze_file" } }
          }),
        });

        if (aiResponse.status === 429 || aiResponse.status === 402) {
          throw new Error(aiResponse.status === 429 ? "Rate limit exceeded. Please try again later." : "AI credits exhausted. Please add credits to continue.");
        }

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          
          // Use validateAndParseAiJson with fallback
          const fallback = {
            title,
            description: 'Word document',
            tags: ['word', 'document'],
            category: 'other'
          };
          
          const parsed = validateAndParseAiJson(toolCall?.function?.arguments, fallback);
          title = parsed.title || title;
          description = parsed.description || 'Word document';
          tags = parsed.tags || ['word', 'document'];
          category = parsed.category || 'other';
          summary = parsed.summary || '';
          keyPoints = parsed.keyPoints || [];
          
          console.log('✅ DOCX analysis:', { title, tags, category, textLength: extractedText.length });
        } else {
          console.error('❌ AI analysis failed');
          tags = ['word', 'document'];
        }
      } catch (error) {
        console.error('❌ DOCX processing error:', error);
        description = 'Word document';
        tags = ['word', 'document'];
        if (error instanceof Error && (error.message.includes('Rate limit') || error.message.includes('credits'))) {
          throw error;
        }
      }
      
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileType === 'application/vnd.ms-excel') {
      // ========== SPREADSHEET ==========
      console.log('📊 Processing spreadsheet');
      description = 'Spreadsheet containing data tables and calculations';
      tags = normalizeTags(['spreadsheet', 'data', 'excel', 'business']);
      category = 'business';
      
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || fileType === 'application/vnd.ms-powerpoint') {
      // ========== PRESENTATION ==========
      console.log('📽️ Processing presentation');
      description = 'Presentation slides';
      tags = normalizeTags(['presentation', 'slides', 'powerpoint', 'business']);
      category = 'business';
      
    } else if (fileType === 'text/plain' || fileType === 'text/markdown' || fileType === 'text/csv') {
      // ========== TEXT FILES ==========
      console.log('📄 Processing text file');
      try {
        const fileResponse = await fetch(fileUrl);
        if (fileResponse.ok) {
          const textContent = await fileResponse.text();
          extractedText = textContent.substring(0, 50000);
          
          const textSample = sampleText(extractedText, 2000);
          const prompt = `**CRITICAL: Base your response ONLY on the provided content. Do not infer, assume, or add information not present in the text.**

Analyze this ${fileType} file and extract factual information.

**Filename**: ${fileName}

**Content Sample**:
${textSample}

Provide structured metadata based strictly on the content above: title, description, 4-6 tags, category, 2-3 sentence summary, and 3-5 key points.

Use the analyze_file function.`;

          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "user", content: prompt }],
              tools: [analyzeFileToolSchema],
              tool_choice: { type: "function", function: { name: "analyze_file" } }
            }),
          });

          if (aiResponse.ok) {
            const data = await aiResponse.json();
            const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
            
            // Use validateAndParseAiJson with fallback
            const fallback = {
              title,
              description: 'Text file',
              tags: ['text'],
              category: 'other'
            };
            
            const parsed = validateAndParseAiJson(toolCall?.function?.arguments, fallback);
            title = parsed.title || title;
            description = parsed.description || 'Text file';
            tags = parsed.tags || ['text'];
            category = parsed.category || 'other';
            summary = parsed.summary || '';
            keyPoints = parsed.keyPoints || [];
            console.log('✅ Text file analysis:', { title, tags, category });
          }
        }
      } catch (error) {
        console.error('❌ Text file error:', error);
        tags = ['text', 'document'];
      }
      
    } else if (fileType.startsWith('audio/')) {
      // ========== AUDIO FILES ==========
      console.log('🎵 Processing audio file');
      description = 'Audio file';
      tags = normalizeTags(['audio', 'media']);
      category = 'other';
      
    } else {
      // ========== GENERIC FILES ==========
      console.log('📦 Processing generic file');
      description = 'Uploaded file';
      tags = ['file'];
      category = 'other';
    }

    // Ensure tags have fallback
    if (tags.length === 0 || tags[0] === 'file') {
      const typeTag = fileType.split('/')[1] || 'file';
      tags = [typeTag, 'document'];
    }

    // Final cleanup pass on all metadata before returning
    const finalMetadata = cleanMetadataFields({
      title,
      description,
      tags,
      extractedText: extractedText.substring(0, 5000), // Return first 5k for storage
      category,
      summary,
      keyPoints
    });

    console.log('✅ Analysis complete:', { 
      title: finalMetadata.title, 
      category: finalMetadata.category,
      tags: finalMetadata.tags, 
      extractedTextLength: finalMetadata.extractedText?.length || 0,
      hasSummary: !!finalMetadata.summary,
      keyPointsCount: finalMetadata.keyPoints?.length || 0,
      hasPreviewImage: !!previewImageUrl
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
        previewImageUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in analyze-file function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      {
        status: error instanceof Error && (error.message.includes('Rate limit') || error.message.includes('credits')) ? 429 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
