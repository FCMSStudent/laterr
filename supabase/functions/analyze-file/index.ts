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

    // Handle different file types
    if (fileType.startsWith('image/')) {
      // Use Lovable AI for image analysis with OCR
      console.log('Processing image with OCR');
      
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
                  text: "Analyze this image. Extract all visible text (OCR), describe the content, and suggest relevant tags. Return a JSON object with: title (short descriptive title), description (detailed description), extractedText (all text found in the image), tags (array of 2-3 relevant tags like 'document', 'receipt', 'screenshot', etc.)."
                },
                {
                  type: "image_url",
                  image_url: { url: fileUrl }
                }
              ]
            }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable AI error:', response.status, errorText);
        throw new Error(`AI analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      
      // Try to parse JSON from the response
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          title = parsed.title || title;
          description = parsed.description || '';
          extractedText = parsed.extractedText || '';
          tags = parsed.tags || ['image'];
        }
      } catch (e) {
        console.log('Could not parse JSON, using raw content');
        description = content;
      }

    } else if (fileType === 'application/pdf' || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || fileType === 'application/msword') {
      // For PDFs and Word docs, use AI to analyze the filename and suggest metadata
      console.log('Processing document file');
      
      try {
        // Use Lovable AI to analyze the document type and suggest categorization based on filename
        const prompt = `A user has uploaded a ${fileType === 'application/pdf' ? 'PDF' : 'Word document'} file named "${fileName}". 

Analyze the filename carefully and provide:
1. A clean, descriptive title (remove file extensions, clean up underscores/hyphens, improve readability, capitalize properly)
2. A detailed, informative description of what this document likely contains based on the filename (be specific - look for keywords, academic paper identifiers, medical terms, business terminology, etc.)
3. 3-5 highly relevant tags that would help categorize this document (examples: 'research', 'academic', 'business', 'report', 'article', 'medical', 'technical', 'personal', 'work', 'study', 'science', etc.)

Return ONLY a valid JSON object with this exact structure:
{
  "title": "improved title here",
  "description": "detailed description here",
  "tags": ["tag1", "tag2", "tag3"]
}`;

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
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          const content = data.choices?.[0]?.message?.content || '';
          console.log('AI response:', content);
          
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              title = parsed.title || fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
              description = parsed.description || `${fileType === 'application/pdf' ? 'PDF' : 'Word'} document`;
              tags = parsed.tags || ['document'];
              
              console.log('Parsed metadata:', { title, description, tags });
            } else {
              console.log('No JSON match found in AI response');
              title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
              description = `${fileType === 'application/pdf' ? 'PDF' : 'Word'} document`;
              tags = ['document'];
            }
          } catch (e) {
            console.error('Error parsing AI response:', e);
            // Fallback: clean up the filename
            title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
            description = `${fileType === 'application/pdf' ? 'PDF' : 'Word'} document`;
            tags = ['document'];
          }
        } else {
          const errorText = await aiResponse.text();
          console.error('AI request failed:', aiResponse.status, errorText);
          title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
          description = `${fileType === 'application/pdf' ? 'PDF' : 'Word'} document`;
          tags = ['document'];
        }
      } catch (error) {
        console.error('Error processing document:', error);
        title = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        description = `${fileType === 'application/pdf' ? 'PDF' : 'Word'} document`;
        tags = ['document'];
      }
    } else {
      // Generic file handling
      description = 'File uploaded';
      tags = ['file'];
    }

    console.log('Analysis complete:', { title, description, tags, extractedText: extractedText ? 'text extracted' : 'no text' });

    return new Response(
      JSON.stringify({
        title,
        description,
        tags,
        extractedText,
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
