import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Brain, User, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome to your personal AI assistant! I have access to all the knowledge you've added to Zakerah. I can help you:

• Find specific information from your knowledge base
• Make connections between different topics
• Summarize insights across multiple sources  
• Answer questions based only on your stored knowledge

What would you like to explore from your knowledge universe?`,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Mock AI response - In real implementation, this would call the RAG edge function
      const aiResponse = await generateAIResponse(userMessage.content);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        sources: aiResponse.sources,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      toast.error('Failed to get AI response. Please try again.');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble accessing your knowledge base right now. Please try your question again in a moment.",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIResponse = async (query: string): Promise<{ content: string; sources: string[] }> => {
    // Mock delay to simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Mock responses based on query content
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('summary') || queryLower.includes('summarize')) {
      return {
        content: `Based on your knowledge base, here's a summary of the key insights I found:

**Main Themes:**
• Technology and AI advancement trends
• Leadership and management best practices  
• Marketing strategy evolution
• Business innovation patterns

**Key Takeaways:**
1. Digital transformation is accelerating across industries
2. AI tools are becoming essential for competitive advantage
3. Customer-centric approaches drive sustainable growth
4. Remote leadership requires new skill sets

This synthesis draws from ${Math.floor(Math.random() * 8) + 3} different knowledge entries in your database.`,
        sources: ['Technology & AI', 'Leadership & Management', 'Marketing Strategy']
      };
    }
    
    if (queryLower.includes('ai') || queryLower.includes('artificial intelligence')) {
      return {
        content: `From your AI and technology knowledge entries, here are the key insights:

**Current AI Trends:**
• Large Language Models are transforming content creation
• AI automation is reshaping traditional workflows  
• Machine learning applications in business intelligence
• Ethical AI considerations gaining importance

**Implementation Strategies:**
• Start with pilot projects to test AI tools
• Focus on augmenting human capabilities rather than replacement
• Invest in AI literacy across the organization
• Establish clear AI governance frameworks

Would you like me to dive deeper into any specific AI topic from your knowledge base?`,
        sources: ['Technology & AI', 'Business Strategy']
      };
    }
    
    if (queryLower.includes('marketing') || queryLower.includes('brand')) {
      return {
        content: `Here's what I found in your marketing knowledge:

**Modern Marketing Insights:**
• Personalization at scale drives engagement
• Content marketing builds long-term relationships
• Data-driven decision making is essential
• Multi-channel consistency strengthens brand identity

**Emerging Trends:**
• AI-powered customer segmentation
• Interactive content experiences
• Community-driven marketing approaches
• Sustainable and purpose-driven messaging

**Actionable Strategies:**
1. Leverage customer data for targeted campaigns
2. Create authentic, value-driven content
3. Build communities around your brand
4. Measure and optimize continuously

This information comes from your stored marketing insights and industry analysis.`,
        sources: ['Marketing & Branding', 'Business Strategy']
      };
    }

    // Default response for general queries
    return {
      content: `I searched through your knowledge base and found relevant information, but I'd like to provide you with the most accurate response possible. 

Could you help me understand exactly what aspect you're most interested in? For example:
• Are you looking for specific facts or data?
• Do you want me to compare different concepts?
• Would you like a summary of a particular topic?
• Are you seeking actionable insights or recommendations?

The more specific your question, the better I can search through your ${Math.floor(Math.random() * 20) + 5} knowledge entries to give you precisely what you need.`,
      sources: ['General Knowledge']
    };
  };

  const formatMessageContent = (content: string) => {
    // Simple formatting for better readability
    return content
      .split('\n\n')
      .map((paragraph, index) => (
        <div key={index} className="mb-3 last:mb-0">
          {paragraph.split('\n').map((line, lineIndex) => {
            if (line.startsWith('**') && line.endsWith('**')) {
              return (
                <div key={lineIndex} className="font-semibold text-text-primary mb-1">
                  {line.slice(2, -2)}
                </div>
              );
            }
            if (line.startsWith('• ')) {
              return (
                <div key={lineIndex} className="ml-4 text-text-secondary">
                  <span className="text-primary">•</span> {line.slice(2)}
                </div>
              );
            }
            if (line.match(/^\d+\./)) {
              return (
                <div key={lineIndex} className="ml-4 text-text-secondary">
                  <span className="text-primary font-medium">{line.split('.')[0]}.</span> {line.split('.').slice(1).join('.')}
                </div>
              );
            }
            return line ? (
              <div key={lineIndex} className="text-text-secondary">
                {line}
              </div>
            ) : null;
          })}
        </div>
      ));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl h-[calc(100vh-8rem)]">
      <div className="flex flex-col h-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-12 h-12 bg-ai rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-shimmer">AI Assistant</h1>
          </div>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Chat with your personal AI that has access to all your stored knowledge
          </p>
        </div>

        {/* Chat Messages */}
        <Card className="flex-1 glass border-border-subtle overflow-hidden">
          <CardContent className="p-0 h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start space-x-3 ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                    ${message.role === 'user' 
                      ? 'bg-gradient-primary' 
                      : 'bg-ai'
                    }
                  `}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Brain className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className={`
                    flex-1 max-w-[80%] space-y-2
                    ${message.role === 'user' ? 'text-right' : ''}
                  `}>
                    <div className={`
                      p-4 rounded-2xl
                      ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-surface border border-border-subtle'
                      }
                    `}>
                      {message.role === 'user' ? (
                        <p className="text-sm">{message.content}</p>
                      ) : (
                        <div className="text-sm space-y-1">
                          {formatMessageContent(message.content)}
                        </div>
                      )}
                    </div>

                    {/* Sources */}
                    {message.sources && message.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1 justify-start">
                        <Sparkles className="w-3 h-3 text-accent mt-1" />
                        {message.sources.map((source) => (
                          <Badge key={source} variant="outline" className="text-xs border-ai/30 text-ai">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-text-muted">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-ai flex items-center justify-center">
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-surface border border-border-subtle p-4 rounded-2xl">
                    <div className="flex items-center space-x-2 text-sm text-text-secondary">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Searching your knowledge base...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="border-t border-border-subtle p-4">
              <form onSubmit={handleSendMessage} className="flex space-x-3">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me anything about your knowledge..."
                  className="flex-1 glass border-border-subtle"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  className="btn-primary-3d"
                  disabled={!inputMessage.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}