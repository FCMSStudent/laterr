import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define structured output schema for health insights
const generateInsightsToolSchema = {
  type: "function",
  function: {
    name: "generate_health_insights",
    description: "Generate personalized health insights from user data",
    parameters: {
      type: "object",
      properties: {
        insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["trend", "anomaly", "recommendation", "summary"],
                description: "Type of insight"
              },
              title: {
                type: "string",
                description: "Catchy, actionable title for the insight"
              },
              content: {
                type: "string",
                description: "Detailed explanation of the insight and why it matters"
              },
              confidence: {
                type: "number",
                description: "Confidence score between 0 and 1"
              },
              related_measurement_types: {
                type: "array",
                items: { type: "string" },
                description: "Types of measurements this insight is based on"
              }
            },
            required: ["type", "title", "content", "confidence"]
          },
          description: "List of 3-5 personalized health insights",
          minItems: 3,
          maxItems: 5
        }
      },
      required: ["insights"]
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, forceRegenerate } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log('🔍 Generating health insights for user:', userId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Required environment variables not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if recent insights exist (within last 7 days) unless forcing regeneration
    if (!forceRegenerate) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: existingInsights, error: checkError } = await supabase
        .from('health_insights')
        .select('id, generated_at')
        .eq('user_id', userId)
        .gte('generated_at', sevenDaysAgo.toISOString())
        .limit(1);

      if (checkError) {
        console.error('Error checking existing insights:', checkError);
      } else if (existingInsights && existingInsights.length > 0) {
        console.log('✅ Recent insights found, skipping regeneration');
        return new Response(
          JSON.stringify({ 
            message: 'Insights were generated recently. Use forceRegenerate to create new ones.',
            lastGenerated: existingInsights[0].generated_at
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Fetch measurements from last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: measurements, error: measurementsError } = await supabase
      .from('health_measurements')
      .select('*')
      .eq('user_id', userId)
      .gte('measured_at', ninetyDaysAgo.toISOString())
      .order('measured_at', { ascending: false });

    if (measurementsError) {
      console.error('Error fetching measurements:', measurementsError);
      throw measurementsError;
    }

    console.log(`📊 Found ${measurements?.length || 0} measurements in last 90 days`);

    // Fetch active goals
    const { data: goals, error: goalsError } = await supabase
      .from('health_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (goalsError) {
      console.error('Error fetching goals:', goalsError);
    }

    console.log(`🎯 Found ${goals?.length || 0} active goals`);

    // Fetch recent health documents
    const { data: documents, error: docsError } = await supabase
      .from('health_documents')
      .select('document_type, summary, visit_date, extracted_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
    }

    console.log(`📄 Found ${documents?.length || 0} recent documents`);

    interface MeasurementRecord {
      measurement_type: string;
      value: number | { value: number } | Record<string, unknown>;
      measured_at: string;
      unit?: string;
    }

    // Aggregate measurement data by type
    const measurementsByType: Record<string, MeasurementRecord[]> = {};
    measurements?.forEach((m: MeasurementRecord) => {
      if (!measurementsByType[m.measurement_type]) {
        measurementsByType[m.measurement_type] = [];
      }
      measurementsByType[m.measurement_type].push({
        value: m.value,
        measured_at: m.measured_at,
        unit: m.unit
      });
    });

    interface TrendData {
      trend: string;
      recentAvg: number;
      count: number;
    }

    // Calculate basic trends for each measurement type
    const trends: Record<string, TrendData> = {};
    Object.entries(measurementsByType).forEach(([type, values]) => {
      if (values.length >= 2) {
        const numericValues = values
          .map((v) => typeof v.value === 'object' && v.value && 'value' in v.value ? (v.value as { value: number }).value : v.value)
          .filter((v): v is number => typeof v === 'number' && !isNaN(v));

        if (numericValues.length >= 2) {
          const recent = numericValues.slice(0, Math.ceil(numericValues.length / 2));
          const older = numericValues.slice(Math.ceil(numericValues.length / 2));
          
          const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
          const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
          
          trends[type] = {
            count: numericValues.length,
            average: recentAvg,
            trend: recentAvg > olderAvg * 1.05 ? 'increasing' : 
                   recentAvg < olderAvg * 0.95 ? 'decreasing' : 'stable',
            recentAvg,
            olderAvg
          };
        }
      }
    });

    interface GoalRecord {
      goal_type: string;
      target_value: unknown;
      current_value: unknown;
      target_date?: string;
    }

    interface DocumentRecord {
      document_type: string;
      summary?: string;
      visit_date?: string;
    }

    // Prepare data summary for AI
    const dataSummary = {
      measurementTypes: Object.keys(measurementsByType),
      trends,
      totalMeasurements: measurements?.length || 0,
      activeGoals: goals?.map((g: GoalRecord) => ({
        type: g.goal_type,
        target: g.target_value,
        current: g.current_value,
        targetDate: g.target_date
      })) || [],
      recentDocuments: documents?.map((d: DocumentRecord) => ({
        type: d.document_type,
        summary: d.summary?.substring(0, 200),
        date: d.visit_date
      })) || []
    };

    console.log('📤 Sending data to AI for insight generation...');

    const prompt = `You are a health insights AI assistant. Analyze the following health data and generate 3-5 personalized, actionable insights.

**User Health Data Summary:**
- Measurement types tracked: ${dataSummary.measurementTypes.join(', ')}
- Total measurements in last 90 days: ${dataSummary.totalMeasurements}
- Active goals: ${dataSummary.activeGoals.length}

**Trends Detected:**
${Object.entries(trends).map(([type, data]) => 
  `- ${type}: ${data.trend} (avg: ${data.recentAvg.toFixed(1)}, count: ${data.count})`
).join('\n')}

**Active Goals:**
${dataSummary.activeGoals.map((g) => 
  `- ${g.type}: Target ${JSON.stringify(g.target)}, Current ${JSON.stringify(g.current)}`
).join('\n') || 'No active goals'}

**Recent Medical Documents:**
${dataSummary.recentDocuments.map((d) => 
  `- ${d.type} from ${d.date || 'unknown date'}: ${d.summary || 'No summary'}`
).join('\n') || 'No recent documents'}

Generate 3-5 insights that are:
1. Specific to this user's data
2. Actionable with clear next steps
3. Positive and motivating when appropriate
4. Evidence-based from the data provided
5. Varied in type (trends, anomalies, recommendations, summaries)

Use the generate_health_insights function to provide structured output.`;

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
          content: prompt
        }],
        tools: [generateInsightsToolSchema],
        tool_choice: { type: "function", function: { name: "generate_health_insights" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('❌ AI insights generation failed:', aiResponse.status, errorText);
      throw new Error(`AI insights generation failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall?.function?.arguments) {
      throw new Error('No structured insights returned from AI');
    }

    const { insights } = JSON.parse(toolCall.function.arguments);
    console.log(`✅ Generated ${insights.length} insights`);

    interface InsightMeasurement {
      measurement_type: string;
      id: string;
    }

    // Get measurement IDs for related types
    const getMeasurementIds = (measurementTypes: string[]) => {
      const ids: string[] = [];
      measurementTypes?.forEach((type: string) => {
        const typeMeasurements = measurements?.filter((m: InsightMeasurement) => m.measurement_type === type);
        if (typeMeasurements && typeMeasurements.length > 0) {
          ids.push(...typeMeasurements.slice(0, 5).map((m) => m.id));
        }
      });
      return ids;
    };

    interface GeneratedInsight {
      type: string;
      title: string;
      description: string;
      action_items?: string[];
      related_measurements?: string[];
      priority?: string;
    }

    // Store insights in database
    const insightsToInsert = insights.map((insight: GeneratedInsight) => ({
      user_id: userId,
      insight_type: insight.type,
      title: insight.title,
      content: insight.content,
      confidence_score: Math.min(Math.max(insight.confidence, 0), 1),
      related_measurements: getMeasurementIds(insight.related_measurement_types || []),
      related_documents: [],
      dismissed: false
    }));

    const { data: insertedInsights, error: insertError } = await supabase
      .from('health_insights')
      .insert(insightsToInsert)
      .select();

    if (insertError) {
      console.error('Error storing insights:', insertError);
      throw insertError;
    }

    console.log('✅ Health insights generated and stored successfully');

    return new Response(
      JSON.stringify({
        insights: insertedInsights,
        count: insertedInsights?.length || 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error generating health insights:', error);
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
