# Project Rules & Guidelines (AGY.md)

## 1. Tech Stack & Architecture
- **Frameworks & Libraries**: React 18 (Vite), TypeScript, Tailwind CSS, Ant Design (AntD), Supabase (Backend & Auth), Lucide React (Icons).
- **Architecture**: Single Page Application (SPA) configured as a Progressive Web App (PWA). Global states managed via React Context (`AppDataContext`, `ThemeContext`, `AuthContext`).
- **Folder Structure Conventions**:
  - `src/components/`: Reusable, stateless UI components. Grouped by feature domain (e.g., `src/components/group/`).
  - `src/hooks/`: Custom business logic, specifically `supabase/` for DB interactions and real-time subscriptions.
  - `src/layouts/`: Global layout shells (e.g., `AppLayout.tsx`) managing navigation and root-level overlays.
  - `src/pages/`: Top-level route components acting as orchestrators.

## 2. Coding Standards
- **Naming Conventions**: Use `PascalCase` for components and interfaces. Use `camelCase` for functions, hooks, and variables.
- **Component Modularity**: 
  - Keep components strictly under 300 lines. 
  - Employ the Orchestrator Pattern: Complex pages (like `GroupDetailPage.tsx`) must delegate all UI rendering to imported sub-components.
- **Error Handling**: Use React Error Boundaries globally. Avoid silent failures; surface errors gracefully using Ant Design's `App.useApp().message` API.
- **TypeScript**: Enforce strict typings. Minimize the use of `any`.
- **Hybrid Data Pipelines**: For full-stack intelligence and cross-ledger metrics, mathematically combine and normalize Personal Tracked transactions with explicit Group Split liabilities (`ExpenseSplit.amount_owed`) into unified interfaces. Prevent data silos by treating net group shares and standalone personal transactions identically downstream.

## 3. UI/UX & Design System Guidelines
- **Centralized Theming**: 
  - Absolutely NO hardcoded hex colors or generic Tailwind color palettes (e.g., `bg-white`, `bg-[#1a1a1a]`, `amber-500`, `orange-600`, `rose-400`, `emerald-500`, `slate-900`). 
  - Always consume semantic CSS variables and tokens from `src/index.css`:
    - Surfaces: `bg-bg-base`, `bg-bg-surface`, `bg-bg-surface-hover` / `bg-bg-subtle`
    - Typography: `text-text-main` / `text-text-base`, `text-text-muted`
    - Borders: `border-border-subtle` / `border-border-base`
    - Accents: `var(--color-primary-500)`, `var(--color-danger-500)`, `var(--color-success-500)`, `var(--color-warning-500)`
  - **Semantic Tokens Only**: Never use generic color palettes like `emerald-500`, `rose-500`, or `amber-500`. 
    - For positive/success: use `var(--color-success-*)`
    - For negative/danger: use `var(--color-danger-*)`
    - For warning/caution: use `var(--color-warning-*)`
- **Financial Monospaced Typography**:
  - All monetary values, financial balances, daily safe limits, and amount inputs in accounting/ledger modules MUST use `.font-financial` (`font-family: var(--font-mono); font-variant-numeric: tabular-nums;`).
- **Number Input Cleanliness**:
  - All financial number input fields must suppress native browser spin buttons (`▲ / ▼`) and AntD handler buttons using `controls={false}` and global CSS spinner suppression.
- **Component Conventions**: 
  - Prioritize Ant Design primitives, but overwrite their aesthetics using the `.ant-app` CSS global overrides to perfectly align with our brand identity across Light/Dark modes.
- **Layout & Visuals**:
  - Rely on structural whitespace (padding/margins) rather than visible borders.
  - Keep interfaces flat. Never nest more than two cards deep. 
  - Forbidden tropes: Do not overuse Dashboards, Bento boxes, or apply purple-on-dark motifs.
- **Chart Visual Cleanliness & Accessibility (Recharts)**:
  - In `<BarChart>`, suppress the default muddy grey cursor backdrop by adding `cursor={false}` to `<RechartsTooltip />`.
  - Suppress browser SVG click/tap black focus rings on all chart containers by applying:
    `select-none outline-none focus:outline-none focus-visible:outline-none [&_.recharts-surface]:outline-none [&_.recharts-wrapper]:outline-none [&_svg]:outline-none [&_*]:focus:outline-none`.
- **Layman-First Financial Terminology**:
  - Never use corporate accounting jargon. Always use plain-English conversational labels:
    - `Your True Spend` (not *Total Net Cost* or *Net Consumption*)
    - `Paid from Pocket` (not *Cash Outlay* or *Disbursement*)
    - `Month-End Forecast` (not *Projected Run-Rate*)
    - `Spending Pace` (not *Velocity*)
    - `Biggest Expenses` (not *Top Outliers*)
