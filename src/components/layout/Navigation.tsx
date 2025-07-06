import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { BookOpen, MessageSquare, Search } from 'lucide-react';

export function Navigation() {
  const { user, signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { 
      path: '/input', 
      label: 'Input', 
      icon: BookOpen,
      description: 'Add knowledge'
    },
    { 
      path: '/scopes', 
      label: 'Scopes', 
      icon: Search,
      description: 'Explore knowledge'
    },
    { 
      path: '/chat', 
      label: 'Chat', 
      icon: MessageSquare,
      description: 'AI assistant'
    },
  ];

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border-subtle">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 group">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center glow">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <div>
            <span className="text-xl font-bold text-shimmer">Zakerah</span>
            <span className="hidden sm:inline text-xs text-text-secondary ml-2">Knowledge Forge</span>
          </div>
        </Link>

        {/* Navigation Items */}
        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link key={item.path} to={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`
                    flex items-center space-x-2 transition-all duration-200
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-lg' 
                      : 'hover:bg-surface-hover text-text-secondary hover:text-text-primary'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8 border border-border-subtle">
                <AvatarFallback className="bg-gradient-primary text-white text-sm">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 glass border-border-subtle" align="end">
            <div className="flex items-center justify-start space-x-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium text-sm text-text-primary">
                  {user?.user_metadata?.display_name || 'Knowledge Seeker'}
                </p>
                <p className="text-xs text-text-muted">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            
            {/* Mobile navigation items */}
            <div className="md:hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link to={item.path} className="flex items-center space-x-2">
                      <Icon className="w-4 h-4" />
                      <div>
                        <span>{item.label}</span>
                        <p className="text-xs text-text-muted">{item.description}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
            </div>
            
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="text-error hover:bg-error/10"
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}