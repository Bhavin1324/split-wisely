# Comprehensive Project Architecture & Handover Context: Centfolio

This document serves as the master architectural reference, domain knowledge base, and exhaustive historical record of all systems, decisions, and constraints for **Centfolio** (formerly SplitWisely).

---

## 1. Project Overview & Identity

* **Application Name**: Centfolio (Smart Expense Splitting & Personal Finance Ledger)
* **Target Audience**: Friends, roommates, travel groups, and individuals managing shared expenses and personal debit/credit ledgers.
* **Platforms**:
  * **Web & Progressive Web App (PWA)**: Deployed on Vercel (`split-wisely.vercel.app`), standalone mobile installation, service worker offline caching.
  * **Capacitor Mobile App (Android / iOS)**: Native hybrid React app sharing the same backend, real-time sync, and native Android SMS Auto-Ledger parser.
* **Unified Supabase Backend**: Project `kvddxuxnyhqxmmmfetvn` (PostgreSQL 17.6.1 in region `ap-northeast-1`).

---

## 2. Core Architectural Pillars

### A. Centralized Design System & Theming
* **Tailwind Semantic Variables**: Centralized in `tailwind.config.js` and `src/index.css` using CSS custom properties (`--color-bg-base`, `--color-bg-surface`, `--color-primary-500`, `--color-text-base`, etc.).
* **Ant Design Dark Mode Adaptation**: Overridden via `.ant-app` global selectors so AntD components (Modals, Drawers, Dropdowns, DatePickers) seamlessly adapt to dark/light theme tokens without complex JS configurations.
* **Dynamic Theme Context**: `ThemeContext.tsx` handles theme switches with safe migration fallbacks from legacy `splitwisely_*` localStorage keys to `centfolio_*`.

### B. Group Debt & Financial Engine
* **Mathematical Debt Simplification (`DebtSimplifier.ts`)**: Cyclic graph minimization engine simplifying mutual group debts into the minimal number of direct P2P transactions without losing a single cent.
* **Cross-Group Settlement Netting (`AUTO_ALL`)**: Intercepts reciprocal debts across groups and accurately distributes payments into individual group ledgers, prohibiting orphaned `group_id = NULL` records.
* **Audit Timeline (`group_activities`)**: Append-only activity log tracking `EXPENSE_CREATED`, `EXPENSE_UPDATED`, `EXPENSE_DELETED`, `SETTLEMENT_RECORDED`, `SETTLEMENT_DELETED`, `MEMBER_ADDED`, `MEMBER_REMOVED`, and `GROUP_UPDATED`.

### C. Indian UPI Payments & Settlement Invariants
* **NPCI / Web Browser P2P Limitation**: Under NPCI anti-phishing guidelines, web browsers triggering `upi://pay` deep links to personal VPAs (P2P) are blocked by UPI apps (GPay, PhonePe, Paytm).
* **Centfolio Solution**:
  1. High-contrast **on-screen dynamic UPI QR Code** (auto-populated with exact payee VPA, amount, and transaction note).
  2. **1-Tap "Copy UPI ID"** action.
  3. **"Save QR to Gallery"** download option.
* **BHIM UPI Character Sanitization**: Strict `encodeUpiParam` wrapper stripping non-alphanumeric characters to prevent parser errors in Indian banking apps.

### D. Push Notifications & PWA Lifecycle
* **Push Notification Stack**: Web Push API (VAPID) + Supabase Edge Function (`send-push`) + Postgres `email_notifications` queue.
* **Unblocking Guide Modal**: Step-by-step instructions for Android (App Info ℹ️ shortcut & address bar permissions) and iOS (Settings $\to$ Centfolio $\to$ Notifications).
* **Browser Permission Invariant**: Once `Notification.permission === 'denied'`, browsers never show the native prompt again. The app directs users to App Info / Site Settings and provides an interactive retry button.

### E. Database Security & Encryption
* **Encrypted UPI Storage (`profiles_base` & `public.profiles`)**: UPI IDs are encrypted at rest using `pgcrypto` (`pgp_sym_encrypt`).
* **`SECURITY INVOKER` View (`public.profiles`)**: Configured with `with (security_invoker = true)` to ensure all client queries strictly respect Row Level Security (RLS) policies on `profiles_base`.

---

## 3. Database Schema (24 Tables & Views)

```
public.profiles_base (id, full_name, avatar_url, default_currency, upi_id_encrypted, created_at)
  └── public.profiles (VIEW: with transparent pgp_sym_decrypt and security_invoker = true)
public.groups (id, name, type, currency_code, created_by, simplify_debts, created_at, updated_at)
public.group_members (id, group_id, user_id, joined_at)
public.group_invitations (id, group_id, invited_by, email, token, status, created_at)
public.group_activities (id, group_id, actor_id, action_type, description, metadata, created_at)
public.categories (id, name, icon, is_system, created_at)
public.expenses (id, group_id, category_id, description, total_amount, currency_code, exchange_rate, base_currency_amount, payer_id, receipt_image_url, created_by, expense_date, created_at, updated_at)
public.expense_splits (id, expense_id, user_id, amount_owed, created_at)
public.expense_comments (id, expense_id, user_id, comment, created_at)
public.settlements (id, group_id, payer_id, payee_id, amount, currency_code, payment_method, notes, source_account_id, destination_account_id, created_at)
public.user_friends (id, user_id, friend_id, status, created_at)
public.friends (id, user_id_1, user_id_2, balance, created_at)
public.notifications (id, user_id, title, message, type, is_read, link_url, created_at)
public.email_notifications (id, recipient_user_id, recipient_email, notification_type, subject, body_json, status, attempts, error_message, created_at, processed_at)
public.push_subscriptions (id, user_id, endpoint, keys, created_at)
public.app_settings (key, value, description, updated_at)
public.user_accounts (id, user_id, name, type, balance, currency_code, account_number, is_active, created_at, updated_at)
public.personal_transactions (id, user_id, account_id, category_id, amount, transaction_type, description, transaction_date, is_recurring, created_at, updated_at)
public.personal_budgets (id, user_id, category_id, amount, period, start_date, created_at, updated_at)
public.recurring_bills (id, user_id, account_id, category_id, name, amount, frequency, next_due_date, is_active, auto_pay, created_at, updated_at)
public.activity_logs (id, group_id, user_id, action_type, metadata, created_at)
public.receipt_items (id, expense_id, name, price, quantity, created_at)
public.item_assignments (id, item_id, user_id, created_at)
public.default_splits (id, group_id, user_id, percentage, share, created_at)
```

---

## 4. Mobile App (Capacitor) Roadmap & Invariants

* **Shared Backend**: Capacitor Mobile connects to `https://kvddxuxnyhqxmmmfetvn.supabase.co` on the `public` schema.
* **SMS Auto-Ledger Ingestion**: Android SMS reader parses bank debit/credit text and directly inserts into `public.personal_transactions`, syncing instantly to both Web and Mobile.
* **Auth Scheme**: Custom redirect scheme `centfolio://auth/callback` added to Supabase Redirect URLs.