- **Hero KPI Cards & Actionable Affordances**:
  - Avoid "false affordances": Any card with hover lift (`hover:-translate-y-0.5`, `hover:shadow-lg`) must have an active `onClick` shortcut leading to the relevant actionable view (e.g., *You have to pay* $\to$ `/friends?filter=you_owe`, *You will receive* $\to$ `/friends?filter=owes_you`, *Total Balance* $\to$ `/spending`).
- **Interactive Call-To-Actions (CTAs)**:
  - Avoid styling actionable buttons like informational tags/badges (e.g., flat `py-1 rounded-full bg-primary/10` without hover states).
  - Ensure all primary buttons provide distinct tactile micro-interactions (`active:scale-[0.97]`), clear hover transitions (`transition-all duration-150`), and accessibility rings (`focus:ring-2 focus:outline-none`).
  - Avoid raw text characters for icons (e.g., `+` or `<`); strictly import and use SVG icons from `lucide-react`.
- **Responsiveness**: Rely on Tailwind's `sm:`, `md:`, and `lg:` breakpoints. Use `<Drawer placement="top">` for mobile overlays instead of cramped `<Popover>` or `<Dropdown>` menus to avoid spatial clipping.
- **Mobile Navigation Architecture**:
  - Bottom dock (`< 768px`): Strict 5-slot balanced grid `[ Dashboard | Friends | Central FAB | Personal | Analytics ]`.
  - Settings offload: `Settings` must never reside on the mobile bottom bar; place it in `SidebarDrawer.tsx`.
  - Sidebar Drawer: Explicit width `300px`, `placement="left"`, vertical flex layout with Header, scrollable Body, and fixed User Profile Footer (`pb-6`).
  - Scroll Clearance: Mobile page wrappers must include `pb-32 md:pb-6` padding to prevent floating dock occlusion.
- **Mobile Bottom Sheet Pattern**:
  - All mobile full-sheet overlays MUST use `createPortal(..., document.body)` to escape ancestor CSS `transform`, `overflow`, or `perspective` stacking traps.
  - Wire gesture drag-to-dismiss via `useBottomSheetDismiss` hook (`src/hooks/useBottomSheetDismiss.ts`). 
  - Use universal `PointerEvent` API (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`) with `target.setPointerCapture(e.pointerId)`. NEVER use `TouchEvent` alone since it silently fails on desktop DevTools, mouse, and stylus.
  - Desktop equivalent (>= 640px) must render as a centered `<Modal>`.

## 4. Key Commands
- **Install Dependencies**: `npm install`
- **Run Local Development Server**: `npm run dev`
- **Build for Production**: `npm run build` (Executes `tsc -b && vite build`)
- **Lint Code**: `npm run lint`

## 5. Constraints & Non-Negotiables
- **Dark Mode Constraint**: Handled exclusively via the `<html data-scheme="dark">` attribute. Never manipulate the AntD `ConfigProvider` dynamically in JS for theme switching.
- **Currency Integer Storage Invariant**: Database amounts must ALWAYS be stored as integer cents/paisa (`BIGINT`). Multiply by 100 before persisting, divide by 100 for display (`cents / 100`).
- **PWA Clipboard Synchronous Invariant**: When copying values displayed in rendered textboxes (such as UPI IDs / VPAs), avoid solely relying on async `navigator.clipboard.writeText()` because promise resolution destroys the browser's transient user activation token. Always use synchronous DOM selection (`input.focus()`, `input.select()`, `document.execCommand('copy')`) on the rendered `<input ref={...} />` to guarantee 100% clipboard success on standalone PWAs and mobile browsers.
- **UPI Deep Link Strictness**: The BHIM UPI parser is exceptionally strict. It is **mandatory** to use the `encodeUpiParam` wrapper to strip all non-alphanumeric characters (like URL-encoded spaces `%20` or `+`) from Payee Name (`pn`) and Transaction Note (`tn`) before generating `upi://pay` links.
- **Data Persistence (Soft Clears)**: Non-critical items (like seen notifications) must be hidden via a "Soft Clear" local mechanism (using `localStorage` state like `clearedUntil`) rather than executing permanent `DELETE` queries on the database. 
- **Modal Context**: Always wrap interactive triggers using `App.useApp()` from Ant Design to ensure dynamically generated modals inherit the correct DOM context for theming.
- **PostgREST Foreign Key Relations**: Columns intended for `profiles` joins must have foreign keys referencing `public.profiles(id)` with explicit constraint naming, followed by `NOTIFY pgrst, 'reload schema';` in migrations to avoid `PGRST200` errors.
- **CONTEXT.md Updates**: Do NOT automatically propose or execute updates to `CONTEXT.md` after completing features. Only update it if the user explicitly requests it.
- **Historical Ledger Queries**: Do NOT derive opening balances or historical metrics by fetching unbounded transaction histories to the client. Always rely on snapshotted ledger boundaries (e.g., an explicit `opening_balance` database column) to prevent O(n) performance degradation and memory bloat.

