---
name: antd_theming
description: Guidelines for overriding Ant Design styles using our centralized Tailwind theme architecture.
---

# Ant Design Theming Workflow

## When to use this skill
Whenever you add a new Ant Design component (like Button, Modal, Drawer, Dropdown) and need to ensure it complies with the Light/Dark theme.

## Execution Guidelines
1. **Never use inline styles or hardcoded Tailwind colors** for structural colors on AntD wrappers.
2. Rely on our global `.ant-app` CSS overrides in `src/index.css`.
3. If an AntD component looks broken in dark mode:
   - Identify the AntD CSS variable (e.g., `--ant-color-bg-elevated`).
   - Add a rule in `src/index.css` inside `[data-scheme="dark"]` to map it to our Tailwind variable:
     ```css
     [data-scheme="dark"] {
       --ant-color-bg-elevated: var(--color-surface-800);
     }
     ```
4. Always wrap interactive triggers in `<App>` context or use `App.useApp()` from `antd` to ensure modals inherit the DOM tree context for themes instead of rendering out-of-scope.
