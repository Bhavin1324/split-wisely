# Supabase Configuration

This directory contains the Supabase backend configuration and Edge Functions for the expense tracker.

## Edge Functions

### `email-notifier`

This edge function is responsible for checking the `email_notifications` table for unsent messages (`sent = false`), sending them using the Resend API, and marking them as `sent = true`.

#### Deploying Edge Functions

To deploy the `email-notifier` Edge Function, follow these steps:

1. **Install Supabase CLI:**
   Make sure you have the Supabase CLI installed.
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Set Secrets:**
   The function requires a Resend API key to send emails.
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key
   ```
   *Note: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically provided to Edge Functions by Supabase.*

5. **Deploy the function:**
   ```bash
   supabase functions deploy email-notifier
   ```

#### Invoking the function manually
You can invoke the deployed function using curl or Postman:
```bash
curl -L -X POST 'https://your-project-ref.supabase.co/functions/v1/email-notifier' \
-H 'Authorization: Bearer your-anon-key'
```
