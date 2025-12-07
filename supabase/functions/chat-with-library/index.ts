import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, userId } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error("Messages array is required");
    }

    const userQuery = messages[messages.length - 1]?.content;
    if (!userQuery) {
      throw new Error("User query is required");
    }

    console.log("🔍 Chat query:", userQuery);

    // Get API keys
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Step 1: Generate embedding for user query
    console.log("📊 Generating query embedding...");
    const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: userQuery,
        encoding_format: "float"
      }),
    });

    if (!embeddingResponse.ok) {
      const errorText = await embeddingResponse.text();
      console.error("Embedding error:", errorText);
      throw new Error("Failed to generate query embedding");
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data?.[0]?.embedding;

    if (!queryEmbedding) {
      throw new Error("No embedding returned");
    }

    console.log("✅ Query embedding generated, dimension:", queryEmbedding.length);

    // Step 2: Search for similar items
    console.log("🔎 Searching for similar items...");
    
    // Build query - filter by user_id if provided
    let query = supabase.rpc('find_similar_items', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: 0.3,
      match_count: 8
    });

    const { data: similarItems, error: searchError } = await query;

    if (searchError) {
      console.error("Search error:", searchError);
      throw new Error("Failed to search items");
    }

    console.log(`📚 Found ${similarItems?.length || 0} similar items`);

    // Step 3: Fetch full item details for context
    let contextItems: any[] = [];
    if (similarItems && similarItems.length > 0) {
      const itemIds = similarItems.map((item: any) => item.id);
      
      const { data: fullItems, error: fetchError } = await supabase
        .from('items')
        .select('id, title, summary, tags, type, content, user_notes')
        .in('id', itemIds);

      if (fetchError) {
        console.error("Fetch error:", fetchError);
      } else {
        // Merge similarity scores with full items
        contextItems = (fullItems || []).map(item => {
          const simItem = similarItems.find((s: any) => s.id === item.id);
          return {
            ...item,
            similarity: simItem?.similarity || 0
          };
        }).sort((a, b) => b.similarity - a.similarity);
      }
    }

    console.log("📋 Context items prepared:", contextItems.length);

    // Step 4: Build context for LLM
    const contextText = contextItems.length > 0
      ? contextItems.map((item, i) => {
          const parts = [`[${i + 1}] "${item.title}" (${item.type})`];
          if (item.summary) parts.push(`Summary: ${item.summary}`);
          if (item.tags?.length) parts.push(`Tags: ${item.tags.join(', ')}`);
          if (item.user_notes) parts.push(`Notes: ${item.user_notes}`);
          return parts.join('\n');
        }).join('\n\n')
      : "No relevant items found in the library.";

    const systemPrompt = `You are a helpful AI assistant that helps users explore their saved content library. You have access to the user's saved items (URLs, files, images, notes) and can answer questions about them.

CONTEXT FROM USER'S LIBRARY:
${contextText}

INSTRUCTIONS:
- Answer based on the library content provided above
- Reference specific items by their titles when relevant
- If no relevant items exist, say so helpfully
- Be conversational and concise
- If the user asks about something not in their library, suggest they might want to save related content
- When referencing items, mention them naturally (e.g., "In your saved article about...")`;

    // Step 5: Stream response from Lovable AI
    console.log("🤖 Generating AI response...");
    
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        stream: true,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      throw new Error("Failed to generate AI response");
    }

    // Return streaming response with source items in header
    const sourceItemsHeader = JSON.stringify(contextItems.map(item => ({
      id: item.id,
      title: item.title,
      type: item.type,
      similarity: item.similarity
    })));

    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "X-Source-Items": encodeURIComponent(sourceItemsHeader),
      },
    });

  } catch (error) {
    console.error("❌ Chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
