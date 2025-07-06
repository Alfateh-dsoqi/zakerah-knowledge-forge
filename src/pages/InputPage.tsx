import React, { useState, useRef } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Brain, Sparkles, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface ProcessingStage {
  id: string;
  name: string;
  description: string;
  completed: boolean;
}

export default function InputPage() {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [processingStages, setProcessingStages] = useState<ProcessingStage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const stages: ProcessingStage[] = [
    { id: 'analyze', name: 'Content Analysis', description: 'Analyzing content and identifying key themes', completed: false },
    { id: 'scope', name: 'Knowledge Scope', description: 'Determining the best knowledge category', completed: false },
    { id: 'extract', name: 'Insight Extraction', description: 'Extracting key points and entities', completed: false },
    { id: 'embed', name: 'Vector Embedding', description: 'Creating semantic embeddings for AI retrieval', completed: false },
    { id: 'store', name: 'Knowledge Storage', description: 'Storing in your personal knowledge base', completed: false },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Please enter some content to process');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title for this knowledge');
      return;
    }

    setProcessing(true);
    setProcessingStages(stages.map(stage => ({ ...stage, completed: false })));

      try {
        // All processing is now handled by the AI edge function
        const result = await storeKnowledge({
          title: title.trim(),
          content: content.trim(),
          sourceUrl: sourceUrl.trim() || null,
          scopeName: '',
          processedContent: {},
          embeddings: []
        });

        toast.success('Knowledge successfully added to your universe!');
        
        // Reset form
        setContent('');
        setTitle('');
        setSourceUrl('');
        
      } catch (error) {
      console.error('Error processing knowledge:', error);
      toast.error('Failed to process knowledge. Please try again.');
    } finally {
      setProcessing(false);
      setProcessingStages([]);
    }
  };

  const updateStage = (stageId: string, completed: boolean) => {
    setProcessingStages(current => 
      current.map(stage => 
        stage.id === stageId ? { ...stage, completed } : stage
      )
    );
  };

  const storeKnowledge = async (data: {
    title: string;
    content: string;
    sourceUrl: string | null;
    scopeName: string;
    processedContent: any;
    embeddings: any[];
  }) => {
    // Call the AI-powered processing edge function
    const { data: result, error } = await supabase.functions.invoke('process-knowledge', {
      body: {
        title: data.title,
        content: data.content,
        sourceUrl: data.sourceUrl,
        userId: user!.id
      }
    });

    if (error) throw error;
    if (!result.success) throw new Error('Processing failed');
    
    return result;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-shimmer">Knowledge Input</h1>
          </div>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Transform any text into structured, searchable knowledge with AI processing
          </p>
        </div>

        {/* Input Form */}
        <Card className="scope-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="w-5 h-5 text-primary" />
              <span>Add New Knowledge</span>
            </CardTitle>
            <CardDescription>
              Paste content from articles, posts, or any text you want to preserve and make searchable
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title Input */}
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Give this knowledge a descriptive title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="glass border-border-subtle"
                  disabled={processing}
                />
              </div>

              {/* Source URL (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="sourceUrl">Source URL (Optional)</Label>
                <Input
                  id="sourceUrl"
                  type="url"
                  placeholder="https://... (where did this knowledge come from?)"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="glass border-border-subtle"
                  disabled={processing}
                />
              </div>

              {/* Content Input */}
              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  ref={textareaRef}
                  id="content"
                  placeholder="Paste your content here... LinkedIn posts, articles, insights, or any text you want to make searchable and AI-accessible."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[200px] glass border-border-subtle resize-y"
                  disabled={processing}
                />
                <div className="flex items-center justify-between text-sm text-text-muted">
                  <span>{content.length} characters</span>
                  <Badge variant="secondary" className="text-xs">
                    {content.split(/\s+/).filter(w => w.length > 0).length} words
                  </Badge>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full btn-primary-3d"
                disabled={processing || !content.trim() || !title.trim()}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Knowledge...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Process & Store Knowledge
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Processing Stages */}
        {processing && processingStages.length > 0 && (
          <Card className="glass border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-primary">
                <Brain className="w-5 h-5 animate-pulse" />
                <span>AI Processing Pipeline</span>
              </CardTitle>
              <CardDescription>
                Your knowledge is being processed and prepared for intelligent retrieval
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {processingStages.map((stage, index) => (
                <div key={stage.id} className="flex items-center space-x-3">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                    ${stage.completed 
                      ? 'bg-success text-white' 
                      : index === processingStages.findIndex(s => !s.completed)
                        ? 'bg-primary text-white animate-pulse'
                        : 'bg-surface border border-border-subtle text-text-muted'
                    }
                  `}>
                    {stage.completed ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium ${stage.completed ? 'text-success' : 'text-text-primary'}`}>
                      {stage.name}
                    </h4>
                    <p className="text-sm text-text-muted">{stage.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}