import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Navigation } from './Navigation';
import { Scene3D } from '@/components/3d/Scene3D';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-text-secondary">Loading Zakerah...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle 3D background on some pages */}
      {location.pathname === '/' && (
        <div className="absolute inset-0 z-0 opacity-30">
          <Scene3D />
        </div>
      )}
      
      {/* Navigation */}
      <Navigation />
      
      {/* Main content */}
      <main className="relative z-10 pt-16">
        {children}
      </main>
    </div>
  );
}