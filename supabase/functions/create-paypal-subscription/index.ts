import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYPAL-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox"; // sandbox or live

    if (!paypalClientId || !paypalClientSecret) {
      throw new Error("PayPal credentials not configured");
    }

    const paypalBaseUrl = paypalEnvironment === "live" 
      ? "https://api-m.paypal.com" 
      : "https://api-m.sandbox.paypal.com";

    // Create Supabase client for authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { tier } = await req.json();
    if (!tier || !['pro', 'premium'].includes(tier)) {
      throw new Error("Invalid subscription tier");
    }

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

    // Define subscription plans
    const plans = {
      pro: {
        name: "Zakerah Pro Plan",
        description: "Multi-format knowledge capture, advanced AI brainstorming, higher precision retrieval",
        amount: "19.00", // $19/month
        currency: "USD"
      },
      premium: {
        name: "Zakerah Premium Plan", 
        description: "All Pro features with highest limits, early access to beta features",
        amount: "30.00", // $30/month
        currency: "USD"
      }
    };

    const selectedPlan = plans[tier as keyof typeof plans];

    // Create PayPal subscription
    const subscriptionPayload = {
      plan_id: `zakerah-${tier}-monthly`, // You'll need to create these plans in PayPal dashboard
      subscriber: {
        email_address: user.email,
        name: {
          given_name: user.user_metadata?.display_name?.split(' ')[0] || "User",
          surname: user.user_metadata?.display_name?.split(' ')[1] || ""
        }
      },
      application_context: {
        brand_name: "Zakerah Knowledge Forge",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
        },
        return_url: `${req.headers.get("origin")}/subscription-success`,
        cancel_url: `${req.headers.get("origin")}/subscription-cancelled`
      }
    };

    const subscriptionResponse = await fetch(`${paypalBaseUrl}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(subscriptionPayload)
    });

    if (!subscriptionResponse.ok) {
      const errorText = await subscriptionResponse.text();
      logStep("PayPal subscription creation failed", { error: errorText });
      throw new Error(`Failed to create PayPal subscription: ${errorText}`);
    }

    const subscriptionData = await subscriptionResponse.json();
    logStep("PayPal subscription created", { subscriptionId: subscriptionData.id });

    // Find approval URL
    const approvalUrl = subscriptionData.links?.find((link: any) => link.rel === 'approve')?.href;
    if (!approvalUrl) {
      throw new Error("No approval URL found in PayPal response");
    }

    // Update subscriber table with pending subscription
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseService.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: subscriptionData.id, // Using this field for PayPal subscription ID
      subscribed: false, // Will be updated via webhook when payment is confirmed
      subscription_tier: tier === 'pro' ? 'Pro' : 'Premium',
      subscription_end: null, // Will be set when subscription is active
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    logStep("Database updated with pending subscription");

    return new Response(JSON.stringify({ 
      url: approvalUrl,
      subscriptionId: subscriptionData.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-paypal-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});