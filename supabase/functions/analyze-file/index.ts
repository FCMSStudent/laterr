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
          .map((item: any) => (item.str || ''))
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
    // Return empty result instead of throwing, so we can use multimodal fallback
    return {
      text: '',
      pageCount: 0,
      metadata: {}
    };
  }
}

// Constants for PDF analysis
const TEXT_SAMPLE_MAX_LENGTH = 2000;
const MIN_TITLE_LENGTH = 3;
const MAX_TITLE_LENGTH = 200;
const SUMMARY_TEXT_SAMPLE_LENGTH = 1500;
const MIN_TEXT_FOR_MULTIMODAL_BYPASS = 50;

// Helper function to render PDF page to PNG base64 using pdfjs-dist
// NOTE: Currently returns null due to Deno edge runtime limitations (no Canvas API)
// This function is a placeholder for future implementation when canvas support becomes available
// or when using an external PDF-to-image service.
async function renderPdfPageToPng(
  fileUrl: string,
  pageNum: number = 1,
  scale: number = 1.5
): Promise<string | null> {
  console.log('⚠️ PDF page rendering not available in Deno edge runtime (no Canvas API)');
  console.log('🔄 Using alternative approach: text extraction + metadata analysis');
  // TODO: Implement using external service or when Deno canvas support is available
  return null;
}

// Analyze PDF using AI multimodal capabilities with enhanced approach
async function analyzePdfWithMultimodal(
  fileUrl: string,
  fileName: string,
  apiKey: string,
  extractedText?: string,
  metadata?: Record<string, unknown>
): Promise<{ title: string; description: string; tags: string[]; category: string; summary: string; keyPoints: string[] }> {
  console.log('🔄 Using enhanced multimodal AI to analyze PDF...');
  console.log(`📊 Text available: ${extractedText ? extractedText.length : 0} chars`);
  console.log(`📊 Metadata available: ${metadata ? Object.keys(metadata).length : 0} fields`);
  
  // Try to render PDF page to image
  const pngBase64 = await renderPdfPageToPng(fileUrl, 1, 1.5);
  
  // Build a comprehensive prompt that uses all available information
  let contentParts: any[] = [];
  let promptText = `Analyze this PDF document and extract structured metadata.\n\n**Filename**: ${fileName}\n\n`;
  
  // Include metadata if available
  if (metadata && Object.keys(metadata).length > 0) {
    promptText += `**PDF Metadata**:\n`;
    const metaTitle = metadata.Title || metadata.title;
    const metaAuthor = metadata.Author || metadata.author;
    const metaSubject = metadata.Subject || metadata.subject;
    
    if (metaTitle) promptText += `- Title: ${metaTitle}\n`;
    if (metaAuthor) promptText += `- Author: ${metaAuthor}\n`;
    if (metaSubject) promptText += `- Subject: ${metaSubject}\n`;
    promptText += '\n';
  }
  
  // Include any extracted text (even partial)
  if (extractedText && extractedText.trim().length > 0) {
    const textSample = extractedText.substring(0, TEXT_SAMPLE_MAX_LENGTH);
    promptText += `**Extracted Text Sample** (first ${Math.min(extractedText.length, TEXT_SAMPLE_MAX_LENGTH)} chars):\n${textSample}\n\n`;
  } else {
    promptText += `**Note**: Text extraction failed or returned empty content. This may be a scanned PDF or image-based document.\n\n`;
  }
  
  promptText += `Based on the available information above, provide:
1. **Title**: A clear, descriptive title. Use metadata title if meaningful, otherwise derive from content/filename
2. **Description**: Detailed description of the document's content and purpose
3. **Category**: Classify as: academic, business, personal, technical, medical, financial, legal, creative, or other
4. **Tags**: 4-6 specific categorization tags
5. **Summary**: 2-3 sentence summary of the main content
6. **Key Points**: 3-5 main topics or findings

Use the analyze_file function to provide structured output.`;

  contentParts.push({ type: "text", text: promptText });
  
  // If we successfully rendered a PNG, include it (but this won't work currently due to Deno limitations)
  if (pngBase64) {
    contentParts.push({
      type: "image_url",
      image_url: {
        url: `data:image/png;base64,${pngBase64}`
      }
    });
    console.log('✅ Including rendered PDF page as PNG image');
  }

  console.log('📤 Sending multimodal analysis request to AI...');
  const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{
        role: "user",
        content: contentParts
      }],
      tools: [analyzeFileToolSchema],
      tool_choice: { type: "function", function: { name: "analyze_file" } }
    }),
  });

  if (aiResponse.status === 429) {
    console.error('❌ Rate limit exceeded');
    throw new Error("Rate limit exceeded. Please try again later.");
  }
  if (aiResponse.status === 402) {
    console.error('❌ AI credits exhausted');
    throw new Error("AI credits exhausted. Please add credits to continue.");
  }

  if (!aiResponse.ok) {
    const errorText = await aiResponse.text();
    console.error('❌ Multimodal AI error:', aiResponse.status, errorText);
    throw new Error(`Multimodal AI analysis failed: ${aiResponse.statusText} - ${errorText}`);
  }

  const data = await aiResponse.json();
  console.log('📥 AI response received:', data.choices?.[0]?.message ? 'Valid' : 'Invalid');
  
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  // Build intelligent fallback using metadata
  const metaTitle = metadata?.Title || metadata?.title;
  const fallback = {
    title: (metaTitle && typeof metaTitle === 'string' && metaTitle.length > MIN_TITLE_LENGTH) 
      ? cleanTitle(metaTitle)
      : fileName.replace(/\.[^/.]+$/, ''),
    description: 'PDF document',
    tags: ['pdf', 'document'],
    category: 'other' as const,
    summary: '',
    keyPoints: []
  };
  
  const parsed = validateAndParseAiJson(toolCall?.function?.arguments, fallback);
  console.log('✅ Multimodal PDF analysis complete:', { 
    title: parsed.title, 
    tags: parsed.tags, 
    hasExtractedText: !!extractedText,
    textLength: extractedText?.length || 0
  });
  
  return {
    title: parsed.title || fallback.title,
    description: parsed.description || fallback.description,
    tags: parsed.tags || fallback.tags,
    category: parsed.category || fallback.category,
    summary: parsed.summary || fallback.summary,
    keyPoints: parsed.keyPoints || fallback.keyPoints
  };
}

