import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjsLib from "https://esm.sh/pdfjs-dist@4.6.82/legacy/build/pdf.mjs";
import JSZip from "https://esm.sh/jszip@3.10.1";

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

// Define structured output schema for medical document analysis
const analyzeHealthDocumentToolSchema = {
  type: "function",
  function: {
    name: "analyze_health_document",
    description: "Extract structured medical information from a health document",
    parameters: {
      type: "object",
      properties: {
        document_type: { 
          type: "string", 
          description: "Type of health document",
          enum: ["lab_result", "prescription", "imaging", "visit_summary", "insurance", "vaccination", "other"]
        },
        test_results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              test_name: { type: "string" },
              value: { type: "string" },
              unit: { type: "string" },
              reference_range: { type: "string" },
              status: { type: "string", enum: ["normal", "abnormal", "high", "low", "critical"] }
            }
          },
          description: "List of test results with values and ranges"
        },
        medications: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              dosage: { type: "string" },
              frequency: { type: "string" },
              duration: { type: "string" }
            }
          },
          description: "List of medications mentioned"
        },
        diagnoses: {
          type: "array",
          items: { type: "string" },
          description: "List of diagnoses or conditions mentioned"
        },
        provider_name: { 
          type: "string", 
          description: "Healthcare provider or facility name" 
        },
        visit_date: { 
          type: "string", 
          description: "Date of visit or test in YYYY-MM-DD format" 
        },
        summary: {
          type: "string",
          description: "Plain English summary that a non-medical person could understand"
        },
        recommendations: {
          type: "array",
          items: { type: "string" },
          description: "Any recommendations or follow-up actions mentioned"
        }
      },
      required: ["document_type", "summary"]
    }
  }
};

// Extract text from PDF
async function extractPdfText(fileUrl: string): Promise<{ text: string; pageCount: number }> {
  try {
    console.log('📄 Fetching PDF bytes...');
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    const pageCount = pdf.numPages;
    console.log(`📄 PDF has ${pageCount} pages`);
    
    const textParts: string[] = [];
    const pagesToExtract = Math.min(pageCount, 10);
    
    for (let i = 1; i <= pagesToExtract; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => (item.str || ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (pageText) {
        textParts.push(pageText);
      }
    }
    
    const fullText = textParts.join('\n\n').substring(0, 50000);
    console.log(`✅ Extracted ${fullText.length} chars from ${pageCount} pages`);
    
    return { text: fullText, pageCount };
  } catch (error) {
    console.error('❌ PDF extraction failed:', error);
    return { text: '', pageCount: 0 };
  }
}

// Extract text from DOCX
async function extractDocxText(fileUrl: string): Promise<string> {
  try {
    console.log('📝 Fetching DOCX bytes...');
    const response = await fetch(fileUrl);
    if (!response.ok) throw new Error(`Failed to fetch DOCX: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    let documentText = '';
    const docXml = await zip.file('word/document.xml')?.async('string');
    if (docXml) {
      const textMatches = docXml.matchAll(/<w:t[^>]*>([^<]+)<\/w:t>/g);
      const textParts = Array.from(textMatches).map(match => match[1]);
      documentText = textParts.join(' ').replace(/\s+/g, ' ').trim();
    }
    
    console.log(`✅ Extracted ${documentText.length} chars from DOCX`);
    return documentText.substring(0, 50000);
  } catch (error) {
    console.error('❌ DOCX extraction failed:', error);
    return '';
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileType, fileName } = await req.json();

    console.log('🏥 Analyzing health document:', { fileName, fileType });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!LOVABLE_API_KEY || !OPENAI_API_KEY) {
      throw new Error("API keys not configured");
    }

    let extractedText = '';

    // Extract text based on file type
    if (fileType === 'application/pdf') {
      const { text } = await extractPdfText(fileUrl);
      extractedText = text;
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      extractedText = await extractDocxText(fileUrl);
    } else if (fileType.startsWith('image/')) {
      // For images, we'll use AI vision directly
      console.log('🖼️ Image file detected, will use vision analysis');
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    // Prepare AI analysis request
    let prompt = `Analyze this health/medical document and extract structured information.

**Document Name**: ${fileName}
`;

    let contentParts: any[] = [];

    if (fileType.startsWith('image/')) {
      // Use vision for images
      contentParts = [
        {
          type: "text",
          text: prompt + `\nThis is a medical document image. Extract all visible medical information including:
- Test results with values, units, and reference ranges
- Medications with dosages
- Diagnoses or conditions
- Provider information
- Dates
- Any recommendations or notes

Provide a clear summary in plain English that a patient could understand.

Use the analyze_health_document function to provide structured output.`
        },
        {
          type: "image_url",
          image_url: { url: fileUrl }
        }
      ];
    } else {
      // Use extracted text for PDFs and DOCX
      prompt += `\n**Extracted Text**:\n${extractedText.substring(0, 4000)}\n\n`;
      prompt += `Based on this medical document, extract:
1. Document type (lab result, prescription, imaging report, visit summary, etc.)
2. All test results with values, units, reference ranges, and whether they're normal/abnormal
3. Any medications mentioned with dosages, frequency, and duration
4. Diagnoses or medical conditions mentioned
5. Healthcare provider or facility name
6. Visit or test date
7. A plain English summary explaining what this document says
8. Any recommendations or follow-up actions

Use the analyze_health_document function to provide structured output.`;
      
      contentParts = [{ type: "text", text: prompt }];
    }

    console.log('📤 Sending to AI for medical analysis...');
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: contentParts
        }],
        tools: [analyzeHealthDocumentToolSchema],
        tool_choice: { type: "function", function: { name: "analyze_health_document" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI analysis failed:', aiResponse.status, errorText);
      throw new Error(`AI analysis failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('No structured data returned from AI');
    }

    const extractedData = JSON.parse(toolCall.function.arguments);
    console.log('✅ Medical data extracted:', extractedData);

    // Generate embedding for semantic search
    const embeddingText = `${extractedData.summary || ''} ${extractedData.diagnoses?.join(' ') || ''} ${extractedData.test_results?.map((t: any) => t.test_name).join(' ') || ''}`;
    
    console.log('🔮 Generating embedding for semantic search...');
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: embeddingText,
        encoding_format: "float"
      }),
    });

    if (!embeddingResponse.ok) {
      console.error('❌ Embedding generation failed');
      throw new Error('Failed to generate embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data?.[0]?.embedding;

    console.log('✅ Health document analysis complete');

    return new Response(
      JSON.stringify({
        documentType: extractedData.document_type || 'other',
        extractedData: {
          test_results: extractedData.test_results || [],
          medications: extractedData.medications || [],
          diagnoses: extractedData.diagnoses || [],
          recommendations: extractedData.recommendations || []
        },
        providerName: extractedData.provider_name || '',
        visitDate: extractedData.visit_date || null,
        summary: extractedData.summary || '',
        embedding: embedding,
        extractedText: extractedText.substring(0, 5000)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error analyzing health document:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unexpected error occurred' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
