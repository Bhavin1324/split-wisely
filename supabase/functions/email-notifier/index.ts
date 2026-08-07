import { createClient } from 'npm:@supabase/supabase-js'
import nodemailer from 'npm:nodemailer'

// Suppress TypeScript errors in VS Code (runs in Deno runtime, not Node/Browser)
declare const Deno: any;

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const gmailUser = Deno.env.get('GMAIL_USER') ?? '';
const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Setup Gmail SMTP Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: gmailUser,
    pass: gmailPass,
  },
});

Deno.serve(async (req) => {
  try {
    // 1. Fetch unsent notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('email_notifications')
      .select('*')
      .eq('sent', false);

    if (fetchError) {
      throw fetchError;
    }

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ message: "No pending notifications" }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const processedIds = [];

    // 2. Process and send emails
    for (const notification of notifications) {
      const { id, recipient_email, subject, body_json, notification_type } = notification;

      let htmlContent = `<p>${subject}</p>`;
      let textContent = subject;
      
      if (notification_type === 'group_invitation' && body_json?.token) {
        // Build a proper HTML email for invites
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>You've been invited!</h2>
            <p>${body_json.inviter_name} has invited you to join the group <strong>${body_json.group_name}</strong> on SplitWisely.</p>
            <div style="margin: 30px 0;">
              <a href="https://expense-tracker.vercel.app/join?token=${body_json.token}" 
                 style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy this link: https://expense-tracker.vercel.app/join?token=${body_json.token}</p>
          </div>
        `;
        textContent = `You've been invited!\n\n${body_json.inviter_name} has invited you to join the group "${body_json.group_name}" on SplitWisely.\n\nAccept Invitation: https://expense-tracker.vercel.app/join?token=${body_json.token}`;
      }

      if (gmailUser && gmailPass) {
        try {
          await transporter.sendMail({
            from: gmailUser,
            replyTo: gmailUser,
            to: recipient_email,
            subject: subject,
            text: textContent,
            html: htmlContent,
          });
        } catch (emailErr) {
          console.error(`Failed to send email to ${recipient_email}:`, emailErr);
          continue; // Skip marking as sent if email failed to send
        }
      } else {
        console.log(`Mock sending email to ${recipient_email} - Subject: ${subject}`);
      }

      processedIds.push(id);
    }

    // 3. Mark as sent
    if (processedIds.length > 0) {
      const { error: updateError } = await supabase
        .from('email_notifications')
        .update({ sent: true })
        .in('id', processedIds);

      if (updateError) {
        console.error('Error updating notifications:', updateError);
        throw updateError;
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${processedIds.length} notifications`,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Function error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
