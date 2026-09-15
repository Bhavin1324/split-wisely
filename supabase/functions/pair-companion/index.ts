import { createClient } from "npm:@supabase/supabase-js@2.39.3";

// Suppress TypeScript errors for Deno runtime
declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  const anonClient = createClient(supabaseUrl, supabaseAnonKey);

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "generate";

  try {
    let payload: any = {};
    const text = await req.text();
    if (text && text.trim().length > 0) {
      try {
        payload = JSON.parse(text);
      } catch (err) {
        console.warn("JSON parse error:", err);
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 1: GENERATE PAIRING TICKET (Called by PWA with Bearer Token)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "generate") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const jwt = authHeader.replace("Bearer ", "").trim();
      const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(jwt);

      if (userError || !userData?.user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized: Invalid user session." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const user = userData.user;
      const ticketToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes TTL

      // Clean up any existing unused tickets for this user
      await supabaseAdmin
        .from("companion_pairing_tickets")
        .delete()
        .eq("user_id", user.id)
        .eq("is_used", false);

      // Insert new single-use ticket
      const { error: insertError } = await supabaseAdmin
        .from("companion_pairing_tickets")
        .insert({
          ticket_token: ticketToken,
          user_id: user.id,
          user_email: user.email || "",
          expires_at: expiresAt,
          is_used: false,
        });

      if (insertError) {
        console.error("Failed to insert ticket:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to create pairing ticket.", details: insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          ticket: ticketToken,
          expires_at: expiresAt,
          expires_in_seconds: 300,
          user_id: user.id,
          email: user.email,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ACTION 2: REDEEM PAIRING TICKET (Called by Android App via centfolio://pair)
    // ──────────────────────────────────────────────────────────────────────────
    if (action === "redeem") {
      const ticket = (payload.ticket || url.searchParams.get("ticket") || "").trim();

      if (!ticket) {
        return new Response(
          JSON.stringify({ error: "Missing ticket parameter in request." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check ticket validity: must exist, not be used, and not expired
      const nowIso = new Date().toISOString();
      const { data: ticketRecord, error: ticketError } = await supabaseAdmin
        .from("companion_pairing_tickets")
        .select("*")
        .eq("ticket_token", ticket)
        .eq("is_used", false)
        .gt("expires_at", nowIso)
        .maybeSingle();

      if (ticketError || !ticketRecord) {
        return new Response(
          JSON.stringify({
            error: "Pairing ticket is invalid, expired, or has already been used. Please generate a new QR code.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Invalidate ticket immediately to enforce strictly single-use
      await supabaseAdmin
        .from("companion_pairing_tickets")
        .update({ is_used: true })
        .eq("id", ticketRecord.id);

      const email = ticketRecord.user_email;
      if (!email) {
        return new Response(
          JSON.stringify({ error: "No email associated with pairing ticket." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mint a brand-new, independent session for this user without touching existing sessions
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: email,
      });

      if (linkError || !linkData?.properties?.email_otp) {
        console.error("Generate link failed:", linkError);
        return new Response(
          JSON.stringify({ error: "Failed to generate companion session credentials.", details: linkError?.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const otp = linkData.properties.email_otp;

      // Verify the generated OTP with anonClient to create an independent session
      const { data: sessionData, error: sessionError } = await anonClient.auth.verifyOtp({
        email: email,
        token: otp,
        type: "email",
      });

      if (sessionError || !sessionData?.session) {
        // Fallback retry with type: 'magiclink' if 'email' rejected
        const retry = await anonClient.auth.verifyOtp({
          email: email,
          token: otp,
          type: "magiclink",
        });

        if (retry.error || !retry.data?.session) {
          console.error("verifyOtp failed:", sessionError || retry.error);
          return new Response(
            JSON.stringify({ error: "Failed to verify independent companion session." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        return new Response(
          JSON.stringify({
            access_token: retry.data.session.access_token,
            refresh_token: retry.data.session.refresh_token,
            expires_in: retry.data.session.expires_in,
            token_type: retry.data.session.token_type,
            user: {
              id: retry.data.session.user.id,
              email: retry.data.session.user.email,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_in: sessionData.session.expires_in,
          token_type: sessionData.session.token_type,
          user: {
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unknown action '${action}'. Expected 'generate' or 'redeem'.` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Pair companion error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
