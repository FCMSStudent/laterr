import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.6.82/legacy/build/pdf.mjs";
import JSZip from "https://esm.sh/jszip@3.10.1";

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

// Utility: Clean filename into title
function cleanTitle(fileName: string): string {
  return fileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
    .replace(/\s+/g, ' ') // Collapse whitespace
    .split(' ')
    .map(word => {
      // Preserve acronyms (all caps, 2-5 letters)
      if (word.length >= 2 && word.length <= 5 && word === word.toUpperCase()) {
        return word;
      }
      // Title case
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ')
    .trim();
}

// Utility: Normalize tags
function normalizeTags(tags: string[]): string[] {
  const normalized = tags
    .map(tag => tag.toLowerCase().trim().replace(/\s+/g, '-'))
    .filter(tag => tag.length > 0);
  
  // Deduplicate
  const unique = [...new Set(normalized)];
  
  // Cap at 6 tags
  return unique.slice(0, 6);
}

// Extract text from PDF
async function extractPdfText(fileUrl: string): Promise<{ text: string; pageCount: number; metadata: any }> {
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
          .map((item: any) => item.str)
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

// Extract text from DOCX
async function extractDocxText(fileUrl: string): Promise<{ text: string; metadata: any }> {
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
    let metadata: any = {};
    const coreXml = await zip.file('docProps/core.xml')?.async('string');
    if (coreXml) {
      const titleMatch = coreXml.match(/<dc:title>([^<]+)<\/dc:title>/);
      const creatorMatch = coreXml.match(/<dc:creator>([^<]+)<\/dc:creator>/);
      const subjectMatch = coreXml.match(/<dc:subject>([^<]+)<\/dc:subject>/);
      
      metadata = {
        Title: titleMatch?.[1] || '',
        Creator: creatorMatch?.[1] || '',
        Subject: subjectMatch?.[1] || '',
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

    let title = cleanTitle(fileName || 'Untitled File');
    let description = '';
    let tags: string[] = ['file'];
    let extractedText = '';
    let category = 'other';
    let summary = '';
    let keyPoints: string[] = [];

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
                    text: `Analyze this image comprehensively:

1. **OCR Extraction**: Extract ALL visible text from the image with high accuracy. Include:
   - Main text content, headers, titles
   - Labels, captions, table text
   - Small print or footnotes
   - Any logos with text

2. **Title Suggestion**: If text/logos are present, suggest a descriptive title based on that content. Otherwise, describe the main subject.

3. **Visual Analysis**: Describe the image:
   - Type: document, screenshot, photo, diagram, chart, receipt, form, etc.
   - Main subject or purpose
   - Notable visual elements (logos, signatures, graphs, etc.)
   - Structure and layout

4. **Categorization**: Determine category and suggest 4-6 specific tags optimized for filtering and search.

5. **Key Information**: Extract and summarize the most important information or key points.

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
        
        if (toolCall?.function?.arguments) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            title = parsed.title || title;
            description = parsed.description || 'Image file';
            extractedText = parsed.extractedText || '';
            tags = normalizeTags(parsed.tags || ['image']);
            category = parsed.category || 'other';
            summary = parsed.summary || '';
            keyPoints = parsed.keyPoints || [];
            console.log('✅ Image analysis:', { title, tags, category, extractedTextLength: extractedText.length });
          } catch (e) {
            console.error('⚠️ Tool call parse error:', e);
            tags = ['image'];
          }
        } else {
          console.log('⚠️ No tool call in response, using fallback');
          tags = ['image'];
        }
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
        
        const prompt = `Analyze this PDF document with ${pageCount} pages.

**Filename**: ${fileName}

**Extracted Text Sample**:
${textSample}

**Metadata**: ${JSON.stringify(metadata)}

Provide a comprehensive analysis:

1. **Title**: Create a clean, professional title. If the embedded metadata title is good, use it. Otherwise, infer from content.

2. **Description**: Detailed description of the document's content and purpose. Look for:
   - Academic identifiers (DOI, PMID, journal names, citations)
   - Medical/scientific terminology
   - Business patterns (invoices, reports, proposals, contracts)
   - Technical documentation (API docs, manuals, specifications)
   - Date patterns, version numbers

3. **Category**: Classify as: academic, business, personal, technical, medical, financial, legal, creative, or other

4. **Tags**: 4-6 highly specific tags based on content and type

5. **Summary**: 2-3 sentence summary of the actual content

6. **Key Points**: 3-5 main topics or findings from the document

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
          
          if (toolCall?.function?.arguments) {
            try {
              const parsed = JSON.parse(toolCall.function.arguments);
              title = parsed.title || title;
              description = parsed.description || `PDF document with ${pageCount} pages`;
              tags = normalizeTags(parsed.tags || ['pdf', 'document']);
              category = parsed.category || 'other';
              summary = parsed.summary || '';
              keyPoints = parsed.keyPoints || [];
              
              console.log('✅ PDF analysis:', { title, tags, category, pageCount, textLength: extractedText.length });
            } catch (e) {
              console.error('⚠️ Tool call parse error:', e);
              tags = ['pdf', 'document'];
            }
          }
        } else {
          console.error('❌ AI analysis failed:', await aiResponse.text());
          tags = ['pdf', 'document'];
          description = `PDF document with ${pageCount} pages`;
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
        
        const prompt = `Analyze this Word document.

**Filename**: ${fileName}

**Extracted Text Sample**:
${textSample}

**Metadata**: ${JSON.stringify(metadata)}

Provide comprehensive analysis:

1. **Title**: Clean, professional title (prefer embedded metadata if good)
2. **Description**: Detailed description based on actual content
3. **Category**: academic, business, personal, technical, medical, financial, legal, creative, or other
4. **Tags**: 4-6 specific tags based on content
5. **Summary**: 2-3 sentence summary of actual content
6. **Key Points**: 3-5 main topics from the document

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
          
          if (toolCall?.function?.arguments) {
            const parsed = JSON.parse(toolCall.function.arguments);
            title = parsed.title || title;
            description = parsed.description || 'Word document';
            tags = normalizeTags(parsed.tags || ['word', 'document']);
            category = parsed.category || 'other';
            summary = parsed.summary || '';
            keyPoints = parsed.keyPoints || [];
            
            console.log('✅ DOCX analysis:', { title, tags, category, textLength: extractedText.length });
          }
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
          const prompt = `Analyze this ${fileType} file.

**Filename**: ${fileName}

**Content Sample**:
${textSample}

Provide structured metadata with title, description, 4-6 tags, category, 2-3 sentence summary, and 3-5 key points.

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
            if (toolCall?.function?.arguments) {
              const parsed = JSON.parse(toolCall.function.arguments);
              title = parsed.title || title;
              description = parsed.description || 'Text file';
              tags = normalizeTags(parsed.tags || ['text']);
              category = parsed.category || 'other';
              summary = parsed.summary || '';
              keyPoints = parsed.keyPoints || [];
              console.log('✅ Text file analysis:', { title, tags, category });
            }
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

    console.log('✅ Analysis complete:', { 
      title, 
      category,
      tags, 
      extractedTextLength: extractedText.length,
      hasSummary: !!summary,
      keyPointsCount: keyPoints.length 
    });

    return new Response(
      JSON.stringify({
        title,
        description,
        tags,
        extractedText: extractedText.substring(0, 5000), // Return first 5k for storage
        category,
        summary,
        keyPoints,
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
