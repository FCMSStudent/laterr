import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication - extract user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Create client with user's auth token to validate the JWT
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate the JWT and get user claims
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract authenticated user_id from JWT claims (not from client input!)
    const user_id = claimsData.claims.sub as string;
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID not found in token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Fetch user's health context using service role (for full access to user's data)
    let healthContext = '';
    if (SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Fetch recent health documents
      const { data: documents } = await supabase
        .from('health_documents')
        .select('title, document_type, summary, extracted_data, tags, visit_date')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch recent measurements
      const { data: measurements } = await supabase
        .from('health_measurements')
        .select('measurement_type, value, unit, measured_at, notes')
        .eq('user_id', user_id)
        .order('measured_at', { ascending: false })
        .limit(20);

      // Fetch active medications
      const { data: medications } = await supabase
        .from('medication_schedule')
        .select('medication_name, dosage, frequency, notes')
        .eq('user_id', user_id)
        .is('end_date', null)
        .limit(10);

      // Build context string
      if (documents && documents.length > 0) {
        healthContext += '\n\n## Recent Health Documents:\n';
        documents.forEach((doc, i) => {
          healthContext += `\n${i + 1}. **${doc.title}** (${doc.document_type})`;
          if (doc.visit_date) healthContext += ` - ${doc.visit_date}`;
          if (doc.summary) healthContext += `\n   Summary: ${doc.summary}`;
          if (doc.extracted_data) {
            const extracted = doc.extracted_data as any;
            if (extracted.lab_values?.length > 0) {
              healthContext += `\n   Lab Values: ${extracted.lab_values.map((lv: any) => `${lv.name}: ${lv.value} ${lv.unit}`).join(', ')}`;
            }
            if (extracted.diagnoses?.length > 0) {
              healthContext += `\n   Diagnoses: ${extracted.diagnoses.map((d: any) => d.name).join(', ')}`;
            }
          }
        });
      }

      if (measurements && measurements.length > 0) {
        healthContext += '\n\n## Recent Health Measurements:\n';
        const grouped: Record<string, typeof measurements> = {};
        measurements.forEach(m => {
          if (!grouped[m.measurement_type]) grouped[m.measurement_type] = [];
          grouped[m.measurement_type].push(m);
        });
        Object.entries(grouped).forEach(([type, items]) => {
          const latest = items[0];
          const value = typeof latest.value === 'object' ? JSON.stringify(latest.value) : latest.value;
          healthContext += `\n- **${type}**: ${value} ${latest.unit || ''} (${new Date(latest.measured_at).toLocaleDateString()})`;
          if (items.length > 1) {
            healthContext += ` [${items.length} readings available]`;
          }
        });
      }

      if (medications && medications.length > 0) {
        healthContext += '\n\n## Current Medications:\n';
        medications.forEach(med => {
          healthContext += `\n- **${med.medication_name}**: ${med.dosage}, ${med.frequency}`;
          if (med.notes) healthContext += ` (${med.notes})`;
        });
      }
    }

    const systemPrompt = `You are a helpful health assistant that helps users understand their health data. You have access to the user's health documents, measurements, and medication information.

IMPORTANT DISCLAIMERS:
- You are NOT a medical professional and cannot provide medical advice.
- Always encourage users to consult their healthcare provider for medical decisions.
- Focus on helping users understand their data, not diagnosing or prescribing.

Your capabilities:
- Explain lab values and what they mean
- Summarize health trends from measurements
- Help users prepare questions for their doctor
- Provide general health education
- Find and compare information across documents

${healthContext ? `\n## User's Health Context:${healthContext}` : '\nNo health data available for this user yet.'}

Be conversational, empathetic, and helpful. If asked about something not in the user's data, say so clearly.`;

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
          ...messages
        ],
        stream: true,
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

    // Stream the response back
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in health-chat:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
