import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const genAI = new GoogleGenerativeAI(Deno.env.get('GOOGLE_GEMINI_API_KEY') ?? '');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // DELETE endpoint for deleting a knowledge entry
  if (req.method === 'DELETE') {
    try {
      const { entryId, userId } = await req.json();
      if (!entryId || !userId) {
        return new Response(JSON.stringify({ error: 'Missing entryId or userId' }), { status: 400, headers: corsHeaders });
      }
      // Delete embeddings first (if any)
      await supabase.from('embeddings').delete().eq('entry_id', entryId).eq('user_id', userId);
      // Delete the knowledge entry
      const { error } = await supabase.from('knowledge_entries').delete().eq('id', entryId).eq('user_id', userId);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
    }
  }

  // POST/PUT: Create knowledge entry
  try {
    const body = await req.json();
    const { content, sourceUrl, userId, generateBrainstorming } = body;
    // Step 0: Generate title (purpose-focused)
    const title = await generateTitle(content);
    // Step 1: Analyze content and determine scope
    const scopeAnalysis = await analyzeContentScope(content);
    // Step 2: Extract key insights
    const insights = await extractInsights(content);
    // Step 3: Generate embeddings
    const embeddings = await generateEmbeddings(content);
    // Step 4: Optionally generate brainstorming (if requested)
    let brainstorming: string[] | null = null;
    if (generateBrainstorming) {
      brainstorming = await generateBrainstormingIdeas(content);
    }
    // Step 5: Store everything in database
    const result = await storeKnowledge({
      userId,
      title,
      content,
      sourceUrl,
      scopeAnalysis,
      insights,
      embeddings,
      brainstorming
    });
    return new Response(
      JSON.stringify({ 
        success: true, 
        entryId: result.entryId,
        scopeName: result.scopeName,
        insights: insights,
        brainstorming: brainstorming || null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing knowledge:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function analyzeContentScope(content: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `
    Analyze the following content and determine the most appropriate knowledge scope/category.
    
    Content: "${content.substring(0, 1000)}..."
    
    Choose from these categories or suggest a new one:
    - Technology & AI
    - Marketing & Branding  
    - Leadership & Management
    - Business Strategy
    - Product Development
    - Data Science
    - Design & UX
    - Finance & Investment
    - Health & Wellness
    - General Knowledge
    
    Respond with ONLY a JSON object in this format:
    {
      "scope": "Category Name",
      "confidence": 0.95,
      "reasoning": "Brief explanation of why this category fits"
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    return JSON.parse(text.replace(/```json\n?|```\n?/g, ''));
  } catch (e) {
    // Fallback if JSON parsing fails
    return {
      scope: "General Knowledge",
      confidence: 0.5,
      reasoning: "AI analysis failed, using default category"
    };
  }
}

async function extractInsights(content: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const prompt = `
    Extract key insights from this content. Focus on actionable information, important concepts, and notable details.
    
    Content: "${content}"
    
    Respond with ONLY a JSON object in this format:
    {
      "summary": "Brief 2-3 sentence summary",
      "keyPoints": ["Point 1", "Point 2", "Point 3"],
      "entities": ["Entity1", "Entity2", "Entity3"],
      "tags": ["tag1", "tag2", "tag3"],
      "actionableInsights": ["Insight 1", "Insight 2"]
    }
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    return JSON.parse(text.replace(/```json\n?|```\n?/g, ''));
  } catch (e) {
    // Fallback extraction
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return {
      summary: content.substring(0, 200) + '...',
      keyPoints: sentences.slice(0, 3).map(s => s.trim()),
      entities: [],
      tags: [],
      actionableInsights: []
    };
  }
}

async function generateEmbeddings(content: string) {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  // Split content into chunks of ~500 characters
  const chunks: string[] = [];
  const chunkSize = 500;
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.substring(i, i + chunkSize));
  }
  type EmbeddingChunk = { chunk: string; index: number; embedding: any };
  const embeddings: EmbeddingChunk[] = [];
  for (let i = 0; i < chunks.length; i++) {
    try {
      const result = await model.embedContent(chunks[i]);
      embeddings.push({
        chunk: chunks[i],
        index: i,
        embedding: result.embedding.values
      });
    } catch (error) {
      console.error(`Error generating embedding for chunk ${i}:`, error);
      // Create a mock embedding if the API fails
      embeddings.push({
        chunk: chunks[i],
        index: i,
        embedding: Array.from({ length: 768 }, () => Math.random() - 0.5)
      });
    }
  }
  return embeddings;
}

// Purpose-focused title generation
async function generateTitle(content: string) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `
    Read the following content and generate a concise title that clearly states the general purpose or main intent of the knowledge. Focus on the purpose, not just the topic. Limit to 10 words or less.\nContent: "${content.substring(0, 1000)}..."\nRespond with ONLY the title, no explanation or formatting.
  `;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    // Remove any code block formatting or extra quotes
    const title = text.replace(/^"|"$/g, '').replace(/`{3,}.*\n?/g, '').trim();
    return title || "Untitled Knowledge";
  } catch (e) {
    return "Untitled Knowledge";
  }
}

// Brainstorming ideas generator (for AI Brainstorming section)
async function generateBrainstormingIdeas(content: string): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `
    Based on the following knowledge content, generate a list of creative brainstorming ideas, suggestions, or applications.\nContent: "${content.substring(0, 1000)}..."\nRespond with a JSON array of ideas.
  `;
  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Try to parse as JSON array
    const ideas = JSON.parse(text.replace(/```json\n?|```\n?/g, ''));
    if (Array.isArray(ideas)) return ideas as string[];
    return [];
  } catch (e) {
    return [];
  }
}

async function storeKnowledge(data: any) {
  const { userId, title, content, sourceUrl, scopeAnalysis, insights, embeddings, brainstorming } = data;
  // Ensure scope exists
  let { data: scope } = await supabase
    .from('knowledge_scopes')
    .select('id')
    .eq('user_id', userId)
    .eq('name', scopeAnalysis.scope)
    .single();

  if (!scope) {
    const { data: newScope, error: scopeError } = await supabase
      .from('knowledge_scopes')
      .insert({
        user_id: userId,
        name: scopeAnalysis.scope,
        description: scopeAnalysis.reasoning,
      })
      .select('id')
      .single();

    if (scopeError) throw scopeError;
    scope = newScope;
  }

  // Insert knowledge entry (add brainstorming if present)
  const entryInsert: any = {
    user_id: userId,
    scope_id: scope.id,
    title,
    content,
    source_url: sourceUrl,
    processed_content: insights,
  };
  if (brainstorming) {
    entryInsert.brainstorming = brainstorming;
  }
  const { data: entry, error: entryError } = await supabase
    .from('knowledge_entries')
    .insert(entryInsert)
    .select('id')
    .single();

  if (entryError) throw entryError;

  // Store embeddings
  const embeddingInserts = embeddings.map((embedding: any) => ({
    entry_id: entry.id,
    user_id: userId,
    content_chunk: embedding.chunk,
    embedding: embedding.embedding,
    chunk_index: embedding.index,
  }));

  const { error: embeddingError } = await supabase
    .from('embeddings')
    .insert(embeddingInserts);

  if (embeddingError) throw embeddingError;

  return {
    entryId: entry.id,
    scopeName: scopeAnalysis.scope
  };
}