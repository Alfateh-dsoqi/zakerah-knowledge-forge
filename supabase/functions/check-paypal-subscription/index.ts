import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-PAYPAL-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";

    if (!paypalClientId || !paypalClientSecret) {
      throw new Error("PayPal credentials not configured");
    }

    const paypalBaseUrl = paypalEnvironment === "live" 
      ? "https://api-m.paypal.com" 
      : "https://api-m.sandbox.paypal.com";

    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get PayPal access token
    const authResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    if (!authResponse.ok) {
      throw new Error("Failed to get PayPal access token");
    }

    const authData = await authResponse.json();
    const accessToken = authData.access_token;
    logStep("PayPal access token obtained");

    // Check if user has a subscription record
    const { data: subscriber } = await supabaseClient
      .from("subscribers")
      .select("*")
      .eq("email", user.email)
      .single();

    if (!subscriber || !subscriber.stripe_customer_id) {
      logStep("No subscription found for user");
      await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Check PayPal subscription status
    const subscriptionId = subscriber.stripe_customer_id; // PayPal subscription ID stored here
    const subscriptionResponse = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!subscriptionResponse.ok) {
      logStep("Failed to fetch PayPal subscription", { subscriptionId });
      // Subscription might be invalid, mark as unsubscribed
      await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const subscriptionData = await subscriptionResponse.json();
    logStep("PayPal subscription fetched", { status: subscriptionData.status });

    const isActive = subscriptionData.status === 'ACTIVE';
    let subscriptionEnd = null;
    let subscriptionTier = null;

    if (isActive && subscriptionData.billing_info?.next_billing_time) {
      subscriptionEnd = new Date(subscriptionData.billing_info.next_billing_time).toISOString();
      
      // Determine tier from plan ID or amount
      const planId = subscriptionData.plan_id;
      if (planId?.includes('pro')) {
        subscriptionTier = 'Pro';
      } else if (planId?.includes('premium')) {
        subscriptionTier = 'Premium';
      } else {
        subscriptionTier = subscriber.subscription_tier; // Keep existing tier
      }
    }

    // Update database
    await supabaseClient.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: subscriptionId,
      subscribed: isActive,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    logStep("Database updated", { subscribed: isActive, subscriptionTier });

    return new Response(JSON.stringify({
      subscribed: isActive,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-paypal-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});