import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, MessageSquare, Search, TrendingUp, Brain, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface DashboardStats {
  totalScopes: number;
  totalEntries: number;
  recentEntries: any[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalScopes: 0,
    totalEntries: 0,
    recentEntries: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    try {
      // Get scope count
      const { count: scopeCount } = await supabase
        .from('knowledge_scopes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Get entry count
      const { count: entryCount } = await supabase
        .from('knowledge_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Get recent entries
      const { data: recentEntries } = await supabase
        .from('knowledge_entries')
        .select(`
          id,
          title,
          created_at,
          knowledge_scopes(name, color)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalScopes: scopeCount || 0,
        totalEntries: entryCount || 0,
        recentEntries: recentEntries || []
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Add Knowledge',
      description: 'Input new content to your knowledge base',
      icon: BookOpen,
      href: '/input',
      color: 'bg-gradient-primary',
    },
    {
      title: 'Explore Scopes',
      description: 'Browse your organized knowledge areas',
      icon: Search,
      href: '/scopes',
      color: 'bg-gradient-knowledge',
    },
    {
      title: 'AI Assistant',
      description: 'Chat with your personal knowledge AI',
      icon: MessageSquare,
      href: '/chat',
      color: 'bg-ai',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-shimmer">
          Welcome back, {user?.user_metadata?.display_name || 'Knowledge Seeker'}
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto">
          Your personal knowledge universe awaits. What would you like to explore today?
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="scope-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Knowledge Scopes
            </CardTitle>
            <Search className="h-4 w-4 text-knowledge" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">
              {loading ? '—' : stats.totalScopes}
            </div>
            <p className="text-xs text-text-muted">
              Organized knowledge areas
            </p>
          </CardContent>
        </Card>

        <Card className="scope-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Total Entries
            </CardTitle>
            <Brain className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">
              {loading ? '—' : stats.totalEntries}
            </div>
            <p className="text-xs text-text-muted">
              Pieces of knowledge stored
            </p>
          </CardContent>
        </Card>

        <Card className="scope-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-text-secondary">
              Growth
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-text-primary">
              {loading ? '—' : stats.recentEntries.length > 0 ? '+' + Math.min(stats.recentEntries.length, 5) : '0'}
            </div>
            <p className="text-xs text-text-muted">
              Recent additions this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-text-primary">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} to={action.href}>
                <Card className="scope-card h-full cursor-pointer group">
                  <CardHeader className="pb-4">
                    <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription className="text-text-muted">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      {stats.recentEntries.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-text-primary">Recent Knowledge</h2>
            <Link to="/scopes">
              <Button variant="ghost" size="sm" className="text-text-secondary hover:text-text-primary">
                View All
              </Button>
            </Link>
          </div>
          
          <div className="space-y-3">
            {stats.recentEntries.map((entry) => (
              <Card key={entry.id} className="glass border-border-subtle">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-text-primary mb-1">
                        {entry.title}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-text-muted">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: entry.knowledge_scopes?.color || '#8B5CF6' }}
                        />
                        <span>{entry.knowledge_scopes?.name || 'Uncategorized'}</span>
                        <span>•</span>
                        <span>
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Zap className="w-4 h-4 text-accent" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && stats.totalEntries === 0 && (
        <Card className="scope-card text-center py-12">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-text-primary">
                Start Building Your Knowledge Universe
              </h3>
              <p className="text-text-muted max-w-md mx-auto">
                Add your first piece of knowledge to begin creating your personalized AI-powered knowledge base.
              </p>
            </div>
            <Link to="/input">
              <Button className="btn-primary-3d">
                <BookOpen className="w-4 h-4 mr-2" />
                Add Your First Knowledge
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}