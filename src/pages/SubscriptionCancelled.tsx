import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

export default function SubscriptionCancelled() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="scope-card border-error/20 bg-error/5">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-error" />
          </div>
          <CardTitle className="text-2xl text-error">Subscription Cancelled</CardTitle>
          <CardDescription className="text-base">
            Your PayPal subscription was cancelled and no payment was processed.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4 text-center">
            <p className="text-text-secondary">
              Don't worry! You can try subscribing again at any time. Your account remains active with the free tier features.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate('/subscription')}
                className="btn-primary-3d"
              >
                Try Again
              </Button>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}