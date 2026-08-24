import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import webpush from "npm:web-push@3.6.7";

// Suppress TypeScript errors for Deno global
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let body: any = {};
    const rawText = await req.text();
    if (rawText && rawText.trim().length > 0) {
      try {
        body = JSON.parse(rawText);
        if (typeof body === "string") {
          body = JSON.parse(body);
        }
      } catch (parseErr) {
        console.warn("Raw body JSON parse note:", parseErr);
      }
    }

    const userIdsRaw = body.user_ids || body.userIds || [];
    const user_ids = Array.isArray(userIdsRaw) ? userIdsRaw : [userIdsRaw];
    const { title, message, url, tag } = body;

    if (!user_ids || user_ids.length === 0 || !user_ids[0]) {
      return new Response(
        JSON.stringify({
          sent: 0,
          message: "No user_ids provided in request payload",
          received: body,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const vapidPublicKey =
      Deno.env.get("VAPID_PUBLIC_KEY") ||
      "BLsaw4Vb8m0TfTm9jCq-0sCI3aj3gXgTNZMGa-m1wz-m-UVQEjYAwLmML8-biwBYdYXTkfQp_AYm3yKJyKxOSEs";
    const vapidPrivateKey =
      Deno.env.get("VAPID_PRIVATE_KEY") ||
      "dwCjMJ2nPzzD1bh2Lea8ge7FLpordLKVD2QNOmOj770";
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@splitwisely.app";

    try {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    } catch (vapidErr) {
      console.warn("VAPID details setup note:", vapidErr);
    }

    // 1. Fetch active push subscriptions for target users
    const { data: subscriptions, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .in("user_id", user_ids);

    if (error) {
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({
          sent: 0,
          total: 0,
          target_users: user_ids,
          message: "No active push subscriptions found for target users",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // 2. Prepare payload
    const payload = JSON.stringify({
      title: title || "SplitWisely",
      body: message || "You have a new update in SplitWisely.",
      icon: "/pwa-icon.jpg",
      badge: "/pwa-icon.jpg",
      url: url || "/dashboard",
      tag: tag || "splitwisely-update",
    });

    // 3. Dispatch web push notifications
    let successfulDispatches = 0;
    const deliveryResults: any[] = [];
    const sendPromises = subscriptions.map(async (sub: any) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };
        const res = await webpush.sendNotification(pushSubscription, payload);
        successfulDispatches++;
        deliveryResults.push({ endpoint: sub.endpoint, status: res?.statusCode || 201 });
      } catch (err: any) {
        deliveryResults.push({
          endpoint: sub.endpoint,
          statusCode: err.statusCode,
          error: err.message,
          body: err.body,
        });
        // Prune expired or invalid subscriptions (HTTP 404 / 410 Gone)
        if (err.statusCode === 404 || err.statusCode === 410) {
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successfulDispatches,
        total: subscriptions.length,
        target_users: user_ids,
        results: deliveryResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err: any) {
    console.error("send-push Edge Function error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
