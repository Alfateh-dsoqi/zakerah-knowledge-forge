import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function for debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYPAL-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const paypalClientId = Deno.env.get("PAYPAL_CLIENT_ID");
    const paypalClientSecret = Deno.env.get("PAYPAL_CLIENT_SECRET");
    const paypalWebhookId = Deno.env.get("PAYPAL_WEBHOOK_ID");
    const paypalEnvironment = Deno.env.get("PAYPAL_ENVIRONMENT") || "sandbox";

    if (!paypalClientId || !paypalClientSecret) {
      throw new Error("PayPal credentials not configured");
    }

    const paypalBaseUrl = paypalEnvironment === "live" 
      ? "https://api-m.paypal.com" 
      : "https://api-m.sandbox.paypal.com";

    const body = await req.text();
    const webhookData = JSON.parse(body);
    
    logStep("Webhook data received", { 
      eventType: webhookData.event_type,
      resourceId: webhookData.resource?.id 
    });

    // Verify webhook signature if webhook ID is configured
    if (paypalWebhookId) {
      const headers = req.headers;
      const verificationPayload = {
        auth_algo: headers.get('paypal-auth-algo'),
        cert_id: headers.get('paypal-cert-id'),
        transmission_id: headers.get('paypal-transmission-id'),
        transmission_sig: headers.get('paypal-transmission-sig'),
        transmission_time: headers.get('paypal-transmission-time'),
        webhook_id: paypalWebhookId,
        webhook_event: webhookData
      };

      // Get PayPal access token for verification
      const authResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${paypalClientId}:${paypalClientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials'
      });

      if (authResponse.ok) {
        const authData = await authResponse.json();
        const accessToken = authData.access_token;

        const verifyResponse = await fetch(`${paypalBaseUrl}/v1/notifications/verify-webhook-signature`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(verificationPayload)
        });

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          if (verifyData.verification_status !== 'SUCCESS') {
            logStep("Webhook verification failed", verifyData);
            return new Response('Webhook verification failed', { status: 400 });
          }
          logStep("Webhook verified successfully");
        } else {
          logStep("Webhook verification request failed");
        }
      }
    }

    // Use service role key for database operations
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const eventType = webhookData.event_type;
    const resource = webhookData.resource;

    // Handle different webhook events
    switch (eventType) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        logStep("Subscription activated", { subscriptionId: resource.id });
        await handleSubscriptionActivated(supabaseClient, resource);
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        logStep("Subscription cancelled/suspended", { subscriptionId: resource.id });
        await handleSubscriptionCancelled(supabaseClient, resource);
        break;

      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        logStep("Payment failed", { subscriptionId: resource.id });
        await handlePaymentFailed(supabaseClient, resource);
        break;

      case 'BILLING.SUBSCRIPTION.RENEWED':
        logStep("Subscription renewed", { subscriptionId: resource.id });
        await handleSubscriptionRenewed(supabaseClient, resource);
        break;

      default:
        logStep("Unhandled webhook event", { eventType });
    }

    return new Response('Webhook processed', {
      headers: corsHeaders,
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in paypal-webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function handleSubscriptionActivated(supabaseClient: any, resource: any) {
  const subscriptionId = resource.id;
  const subscriberEmail = resource.subscriber?.email_address;
  
  if (!subscriberEmail) {
    logStep("No subscriber email found in activation webhook");
    return;
  }

  // Determine subscription tier from plan
  let subscriptionTier = 'Pro'; // default
  if (resource.plan_id?.includes('premium')) {
    subscriptionTier = 'Premium';
  }

  // Calculate subscription end date
  let subscriptionEnd = null;
  if (resource.billing_info?.next_billing_time) {
    subscriptionEnd = new Date(resource.billing_info.next_billing_time).toISOString();
  }

  await supabaseClient.from("subscribers").upsert({
    email: subscriberEmail,
    stripe_customer_id: subscriptionId,
    subscribed: true,
    subscription_tier: subscriptionTier,
    subscription_end: subscriptionEnd,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'email' });

  logStep("Subscription activated in database", { email: subscriberEmail, tier: subscriptionTier });
}

async function handleSubscriptionCancelled(supabaseClient: any, resource: any) {
  const subscriptionId = resource.id;
  
  await supabaseClient
    .from("subscribers")
    .update({
      subscribed: false,
      subscription_tier: null,
      subscription_end: null,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', subscriptionId);

  logStep("Subscription cancelled in database", { subscriptionId });
}

async function handlePaymentFailed(supabaseClient: any, resource: any) {
  // For now, just log the failure
  // You might want to send an email notification or update a payment status field
  logStep("Payment failure recorded", { subscriptionId: resource.id });
}

async function handleSubscriptionRenewed(supabaseClient: any, resource: any) {
  const subscriptionId = resource.id;
  
  // Update next billing date
  let subscriptionEnd = null;
  if (resource.billing_info?.next_billing_time) {
    subscriptionEnd = new Date(resource.billing_info.next_billing_time).toISOString();
  }

  await supabaseClient
    .from("subscribers")
    .update({
      subscribed: true,
      subscription_end: subscriptionEnd,
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', subscriptionId);

  logStep("Subscription renewed in database", { subscriptionId });
}