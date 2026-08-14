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

## 3. UI/UX & Design System Guidelines
- **Centralized Theming**: 
  - Absolutely NO hardcoded hex colors or generic Tailwind color palettes (e.g., `bg-white`, `bg-[#1a1a1a]`, `amber-500`, `orange-600`, `rose-400`, `emerald-500`, `slate-900`). 
  - Always consume semantic CSS variables and tokens from `src/index.css`:
    - Surfaces: `bg-bg-base`, `bg-bg-surface`, `bg-bg-surface-hover` / `bg-bg-subtle`
    - Typography: `text-text-main` / `text-text-base`, `text-text-muted`
    - Borders: `border-border-subtle` / `border-border-base`
    - Accents: `var(--color-primary-500)`, `var(--color-danger-500)`, `var(--color-success-500)`
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
- **Responsiveness**: Rely on Tailwind's `sm:`, `md:`, and `lg:` breakpoints. Use `<Drawer placement="top">` for mobile overlays instead of cramped `<Popover>` or `<Dropdown>` menus to avoid spatial clipping.
- **Mobile Navigation Architecture**:
  - Bottom dock (`< 768px`): Strict 5-slot balanced grid `[ Dashboard | Friends | Central FAB | Personal | Analytics ]`.
  - Settings offload: `Settings` must never reside on the mobile bottom bar; place it in `SidebarDrawer.tsx`.
  - Sidebar Drawer: Explicit width `300px`, `placement="left"`, vertical flex layout with Header, scrollable Body, and fixed User Profile Footer (`pb-6`).
  - Scroll Clearance: Mobile page wrappers must include `pb-32 md:pb-6` padding to prevent floating dock occlusion.

## 4. Key Commands
- **Install Dependencies**: `npm install`
- **Run Local Development Server**: `npm run dev`
- **Build for Production**: `npm run build` (Executes `tsc -b && vite build`)
- **Lint Code**: `npm run lint`

## 5. Constraints & Non-Negotiables
- **Dark Mode Constraint**: Handled exclusively via the `<html data-scheme="dark">` attribute. Never manipulate the AntD `ConfigProvider` dynamically in JS for theme switching.
- **Currency Integer Storage Invariant**: Database amounts must ALWAYS be stored as integer cents/paisa (`BIGINT`). Multiply by 100 before persisting, divide by 100 for display (`cents / 100`).
- **UPI Deep Link Strictness**: The BHIM UPI parser is exceptionally strict. It is **mandatory** to use the `encodeUpiParam` wrapper to strip all non-alphanumeric characters (like URL-encoded spaces `%20` or `+`) from Payee Name (`pn`) and Transaction Note (`tn`) before generating `upi://pay` links.
- **Data Persistence (Soft Clears)**: Non-critical items (like seen notifications) must be hidden via a "Soft Clear" local mechanism (using `localStorage` state like `clearedUntil`) rather than executing permanent `DELETE` queries on the database. 
- **Modal Context**: Always wrap interactive triggers using `App.useApp()` from Ant Design to ensure dynamically generated modals inherit the correct DOM context for theming.
- **PostgREST Foreign Key Relations**: Columns intended for `profiles` joins must have foreign keys referencing `public.profiles(id)` with explicit constraint naming, followed by `NOTIFY pgrst, 'reload schema';` in migrations to avoid `PGRST200` errors.

