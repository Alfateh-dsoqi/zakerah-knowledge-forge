import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, BookOpen, Brain, Sparkles, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface KnowledgeScope {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  entry_count: number;
  recent_entries: {
    id: string;
    title: string;
    created_at: string;
  }[];
}

interface BrainstormingIdea {
  id: string;
  title: string;
  description: string;
  relatedScopes: string[];
}

export default function ScopesPage() {
  const { user } = useAuth();
  const [scopes, setScopes] = useState<KnowledgeScope[]>([]);
  const [brainstormingIdeas, setBrainstormingIdeas] = useState<BrainstormingIdea[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadScopes();
      generateBrainstormingIdeas();
    }
  }, [user]);

  const loadScopes = async () => {
    try {
      // Get scopes with entry counts
      const { data: scopesData, error: scopesError } = await supabase
        .from('knowledge_scopes')
        .select(`
          id,
          name,
          description,
          color,
          created_at,
          knowledge_entries(id, title, created_at)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (scopesError) throw scopesError;

      const processedScopes = scopesData?.map(scope => ({
        ...scope,
        entry_count: scope.knowledge_entries?.length || 0,
        recent_entries: (scope.knowledge_entries || [])
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3)
      })) || [];

      setScopes(processedScopes);
    } catch (error) {
      console.error('Error loading scopes:', error);
      toast.error('Failed to load knowledge scopes');
    } finally {
      setLoading(false);
    }
  };

  const generateBrainstormingIdeas = async () => {
    // Mock brainstorming ideas based on existing scopes
    // In a real implementation, this would use AI to generate ideas
    const mockIdeas: BrainstormingIdea[] = [
      {
        id: '1',
        title: 'Cross-Domain Innovation Opportunities',
        description: 'What if you combined insights from your Technology and Marketing knowledge? Consider how AI tools could revolutionize your marketing strategies.',
        relatedScopes: ['Technology & AI', 'Marketing & Branding']
      },
      {
        id: '2',
        title: 'Leadership in the Digital Age',
        description: 'Your business strategy and leadership insights could be synthesized to explore how digital transformation affects management styles.',
        relatedScopes: ['Leadership & Management', 'Business Strategy']
      },
      {
        id: '3',
        title: 'Future Trends Analysis',
        description: 'Connect patterns across your knowledge areas to predict emerging trends that could impact your industry.',
        relatedScopes: ['General Knowledge', 'Technology & AI']
      }
    ];

    setBrainstormingIdeas(mockIdeas);
  };

  const filteredScopes = scopes.filter(scope =>
    scope.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    scope.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <div className="w-12 h-12 bg-gradient-knowledge rounded-xl flex items-center justify-center">
            <Search className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-shimmer">Knowledge Scopes</h1>
        </div>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto">
          Explore your organized knowledge areas and discover AI-generated insights
        </p>
      </div>

      {/* Search */}
      <div className="max-w-md mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted w-4 h-4" />
          <Input
            placeholder="Search knowledge scopes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass border-border-subtle"
          />
        </div>
      </div>

      {/* AI Brainstorming Section */}
      {brainstormingIdeas.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-ai" />
            <h2 className="text-2xl font-semibold text-text-primary">AI Brainstorming</h2>
            <Sparkles className="w-5 h-5 text-accent" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brainstormingIdeas.map((idea) => (
              <Card key={idea.id} className="scope-card border-ai/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-radial from-ai/20 to-transparent rounded-full -mr-8 -mt-8" />
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-ai">{idea.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-text-secondary">{idea.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {idea.relatedScopes.map((scopeName, index) => (
                      <Badge key={index} variant="outline" className="text-xs border-ai/30 text-ai">
                        {scopeName}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Knowledge Scopes Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-text-primary">Your Knowledge Areas</h2>
          <Badge variant="secondary" className="text-sm">
            {filteredScopes.length} {filteredScopes.length === 1 ? 'scope' : 'scopes'}
          </Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="scope-card">
                <CardHeader>
                  <div className="w-8 h-8 bg-surface rounded-lg animate-pulse" />
                  <div className="h-4 bg-surface rounded animate-pulse" />
                  <div className="h-3 bg-surface rounded animate-pulse w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-surface rounded animate-pulse" />
                    <div className="h-3 bg-surface rounded animate-pulse w-2/3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredScopes.length === 0 ? (
          <Card className="scope-card text-center py-12">
            <CardContent className="space-y-4">
              <div className="w-16 h-16 bg-gradient-knowledge rounded-full flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-text-primary">
                  {searchQuery ? 'No matching scopes found' : 'No knowledge scopes yet'}
                </h3>
                <p className="text-text-muted max-w-md mx-auto">
                  {searchQuery 
                    ? `Try a different search term to find your knowledge scopes.`
                    : 'Start adding knowledge to create your first scope and organize your insights.'
                  }
                </p>
              </div>
              {!searchQuery && (
                <Button className="btn-primary-3d" onClick={() => window.location.href = '/input'}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Add Knowledge
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScopes.map((scope) => (
              <Card key={scope.id} className="scope-card group">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: scope.color }}
                    >
                      {scope.name.charAt(0)}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {scope.entry_count} {scope.entry_count === 1 ? 'entry' : 'entries'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {scope.name}
                  </CardTitle>
                  {scope.description && (
                    <CardDescription className="text-sm">
                      {scope.description}
                    </CardDescription>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Recent Entries */}
                  {scope.recent_entries.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-text-secondary flex items-center">
                        <FileText className="w-3 h-3 mr-1" />
                        Recent Entries
                      </h4>
                      <div className="space-y-1">
                        {scope.recent_entries.map((entry) => (
                          <div key={entry.id} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
                            <div className="truncate">{entry.title}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Created Date */}
                  <div className="flex items-center text-xs text-text-muted pt-2 border-t border-border-subtle">
                    <Calendar className="w-3 h-3 mr-1" />
                    Created {new Date(scope.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}