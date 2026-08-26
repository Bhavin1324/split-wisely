# Centfolio — Smart Expense Splitting & Personal Finance Ledger

Centfolio is a high-performance, real-time shared expense management and personal financial tracking platform built with React 19, TypeScript, Tailwind CSS, Ant Design, and Supabase.

---

## 🌟 Key Features

* **Smart Group Splitting**: Split bills equally, by exact amounts, percentages, or custom shares.
* **Mathematical Debt Simplification**: Graph minimization engine that condenses mutual debts into the minimal number of direct settlements.
* **Unified Cross-Group Netting (`AUTO_ALL`)**: Settle balances across multiple groups in a single click without orphaned ledger records.
* **Personal Finance Ledger**: Track individual income, bank accounts, monthly category budgets, and recurring bills.
* **Indian UPI Integration**: Dynamic on-screen QR Code generation, 1-tap UPI ID copy, and sanitized payment payloads.
* **Activity Audit Timeline**: Real-time append-only history of group actions, expense creations, edits, and settlement deletions.
* **Push Notifications & Email Dispatch**: Background Web Push and automated transactional emails powered by Supabase Edge Functions.
* **Dark & Light Mode**: Seamless theming powered by semantic CSS custom properties and custom Ant Design overrides.
* **Progressive Web App (PWA)**: Installable on Android, iOS, and Desktop with offline caching.

---

## 🛠️ Technology Stack

* **Frontend**: React 19, TypeScript, Vite 8, React Compiler (`@rolldown/plugin-babel`), Tailwind CSS 4, Ant Design 6, Lucide Icons.
* **Backend & Database**: Supabase PostgreSQL 17 (24 tables, `SECURITY INVOKER` views, `pgcrypto` encryption, Row Level Security).
* **Serverless Functions**: Deno Supabase Edge Functions (`email-notifier`, `send-push`).
* **Testing**: Vitest unit test suite.

---

## 🚀 Quick Start

### 1. Prerequisites
* Node.js 20+
* npm or pnpm

### 2. Installation
```bash
git clone https://github.com/Bhavin1324/split-wisely.git
cd split-wisely
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### 4. Development & Build Commands
```bash
# Start local dev server with HTTPS (SSL enabled)
npm run dev

# Run unit tests
npm test

# Build for production with service worker generation
npm run build
```

---

## 📖 Architecture & Documentation

* **[CONTEXT.md](CONTEXT.md)**: Master project history, design system, debt engine, and domain invariants.
* **[Push Notification Architecture](docs/Push_Notification_Architecture.md)**: Web Push API, Edge Functions, and VAPID setup.
* **[Theme Architecture](docs/Theme_Architecture.md)**: Semantic CSS tokens and Ant Design dark-mode integration.
* **[Debt Calculation Logic](docs/debt-calculation-logic.md)**: Mathematical proofs and greedy graph minimization algorithm.
