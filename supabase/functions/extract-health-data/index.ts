import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

interface LabValue {
  name: string;
  value: number | string;
  unit: string;
  reference_range?: string;
  status?: 'normal' | 'high' | 'low' | 'critical';
}

interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  instructions?: string;
}

interface Diagnosis {
  name: string;
  icd_code?: string;
  date?: string;
}

interface ExtractedHealthData {
  lab_values: LabValue[];
  medications: Medication[];
  diagnoses: Diagnosis[];
  vitals: Record<string, string | number>;
  recommendations: string[];
  follow_up_date?: string;
  provider_notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, document_type, file_type } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are a medical document analysis assistant. Your task is to extract structured health data from medical documents.

IMPORTANT: You must use the extract_health_data function to return structured data. Do not respond with plain text.

Document type: ${document_type || 'unknown'}
File type: ${file_type || 'unknown'}

Extract the following information when available:
1. Lab values with their reference ranges and status (normal/high/low/critical)
2. Medications with dosage and frequency
3. Diagnoses with ICD codes if mentioned
4. Vital signs (blood pressure, heart rate, temperature, weight, height, BMI)
5. Provider recommendations
6. Follow-up dates
7. Any important provider notes

Be precise with numbers and units. If a value is outside the reference range, mark it appropriately.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Please analyze this medical document and extract structured health data:\n\n${content}` }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_health_data',
              description: 'Extract structured health data from a medical document',
              parameters: {
                type: 'object',
                properties: {
                  lab_values: {
                    type: 'array',
                    description: 'Laboratory test results',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Name of the lab test (e.g., Glucose, Hemoglobin A1C)' },
                        value: { type: ['number', 'string'], description: 'The measured value' },
                        unit: { type: 'string', description: 'Unit of measurement (e.g., mg/dL, %)' },
                        reference_range: { type: 'string', description: 'Normal reference range (e.g., "70-100")' },
                        status: { type: 'string', enum: ['normal', 'high', 'low', 'critical'], description: 'Whether the value is within normal range' }
                      },
                      required: ['name', 'value', 'unit']
                    }
                  },
                  medications: {
                    type: 'array',
                    description: 'Medications mentioned in the document',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Name of the medication' },
                        dosage: { type: 'string', description: 'Dosage amount (e.g., "500mg")' },
                        frequency: { type: 'string', description: 'How often to take (e.g., "twice daily")' },
                        instructions: { type: 'string', description: 'Special instructions' }
                      },
                      required: ['name']
                    }
                  },
                  diagnoses: {
                    type: 'array',
                    description: 'Medical diagnoses or conditions',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Name of the diagnosis or condition' },
                        icd_code: { type: 'string', description: 'ICD-10 code if available' },
                        date: { type: 'string', description: 'Date of diagnosis if mentioned' }
                      },
                      required: ['name']
                    }
                  },
                  vitals: {
                    type: 'object',
                    description: 'Vital signs measurements',
                    properties: {
                      blood_pressure: { type: 'string', description: 'Blood pressure reading (e.g., "120/80 mmHg")' },
                      heart_rate: { type: 'string', description: 'Heart rate (e.g., "72 bpm")' },
                      temperature: { type: 'string', description: 'Body temperature' },
                      weight: { type: 'string', description: 'Weight measurement' },
                      height: { type: 'string', description: 'Height measurement' },
                      bmi: { type: 'string', description: 'Body Mass Index' },
                      respiratory_rate: { type: 'string', description: 'Respiratory rate' },
                      oxygen_saturation: { type: 'string', description: 'SpO2 percentage' }
                    }
                  },
                  recommendations: {
                    type: 'array',
                    description: 'Doctor recommendations or action items',
                    items: { type: 'string' }
                  },
                  follow_up_date: {
                    type: 'string',
                    description: 'Scheduled follow-up date if mentioned'
                  },
                  provider_notes: {
                    type: 'string',
                    description: 'Summary of important provider notes or observations'
                  }
                },
                required: ['lab_values', 'medications', 'diagnoses', 'vitals', 'recommendations']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_health_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response summary:', summarizeAiResponse(data, response.status));
    if (isDebugLoggingEnabled()) {
      console.log('AI response payload:', JSON.stringify(data, null, 2));
    }

    let extractedData: ExtractedHealthData = {
      lab_values: [],
      medications: [],
      diagnoses: [],
      vitals: {},
      recommendations: []
    };

    // Try to extract from tool calls first
    const toolCalls = data.choices?.[0]?.message?.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      const functionCall = toolCalls[0];
      if (functionCall.function?.arguments) {
        try {
          const parsed = typeof functionCall.function.arguments === 'string' 
            ? JSON.parse(functionCall.function.arguments) 
            : functionCall.function.arguments;
          extractedData = { ...extractedData, ...parsed };
        } catch (e) {
          console.error('Failed to parse tool call arguments:', e);
        }
      }
    } else {
      // Fallback: try to extract JSON from content
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            extractedData = { ...extractedData, ...parsed };
          } catch (e) {
            console.error('Failed to parse JSON from content:', e);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ extracted_data: extractedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-health-data:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
