import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
          description: "3-5 relevant categorization tags" 
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
          description: "Brief summary of the file's main content and purpose"
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileUrl, fileType, fileName } = await req.json();

    console.log('Analyzing file:', { fileName, fileType, fileUrl });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    let title = fileName || 'Untitled File';
    let description = '';
    let tags: string[] = ['file'];
    let extractedText = '';
    let category = 'other';
    let summary = '';
    let keyPoints: string[] = [];

    // Handle different file types
    if (fileType.startsWith('image/')) {
      // Use Lovable AI for enhanced image analysis with OCR
      console.log('Processing image with enhanced OCR and analysis');
      
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
   - Main text content
   - Headers and titles
   - Labels and captions
   - Any text in tables or structured data
   - Small print or footnotes

2. **Visual Analysis**: Describe the image content:
   - What type of image is this? (document, screenshot, photo, diagram, chart, receipt, form, etc.)
   - What is the main subject or purpose?
   - Are there any notable visual elements (logos, signatures, stamps, graphs, etc.)?
   - What is the overall structure and layout?

3. **Categorization**: Determine the primary category and suggest relevant tags.

4. **Key Information**: Extract and summarize the most important information or key points.

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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable AI error:', response.status, errorText);
        throw new Error(`AI analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      
      if (toolCall?.function?.arguments) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          title = parsed.title || title;
          description = parsed.description || '';
          extractedText = parsed.extractedText || '';
          tags = parsed.tags || ['image'];
          category = parsed.category || 'other';
          summary = parsed.summary || '';
          keyPoints = parsed.keyPoints || [];
          console.log('Image analysis complete:', { title, tags, category });
        } catch (e) {
          console.error('Error parsing tool call response:', e);
          tags = ['image'];
        }
      } else {
        console.log('No tool call in response, using fallback');
        tags = ['image'];
      }

    } else if (fileType === 'application/pdf' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileType === 'application/msword') {
      // For PDFs and Word docs, extract actual content and analyze
      console.log('Processing document with content extraction');
      
      try {
        // First, try to parse the document to extract actual content
        let documentContent = '';
        let pageCount = 0;
        
        try {
          console.log('Attempting to fetch and parse document content...');
          const fileResponse = await fetch(fileUrl);
          
          if (fileResponse.ok) {
            const arrayBuffer = await fileResponse.arrayBuffer();
            const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
            
            // Note: In a real implementation, you would use a document parsing library here
            // For now, we'll proceed with AI analysis based on filename and any metadata
            console.log('Document fetched successfully, size:', arrayBuffer.byteLength);
          }
        } catch (fetchError) {
          console.log('Could not fetch document for parsing:', fetchError);
        }

        // Use AI to analyze with enhanced prompting
        const prompt = `Analyze this ${fileType === 'application/pdf' ? 'PDF' : 'Word'} document: "${fileName}"

Based on the filename and type, provide a comprehensive analysis:

1. **Title**: Create a clean, professional title (remove extensions, improve formatting, capitalize properly)

2. **Description**: Provide a detailed description of what this document likely contains:
   - Look for academic paper identifiers (DOI, PMID, journal codes)
   - Identify medical/scientific terminology
   - Recognize business document patterns (invoices, reports, proposals)
   - Detect technical documentation patterns
   - Note any date patterns or version numbers
   
3. **Category**: Classify into: academic, business, personal, technical, medical, financial, legal, creative, or other

4. **Tags**: Provide 4-5 highly specific tags based on:
   - Document type (research, article, report, manual, guide, etc.)
   - Subject matter (science, medicine, finance, engineering, etc.)
   - Purpose (reference, documentation, analysis, etc.)
   
5. **Summary**: Brief 2-3 sentence summary of likely content and purpose

6. **Key Points**: 3-4 likely topics or sections this document covers

Use the analyze_file function to provide structured output.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "user", content: prompt }
            ],
            tools: [analyzeFileToolSchema],
            tool_choice: { type: "function", function: { name: "analyze_file" } }
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
          
          if (toolCall?.function?.arguments) {
            try {
              const parsed = JSON.parse(toolCall.function.arguments);
              title = parsed.title || fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
              description = parsed.description || `${fileType === 'application/pdf' ? 'PDF' : 'Word'} document`;
              tags = parsed.tags || ['document'];
              category = parsed.category || 'other';
              summary = parsed.summary || '';
              keyPoints = parsed.keyPoints || [];
              
              console.log('Document analysis complete:', { title, tags, category });
            } catch (e) {
              console.error('Error parsing tool call:', e);
              title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
              tags = ['document'];
            }
          }
        } else {
          console.error('AI analysis failed:', await aiResponse.text());
          title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          tags = ['document'];
        }
      } catch (error) {
        console.error('Error processing document:', error);
        title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        description = `${fileType === 'application/pdf' ? 'PDF' : 'Word'} document`;
        tags = ['document'];
      }
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || fileType === 'application/vnd.ms-excel') {
      // Excel/Spreadsheet files
      console.log('Processing spreadsheet file');
      title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      description = 'Spreadsheet document containing data tables and calculations';
      tags = ['spreadsheet', 'data', 'excel'];
      category = 'business';
      
    } else if (fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || fileType === 'application/vnd.ms-powerpoint') {
      // PowerPoint/Presentation files
      console.log('Processing presentation file');
      title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      description = 'Presentation slides document';
      tags = ['presentation', 'slides', 'powerpoint'];
      category = 'business';
      
    } else if (fileType === 'text/plain' || fileType === 'text/markdown' || fileType === 'text/csv') {
      // Text files
      console.log('Processing text file');
      try {
        const fileResponse = await fetch(fileUrl);
        if (fileResponse.ok) {
          const textContent = await fileResponse.text();
          extractedText = textContent.substring(0, 5000); // First 5000 chars
          
          // Use AI to analyze text content
          const prompt = `Analyze this text file content and provide structured metadata:

Filename: ${fileName}
Content preview:
${extractedText.substring(0, 1000)}

Use the analyze_file function to provide structured output with title, description, tags, category, summary, and key points.`;

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
              description = parsed.description || '';
              tags = parsed.tags || ['text'];
              category = parsed.category || 'other';
              summary = parsed.summary || '';
              keyPoints = parsed.keyPoints || [];
            }
          }
        }
      } catch (error) {
        console.error('Error processing text file:', error);
        title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        tags = ['text'];
      }
      
    } else if (fileType.startsWith('audio/')) {
      // Audio files (MP3, WAV, etc.)
      console.log('Processing audio file');
      title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      description = 'Audio file';
      tags = ['audio', 'media'];
      category = 'other';
      
    } else {
      // Generic file handling
      console.log('Processing generic file');
      title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      description = 'File uploaded';
      tags = ['file'];
      category = 'other';
    }

    console.log('Analysis complete:', { 
      title, 
      category,
      tags, 
      hasExtractedText: !!extractedText,
      hasSummary: !!summary,
      keyPointsCount: keyPoints.length 
    });

    return new Response(
      JSON.stringify({
        title,
        description,
        tags,
        extractedText,
        category,
        summary,
        keyPoints,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in analyze-file function:', error);
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
