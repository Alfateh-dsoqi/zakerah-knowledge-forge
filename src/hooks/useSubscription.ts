import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';

export interface SubscriptionStatus {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  loading: boolean;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    subscribed: false,
    subscription_tier: null,
    subscription_end: null,
    loading: true,
  });

  useEffect(() => {
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  const checkSubscriptionStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-paypal-subscription');
      
      if (error) {
        console.error('Error checking subscription:', error);
        setSubscription(prev => ({ ...prev, loading: false }));
        return;
      }

      setSubscription({
        subscribed: data.subscribed || false,
        subscription_tier: data.subscription_tier || null,
        subscription_end: data.subscription_end || null,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription(prev => ({ ...prev, loading: false }));
    }
  };

  const createSubscription = async (tier: 'pro' | 'premium') => {
    try {
      const { data, error } = await supabase.functions.invoke('create-paypal-subscription', {
        body: { tier }
      });

      if (error) {
        toast.error('Failed to create subscription');
        console.error('Subscription error:', error);
        return null;
      }

      if (data?.url) {
        // Redirect to PayPal for approval
        window.location.href = data.url;
      }

      return data;
    } catch (error) {
      toast.error('Failed to create subscription');
      console.error('Subscription error:', error);
      return null;
    }
  };

  return {
    ...subscription,
    createSubscription,
    refetch: checkSubscriptionStatus,
  };
}