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
    const { userId } = await req.json();
    
    console.log('Generating brainstorming ideas for user:', userId);

    // Get user's knowledge scopes and recent entries
    const { data: userKnowledge } = await supabase
      .from('knowledge_scopes')
      .select(`
        name,
        description,
        knowledge_entries(
          title,
          processed_content,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!userKnowledge || userKnowledge.length === 0) {
      return new Response(
        JSON.stringify({ 
          ideas: [],
          message: "Add some knowledge to your database first to get AI-generated brainstorming ideas!"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate brainstorming ideas
    const ideas = await generateBrainstormingIdeas(userKnowledge);

    return new Response(
      JSON.stringify({ ideas }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating brainstorming ideas:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate brainstorming ideas',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateBrainstormingIdeas(userKnowledge: any[]) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  // Prepare knowledge summary for the AI
  const knowledgeSummary = userKnowledge.map(scope => {
    const recentEntries = scope.knowledge_entries
      ?.slice(0, 3)
      .map((entry: any) => entry.title)
      .join(', ') || 'No entries';
    
    return `${scope.name}: ${scope.description || 'No description'} (Recent: ${recentEntries})`;
  }).join('\n');

  const prompt = `
    Based on the user's personal knowledge base, generate 3-4 creative brainstorming ideas that connect different areas of their knowledge.

    User's Knowledge Areas:
    ${knowledgeSummary}

    Generate ideas that:
    1. Connect 2-3 different knowledge areas
    2. Suggest practical applications or innovations
    3. Identify potential opportunities or insights
    4. Are actionable and thought-provoking

    Respond with ONLY a JSON array in this format:
    [
      {
        "title": "Idea Title",
        "description": "Detailed description of the idea and why it's interesting",
        "relatedScopes": ["Scope 1", "Scope 2"],
        "actionItems": ["Action 1", "Action 2"]
      }
    ]

    Make the ideas specific to their knowledge areas, not generic advice.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const ideas = JSON.parse(text.replace(/```json\n?|```\n?/g, ''));
    return Array.isArray(ideas) ? ideas : [];
  } catch (error) {
    console.error('Error parsing brainstorming response:', error);
    
    // Fallback ideas based on available scopes
    const scopeNames = userKnowledge.map(s => s.name);
    const fallbackIdeas = [];
    
    if (scopeNames.length >= 2) {
      fallbackIdeas.push({
        title: `Cross-Domain Innovation: ${scopeNames[0]} meets ${scopeNames[1]}`,
        description: `Explore how insights from ${scopeNames[0]} could revolutionize approaches in ${scopeNames[1]}. Look for unexpected connections and opportunities.`,
        relatedScopes: scopeNames.slice(0, 2),
        actionItems: ["Identify common themes", "Research intersection points"]
      });
    }
    
    if (scopeNames.length >= 3) {
      fallbackIdeas.push({
        title: "Knowledge Synthesis Opportunity",
        description: `Your diverse knowledge in ${scopeNames.slice(0, 3).join(', ')} creates unique opportunities for synthesis and innovation.`,
        relatedScopes: scopeNames.slice(0, 3),
        actionItems: ["Map knowledge connections", "Identify synthesis opportunities"]
      });
    }
    
    return fallbackIdeas;
  }
}