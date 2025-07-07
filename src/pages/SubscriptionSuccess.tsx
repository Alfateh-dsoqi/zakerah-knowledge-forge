import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refetch } = useSubscription();

  useEffect(() => {
    // Show success message
    toast.success('Subscription activated successfully!');
    
    // Refresh subscription status
    setTimeout(() => {
      refetch();
    }, 2000);
  }, [refetch]);

  const subscriptionId = searchParams.get('subscription_id');
  const token = searchParams.get('token');

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="scope-card border-success/20 bg-success/5">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success" />
          </div>
          <CardTitle className="text-2xl text-success">Subscription Successful!</CardTitle>
          <CardDescription className="text-base">
            Your PayPal subscription has been activated successfully.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {subscriptionId && (
            <div className="bg-surface p-4 rounded-lg">
              <p className="text-sm text-text-secondary">Subscription ID:</p>
              <p className="font-mono text-sm text-text-primary">{subscriptionId}</p>
            </div>
          )}
          
          <div className="space-y-4 text-center">
            <p className="text-text-secondary">
              You now have access to all premium features. Your subscription will be automatically renewed monthly.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => navigate('/dashboard')}
                className="btn-primary-3d"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => navigate('/subscription')}
                variant="outline"
              >
                View Subscription
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}