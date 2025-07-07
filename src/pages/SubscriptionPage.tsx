import React from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Star, Zap } from 'lucide-react';
import { toast } from 'sonner';

const plans = [
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/month',
    description: 'Perfect for power users who need advanced features',
    features: [
      'Multi-format knowledge capture',
      'Advanced AI brainstorming',
      'Higher precision retrieval',
      'Priority support',
      'Advanced analytics',
    ],
    icon: Zap,
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$30',
    period: '/month',
    description: 'Ultimate plan with all features and highest limits',
    features: [
      'All Pro features',
      'Highest limits on all features',
      'Early access to beta features',
      'Premium support',
      'Custom integrations',
      'Advanced AI models',
    ],
    icon: Crown,
    popular: true,
  },
];

export default function SubscriptionPage() {
  const { subscribed, subscription_tier, subscription_end, loading, createSubscription } = useSubscription();

  const handleSubscribe = async (tier: 'pro' | 'premium') => {
    if (subscribed) {
      toast.info('You already have an active subscription');
      return;
    }

    await createSubscription(tier);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-text-secondary mt-4">Loading subscription status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-shimmer">
          Upgrade Your Knowledge Experience
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto">
          Unlock advanced features and take your knowledge management to the next level
        </p>
      </div>

      {/* Current Subscription Status */}
      {subscribed && (
        <Card className="scope-card border-success/20 bg-success/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-success" />
                <CardTitle className="text-success">Active Subscription</CardTitle>
              </div>
              <Badge variant="outline" className="border-success text-success">
                {subscription_tier}
              </Badge>
            </div>
            <CardDescription>
              {subscription_end 
                ? `Your subscription renews on ${new Date(subscription_end).toLocaleDateString()}`
                : 'Your subscription is active'
              }
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Pricing Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrentPlan = subscribed && subscription_tier === plan.name;
          
          return (
            <Card 
              key={plan.id} 
              className={`
                scope-card relative h-full
                ${plan.popular ? 'border-primary/50 shadow-primary/20 shadow-2xl' : ''}
                ${isCurrentPlan ? 'border-success/50 bg-success/5' : ''}
              `}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-6">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  plan.popular ? 'bg-gradient-primary' : 'bg-gradient-knowledge'
                }`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="space-y-2">
                  <div className="flex items-baseline justify-center space-x-1">
                    <span className="text-4xl font-bold text-text-primary">{plan.price}</span>
                    <span className="text-text-secondary">{plan.period}</span>
                  </div>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button
                  onClick={() => handleSubscribe(plan.id as 'pro' | 'premium')}
                  disabled={isCurrentPlan || (subscribed && !isCurrentPlan)}
                  className={`w-full h-12 text-base font-semibold ${
                    plan.popular ? 'btn-primary-3d' : 'btn-secondary-3d'
                  }`}
                >
                  {isCurrentPlan 
                    ? 'Current Plan' 
                    : subscribed 
                      ? 'Switch Plan' 
                      : `Subscribe to ${plan.name}`
                  }
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ or Additional Info */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h3 className="text-xl font-semibold text-text-primary">
          Secure Payment with PayPal
        </h3>
        <p className="text-text-secondary">
          All subscriptions are processed securely through PayPal. 
          You can manage or cancel your subscription at any time through your PayPal account.
        </p>
      </div>
    </div>
  );
}