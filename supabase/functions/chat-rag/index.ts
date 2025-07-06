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

  try {
    const { message, userId } = await req.json();
    
    console.log('Processing chat query for user:', userId);
    console.log('Query:', message);

    // Step 1: Generate embedding for the user's query
    const queryEmbedding = await generateQueryEmbedding(message);
    
    // Step 2: Perform semantic search
    const relevantContent = await searchKnowledgeBase(userId, queryEmbedding);
    console.log('Found', relevantContent.length, 'relevant chunks');

    // Step 3: Generate response using RAG
    const response = await generateRAGResponse(message, relevantContent);
    
    // Step 4: Extract source information
    const sources = extractSources(relevantContent);

    return new Response(
      JSON.stringify({ 
        response: response.content,
        sources: sources,
        confidence: response.confidence 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in chat RAG:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process your question. Please try again.',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateQueryEmbedding(query: string) {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  
  try {
    const result = await model.embedContent(query);
    return result.embedding.values;
  } catch (error) {
    console.error('Error generating query embedding:', error);
    // Return a mock embedding if the API fails
    return Array.from({ length: 768 }, () => Math.random() - 0.5);
  }
}

async function searchKnowledgeBase(userId: string, queryEmbedding: number[]) {
  // Convert embedding array to PostgreSQL vector format
  const embeddingString = `[${queryEmbedding.join(',')}]`;
  
  const { data, error } = await supabase.rpc('match_knowledge_embeddings', {
    query_embedding: embeddingString,
    match_threshold: 0.7,
    match_count: 10,
    user_id: userId
  });

  if (error) {
    console.error('Error searching knowledge base:', error);
    // Fallback: get recent entries
    const { data: fallbackData } = await supabase
      .from('knowledge_entries')
      .select(`
        content,
        title,
        knowledge_scopes(name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    return fallbackData || [];
  }

  return data || [];
}

async function generateRAGResponse(query: string, relevantContent: any[]) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  // Prepare context from retrieved content
  const context = relevantContent
    .map((item, index) => `
      Source ${index + 1}: ${item.title || 'Untitled'}
      Content: ${item.content || item.content_chunk || ''}
      Scope: ${item.knowledge_scopes?.name || item.scope_name || 'Unknown'}
    `)
    .join('\n---\n');

  const prompt = `
    You are a personal knowledge assistant for a user. Answer their question based ONLY on the provided context from their personal knowledge base. 

    IMPORTANT RULES:
    1. Only use information from the provided context
    2. If the context doesn't contain relevant information, say so clearly
    3. Be professional and helpful
    4. Reference specific sources when possible
    5. Don't make up information not in the context

    Context from user's knowledge base:
    ${context}

    User's Question: ${query}

    Provide a helpful response based on the context above. If the context doesn't contain relevant information, suggest what type of knowledge they might need to add to get better answers.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return {
      content: response.text(),
      confidence: relevantContent.length > 0 ? 0.8 : 0.3
    };
  } catch (error) {
    console.error('Error generating RAG response:', error);
    
    if (relevantContent.length === 0) {
      return {
        content: "I couldn't find relevant information in your knowledge base to answer that question. Try adding more content related to this topic to get better answers!",
        confidence: 0.1
      };
    }
    
    return {
      content: "I found some relevant information but had trouble processing it. Could you try rephrasing your question?",
      confidence: 0.2
    };
  }
}

function extractSources(relevantContent: any[]) {
  const sources = new Set();
  
  relevantContent.forEach(item => {
    if (item.knowledge_scopes?.name) {
      sources.add(item.knowledge_scopes.name);
    }
    if (item.scope_name) {
      sources.add(item.scope_name);
    }
  });
  
  return Array.from(sources);
}