// Generate thumbnail from PDF first page
// Note: Canvas API is not available in Deno edge runtime
// PDF thumbnail generation requires either:
// - Headless browser (Puppeteer/Playwright) - not available in Supabase Edge Functions
// - Server-side canvas library - limited Deno support
// - External PDF-to-image service
// The PDFPreview component handles rendering in the browser instead
async function generatePdfThumbnail(
  fileUrl: string,
  userId: string
): Promise<string | null> {
  try {
    console.log('🖼️ PDF thumbnail generation not supported in edge runtime');
    // In a production environment with proper infrastructure, you would:
    // 1. Use a headless browser or PDF rendering service
    // 2. Extract first page and convert to JPEG/PNG
    // 3. Upload to storage bucket (e.g., 'thumbnails')
    // 4. Return the thumbnail URL
    // For now, PDFs are rendered client-side with react-pdf
    return null;
  } catch (error) {
    console.error('❌ PDF thumbnail generation failed:', error);
    return null;
  }
}

// Generate thumbnail from video first frame
async function generateVideoThumbnail(
  fileUrl: string,
  userId: string
): Promise<string | null> {
  try {
    console.log('🎬 Video thumbnail: Marking for client-side extraction');
    // Video thumbnail generation in edge functions requires FFmpeg or similar
    // which is not available in the Deno edge runtime
    // In a production environment, you would:
    // 1. Use FFmpeg to extract first frame: ffmpeg -i video.mp4 -ss 00:00:01 -vframes 1 thumb.jpg
    // 2. Upload the thumbnail to storage
    // 3. Return the thumbnail URL
    // For now, return null - client can show video icon or extract frame on client side
    return null;
  } catch (error) {
    console.error('❌ Video thumbnail generation failed:', error);
    return null;
  }
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

// Split long text into segments for improved summarization
function splitIntoSegments(text: string, segmentSize: number = 5000): string[] {
  const segments: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let currentSegment = '';
  
  for (const para of paragraphs) {
    if ((currentSegment + para).length > segmentSize && currentSegment.length > 0) {
      segments.push(currentSegment.trim());
      currentSegment = para;
    } else {
      currentSegment += (currentSegment ? '\n\n' : '') + para;
    }
  }
  
  if (currentSegment.trim()) {
    segments.push(currentSegment.trim());
  }
  
  return segments;
}

// Generate cohesive summary from segment summaries with AI
async function generateCohesiveSummary(
  segmentSummaries: string[],
  apiKey: string,
  fileName: string
): Promise<{ summary: string; keyPoints: string[] }> {
  try {
    const prompt = `You are analyzing a document titled "${fileName}".

Below are summaries of different segments from this document:

${segmentSummaries.map((s, i) => `Segment ${i + 1}: ${s}`).join('\n\n')}

Based on these segment summaries, provide:
1. A cohesive 2-3 sentence summary that captures the main content and purpose of the entire document
2. 3-5 key points or takeaways from the document

Respond in JSON format with "summary" and "keyPoints" (array) fields.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          summary: parsed.summary || '',
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 5) : []
        };
      }
    }
  } catch (error) {
    console.warn('⚠️ Cohesive summary generation failed:', error);
  }
  
  // Fallback: concatenate summaries
  return {
    summary: segmentSummaries.slice(0, 2).join(' '),
    keyPoints: []
  };
}

// Extract data from Excel/CSV spreadsheet
async function extractSpreadsheetData(fileUrl: string, fileType: string): Promise<{ 
  headers: string[]; 
  firstRows: string[][]; 
  rowCount: number;
  columnCount: number;
}> {
  try {
    console.log('📊 Fetching spreadsheet bytes...');
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch spreadsheet: ${response.status}`);
    
    if (fileType === 'text/csv') {
      // Parse CSV
      const text = await response.text();
      const lines = text.split('\n').filter(line => line.trim());
      const rows = lines.map(line => {
        // Simple CSV parsing (handles basic quotes)
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });
      
      const headers = rows[0] || [];
      const firstRows = rows.slice(1, 6); // Get first 5 data rows
      
      console.log(`📊 CSV: ${rows.length} rows, ${headers.length} columns`);
      return {
        headers,
        firstRows,
        rowCount: rows.length - 1,
        columnCount: headers.length
      };
    } else {
      // Parse Excel using xlsx
      const arrayBuffer = await response.arrayBuffer();
      console.log(`📊 Excel size: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);
      
      const zip = await JSZip.loadAsync(arrayBuffer);
      
      // Extract from xl/worksheets/sheet1.xml
      const sheetXml = await zip.file('xl/worksheets/sheet1.xml')?.async('string');
      if (!sheetXml) {
        throw new Error('Could not find worksheet in Excel file');
      }
      
      // Extract shared strings for lookup
      const sharedStringsXml = await zip.file('xl/sharedStrings.xml')?.async('string');
      const sharedStrings: string[] = [];
      if (sharedStringsXml) {
        const matches = sharedStringsXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g);
        for (const match of matches) {
          sharedStrings.push(match[1]);
        }
      }
      
      // Extract cell values
      const cellMatches = sheetXml.matchAll(/<c r="([A-Z]+\d+)"[^>]*(?:\s+t="([^"]*)")?[^>]*><v>([^<]*)<\/v><\/c>/g);
      const cells: Map<string, string> = new Map();
      
      for (const match of cellMatches) {
        const cellRef = match[1];
        const cellType = match[2];
        const value = match[3];
        
        // If type is 's', it's a shared string reference
        if (cellType === 's') {
          const index = parseInt(value);
          cells.set(cellRef, sharedStrings[index] || value);
        } else {
          cells.set(cellRef, value);
        }
      }
      
      // Organize into rows
      const rowData: Map<number, Map<string, string>> = new Map();
      for (const [cellRef, value] of cells.entries()) {
        const rowMatch = cellRef.match(/([A-Z]+)(\d+)/);
        if (rowMatch) {
          const col = rowMatch[1];
          const row = parseInt(rowMatch[2]);
          
          if (!rowData.has(row)) {
            rowData.set(row, new Map());
          }
          rowData.get(row)!.set(col, value);
        }
      }
      
      // Get unique columns and sort them
      const allColumns = new Set<string>();
      for (const row of rowData.values()) {
        for (const col of row.keys()) {
          allColumns.add(col);
        }
      }
      const sortedColumns = Array.from(allColumns).sort();
      
      // Convert to arrays
      const rows: string[][] = [];
      const sortedRowNumbers = Array.from(rowData.keys()).sort((a, b) => a - b);
      
      for (const rowNum of sortedRowNumbers.slice(0, 6)) {
        const rowMap = rowData.get(rowNum)!;
        const rowArray = sortedColumns.map(col => rowMap.get(col) || '');
        rows.push(rowArray);
      }
      
      const headers = rows[0] || [];
      const firstRows = rows.slice(1);
      
      console.log(`📊 Excel: ${sortedRowNumbers.length} rows, ${sortedColumns.length} columns`);
      return {
        headers,
        firstRows,
        rowCount: sortedRowNumbers.length - 1,
        columnCount: sortedColumns.length
      };
    }
  } catch (error) {
    console.error('❌ Spreadsheet extraction failed:', error);
    throw error;
  }
}

// Extract content from PowerPoint presentation
async function extractPresentationContent(fileUrl: string): Promise<{ 
  slideCount: number;
  slideTitles: string[];
  bulletPoints: string[];
}> {
  try {
    console.log('📽️ Fetching presentation bytes...');
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch presentation: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(`📽️ PowerPoint size: ${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`);
    
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // Get all slide files
    const slideFiles = Object.keys(zip.files).filter(name => name.match(/ppt\/slides\/slide\d+\.xml/));
    slideFiles.sort((a, b) => {
      const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
      const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
      return aNum - bNum;
    });
    
    console.log(`📽️ Found ${slideFiles.length} slides`);
    
    const slideTitles: string[] = [];
    const bulletPoints: string[] = [];
    
    // Process each slide
    for (const slideFile of slideFiles.slice(0, 20)) { // Process max 20 slides
      const slideXml = await zip.file(slideFile)?.async('string');
      if (!slideXml) continue;
      
      // Extract all text from <a:t> tags
      const textMatches = slideXml.matchAll(/<a:t>([^<]+)<\/a:t>/g);
      const texts = Array.from(textMatches).map(m => m[1]);
      
      if (texts.length > 0) {
        // First text is likely the title
        slideTitles.push(texts[0]);
        
        // Remaining texts are bullet points
        for (let i = 1; i < Math.min(texts.length, 6); i++) {
          if (texts[i].length > 5) { // Filter out very short texts
            bulletPoints.push(texts[i]);
          }
        }
      }
    }
    
    console.log(`📽️ Extracted ${slideTitles.length} titles and ${bulletPoints.length} bullet points`);
    
    return {
      slideCount: slideFiles.length,
      slideTitles,
      bulletPoints: bulletPoints.slice(0, 15) // Limit to 15 bullet points
    };
  } catch (error) {
    console.error('❌ PowerPoint extraction failed:', error);
    throw error;
  }
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
      console.log('📄 Processing PDF with enhanced segmented summarization');
      
      try {
        const { text, pageCount, metadata } = await extractPdfText(fileUrl);
        extractedText = text;
        
        console.log(`📊 PDF Processing Summary: ${pageCount} pages, ${extractedText.length} chars extracted`);
        
        // Enhanced fallback logic: Try multimodal even with some text if it's minimal
        const hasMinimalText = extractedText && extractedText.trim().length > 0 && extractedText.trim().length < MIN_TEXT_FOR_MULTIMODAL_BYPASS;
        const hasNoText = !extractedText || extractedText.trim().length === 0;
        
        if (hasNoText || hasMinimalText) {
          console.log(`⚠️ PDF text extraction ${hasNoText ? 'failed or empty' : 'returned minimal text'} (${extractedText.trim().length} chars)`);
          console.log('🔄 Attempting multimodal AI fallback with enhanced approach...');
          
          try {
            // Pass extracted text and metadata to multimodal for hybrid analysis
            const multimodalResult = await analyzePdfWithMultimodal(
              fileUrl, 
              fileName, 
              LOVABLE_API_KEY,
              extractedText,
              metadata
            );
            title = multimodalResult.title;
            description = multimodalResult.description;
            tags = multimodalResult.tags;
            category = multimodalResult.category;
            summary = multimodalResult.summary;
            keyPoints = multimodalResult.keyPoints;
            
            console.log('✅ PDF multimodal analysis complete:', { 
              title, 
              tags, 
              category,
              hasSummary: !!summary,
              keyPointsCount: keyPoints.length 
            });
          } catch (multimodalError) {
            console.error('❌ Multimodal fallback failed:', multimodalError);
            console.error('❌ Error details:', multimodalError instanceof Error ? multimodalError.message : String(multimodalError));
            
            if (multimodalError instanceof Error && (multimodalError.message.includes('Rate limit') || multimodalError.message.includes('credits'))) {
              throw multimodalError;
            }
            
            // Enhanced filename and metadata-based fallback
            console.log('🔄 Using metadata + filename-based fallback...');
            const metaTitle = metadata.Title || metadata.title;
            if (metaTitle && typeof metaTitle === 'string' && metaTitle.length > MIN_TITLE_LENGTH && metaTitle.length < MAX_TITLE_LENGTH) {
              title = cleanTitle(metaTitle);
              console.log('📄 Using PDF metadata title:', title);
            } else {
              title = fileName.replace(/\.[^/.]+$/, '');
              console.log('📄 Using filename as title:', title);
            }
            
            description = `PDF document with ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`;
            tags = ['pdf', 'document'];
            category = 'other';
            
            // Try to generate at least a basic summary if we have any text
            if (extractedText && extractedText.trim().length > 0) {
              summary = `PDF document containing ${extractedText.trim().length} characters of text across ${pageCount} ${pageCount === 1 ? 'page' : 'pages'}.`;
            }
          }
        } else {
          // Text extraction succeeded with substantial content - continue with text-based analysis
          console.log('✅ PDF text extraction successful, proceeding with text-based analysis');
        
        // Prefer embedded title if it's clean and meaningful
        const embeddedTitle = metadata.Title || metadata.title;
        if (embeddedTitle && typeof embeddedTitle === 'string' && embeddedTitle.length > MIN_TITLE_LENGTH && embeddedTitle.length < MAX_TITLE_LENGTH && !embeddedTitle.match(/^[a-f0-9-]{20,}$/i)) {
          title = cleanTitle(embeddedTitle);
          console.log('📄 Using embedded PDF title:', title);
        }
        
        // For long documents, use segmented summarization
        let textSample = '';
        let useSegmentedApproach = false;
        
        if (extractedText.length > 15000) {
          console.log('📄 Long document detected, using segmented summarization');
          useSegmentedApproach = true;
          const segments = splitIntoSegments(extractedText, 8000);
          console.log(`📄 Split into ${segments.length} segments`);
          
          // For now, use head-middle-tail approach for AI analysis
          textSample = sampleText(extractedText, 3000);
        } else {
          textSample = sampleText(extractedText, 2500);
        }
        
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

        console.log('📤 Sending text-based AI analysis request...');
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

        console.log(`📥 AI response status: ${aiResponse.status} ${aiResponse.statusText}`);

        if (aiResponse.status === 429) {
          console.error('❌ Rate limit exceeded during PDF analysis');
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (aiResponse.status === 402) {
          console.error('❌ AI credits exhausted during PDF analysis');
          throw new Error("AI credits exhausted. Please add credits to continue.");
        }

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          console.log('📥 AI response received:', {
            hasChoices: !!data.choices,
            choicesLength: data.choices?.length,
            hasToolCalls: !!data.choices?.[0]?.message?.tool_calls
          });
          
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            console.log('✅ AI tool call received, parsing structured data...');
          } else {
            console.warn('⚠️ No tool call in AI response, using fallback values');
          }
          
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
          
          console.log('✅ PDF text-based analysis complete:', { 
            title: title.substring(0, 50), 
            tags, 
            category, 
            pageCount, 
            textLength: extractedText.length,
            hasSummary: !!summary && summary.length > 0,
            keyPointsCount: keyPoints.length
          });
        } else {
          const errorText = await aiResponse.text();
          console.error('❌ AI analysis request failed:', {
            status: aiResponse.status,
            statusText: aiResponse.statusText,
            error: errorText
          });
          tags = ['pdf', 'document'];
          description = `PDF document with ${pageCount} pages`;
        }

        // Fallback: ensure we have a non-empty summary for PDFs
        if ((!summary || summary.trim().length < 5) && extractedText && extractedText.trim().length > 0) {
          console.log('🔄 Summary missing or too short, attempting fallback summary generation...');
          try {
            const textForSummary = sampleText(extractedText, SUMMARY_TEXT_SAMPLE_LENGTH);
            console.log(`📝 Using ${textForSummary.length} chars for summary generation`);
            
            const fallbackPrompt = `Write a concise 2-3 sentence summary of this PDF content. Focus on the main topic and purpose.\n\n${textForSummary}`;
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
            
            console.log(`📥 Fallback summary response: ${sumResp.status} ${sumResp.statusText}`);
            
            if (sumResp.ok) {
              const sumData = await sumResp.json();
              const sumText = sumData.choices?.[0]?.message?.content?.trim();
              if (sumText && sumText.length > 0) {
                summary = sumText;
                console.log('✅ Fallback summary generated successfully:', summary.substring(0, 100));
              } else {
                console.warn('⚠️ Fallback summary response was empty');
              }
            } else {
              const errorText = await sumResp.text();
              console.warn('⚠️ Fallback summary failed:', {
                status: sumResp.status,
                error: errorText
              });
            }
          } catch (e) {
            console.error('❌ Fallback PDF summary error:', e instanceof Error ? e.message : String(e));
          }
        } else if (summary && summary.trim().length > 0) {
          console.log(`✅ Summary already present (${summary.length} chars)`);
        } else {
          console.log('⚠️ No summary available and no extracted text for fallback');
        }
        } // Close else block for successful text extraction
        
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
        if (metadata.Title && typeof metadata.Title === 'string' && metadata.Title.length > 3 && metadata.Title.length < 200) {
          title = cleanTitle(metadata.Title);
          console.log('📝 Using embedded DOCX title:', title);
        }
        
        // For long documents, use enhanced sampling
        let textSample = '';
        if (extractedText.length > 15000) {
          console.log('📝 Long document detected, using enhanced sampling');
          textSample = sampleText(extractedText, 3000);
        } else {
          textSample = sampleText(extractedText, 2500);
        }
        
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
      
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileType === 'application/vnd.ms-excel' || fileType === 'text/csv') {
      // ========== SPREADSHEET ==========
      console.log('📊 Processing spreadsheet with structure analysis');
      
      try {
        const { headers, firstRows, rowCount, columnCount } = await extractSpreadsheetData(fileUrl, fileType);
        
        // Build a sample of the data for AI analysis
        const dataSample = [
          `Headers: ${headers.join(', ')}`,
          `Sample rows (first ${Math.min(firstRows.length, 5)}):`,
          ...firstRows.slice(0, 5).map((row, i) => `Row ${i + 1}: ${row.join(', ')}`)
        ].join('\n');
        
        const prompt = `**CRITICAL: Base your response ONLY on the provided spreadsheet structure. Do not infer, assume, or add information not present in the data.**

Analyze this spreadsheet and extract factual information.

**Filename**: ${fileName}

**Structure**: ${rowCount} rows, ${columnCount} columns

**Data Sample**:
${dataSample}

Based on the headers and sample data, provide:
1. **Title**: Descriptive title based on the filename and data type
2. **Description**: Describe the dataset structure and what type of data it contains (e.g., financial records, inventory, sales data, customer list, etc.)
3. **Category**: Classify based on content type (business, financial, personal, technical, etc.)
4. **Tags**: Provide 4-6 specific tags based on the data type and purpose
5. **Summary**: 2-3 sentence summary describing the dataset structure and purpose
6. **Key Points**: 3-5 key observations about the data structure (e.g., "Contains financial transactions from 2023", "Tracks inventory with quantity and pricing")

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
          
          const fallback = {
            title,
            description: `Spreadsheet with ${rowCount} rows and ${columnCount} columns`,
            tags: ['spreadsheet', 'data', fileType === 'text/csv' ? 'csv' : 'excel'],
            category: 'business'
          };
          
          const parsed = validateAndParseAiJson(toolCall?.function?.arguments, fallback);
          title = parsed.title || title;
          description = parsed.description || fallback.description;
          tags = parsed.tags || fallback.tags;
          category = parsed.category || 'business';
          summary = parsed.summary || '';
          keyPoints = parsed.keyPoints || [];
          extractedText = dataSample;
          
          console.log('✅ Spreadsheet analysis:', { title, tags, category, rowCount, columnCount });
        } else {
          console.error('❌ AI analysis failed');
          description = `Spreadsheet with ${rowCount} rows and ${columnCount} columns`;
          tags = ['spreadsheet', 'data', fileType === 'text/csv' ? 'csv' : 'excel'];
          category = 'business';
          extractedText = dataSample;
        }
      } catch (error) {
        console.error('❌ Spreadsheet processing error:', error);
        description = 'Spreadsheet containing data tables';
        tags = ['spreadsheet', 'data'];
        category = 'business';
        if (error instanceof Error && (error.message.includes('Rate limit') || error.message.includes('credits'))) {
          throw error;
        }
      }
      
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || fileType === 'application/vnd.ms-powerpoint') {
      // ========== PRESENTATION ==========
      console.log('📽️ Processing presentation with content extraction');
      
      try {
        const { slideCount, slideTitles, bulletPoints } = await extractPresentationContent(fileUrl);
        
        const contentSample = [
          `Total slides: ${slideCount}`,
          `\nSlide titles:`,
          ...slideTitles.slice(0, 10).map((t, i) => `${i + 1}. ${t}`),
          `\nKey bullet points:`,
          ...bulletPoints.slice(0, 10).map(b => `• ${b}`)
        ].join('\n');
        
        const prompt = `**CRITICAL: Base your response ONLY on the provided presentation content. Do not infer, assume, or add information not present in the slides.**

Analyze this presentation and extract factual information.

**Filename**: ${fileName}

**Content Sample**:
${contentSample}

Based on the slide titles and bullet points, provide:
1. **Title**: Descriptive title based on the presentation content
2. **Description**: Describe the presentation's purpose and content type
3. **Category**: Classify based on content (business, academic, technical, creative, etc.)
4. **Tags**: Provide 4-6 specific tags based on the presentation type (e.g., 'pitch-deck', 'training', 'product-demo', 'quarterly-report', etc.)
5. **Summary**: 2-3 sentence summary describing the presentation's main purpose and content
6. **Key Points**: 3-5 main topics covered in the presentation

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
          
          const fallback = {
            title,
            description: `Presentation with ${slideCount} slides`,
            tags: ['presentation', 'slides', 'powerpoint'],
            category: 'business'
          };
          
          const parsed = validateAndParseAiJson(toolCall?.function?.arguments, fallback);
          title = parsed.title || title;
          description = parsed.description || fallback.description;
          tags = parsed.tags || fallback.tags;
          category = parsed.category || 'business';
          summary = parsed.summary || '';
          keyPoints = parsed.keyPoints || [];
          extractedText = contentSample;
          
          console.log('✅ Presentation analysis:', { title, tags, category, slideCount });
        } else {
          console.error('❌ AI analysis failed');
          description = `Presentation with ${slideCount} slides`;
          tags = ['presentation', 'slides', 'powerpoint'];
          category = 'business';
          extractedText = contentSample;
        }
      } catch (error) {
        console.error('❌ Presentation processing error:', error);
        description = 'Presentation slides';
        tags = ['presentation', 'slides'];
        category = 'business';
        if (error instanceof Error && (error.message.includes('Rate limit') || error.message.includes('credits'))) {
          throw error;
        }
      }
      
    } else if (fileType === 'text/plain' || fileType === 'text/markdown') {
      // ========== TEXT FILES ==========
      console.log('📄 Processing text file with segmented analysis');
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
      
    } else if (fileType.startsWith('video/')) {
      // ========== VIDEO FILES ==========
      console.log('🎬 Processing video file');
      
      try {
        // Generate thumbnail from first frame
        if (userId) {
          previewImageUrl = await generateVideoThumbnail(fileUrl, userId);
        }
        
        // Basic metadata for video
        title = cleanTitle(fileName || 'Video');
        description = 'Video file';
        tags = normalizeTags(['video', 'media', 'watch later']);
        category = 'other';
        summary = `Video file: ${fileName}`;
        
        console.log('✅ Video file processed:', { title, tags });
      } catch (error) {
        console.error('❌ Video processing error:', error);
        description = 'Video file';
        tags = ['video', 'media'];
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
