# Centralized Theme Architecture

This document serves as a comprehensive guide for developers working on Centfolio. It explains how our centralized theme system works, how to interact with it, and how to scale it by adding new color tokens or entirely new themes.

## 1. Core Philosophy

Our design system strictly separates **color definitions** from **UI components**. 
We do not hardcode colors (e.g., `#FF5733` or `text-blue-500`) directly inside React components. Instead, we use **Semantic CSS Variables** injected into Tailwind CSS.

This architecture ensures:
- **Instant Theme Switching**: Changing a theme instantly updates the entire app without React re-renders, as it relies on CSS variable swapping.
- **Single Source of Truth**: All colors are defined in one place (`src/index.css`).
- **Framework Agnostic**: Ant Design and Tailwind CSS both read from the exact same variables, guaranteeing pixel-perfect consistency across standard HTML and 3rd-party UI components.

---

## 2. The Mechanics (How it Works)

The theme engine relies on three main pillars:

### Pillar A: CSS Variables (`src/index.css`)
This is the root of the system. We define default variables in the `:root` pseudo-class (Light Mode).
When the user switches themes, we apply a data attribute to the `<html>` tag (e.g., `<html data-scheme="dark">`). We then override the variables inside a `[data-scheme="dark"]` CSS block.

```css
/* src/index.css */
:root {
  --color-bg-base: #ffffff;
  --color-text-base: #0f172a;
}

[data-scheme="dark"] {
  --color-bg-base: #0f172a;
  --color-text-base: #f8fafc;
}
```

### Pillar B: Tailwind Configuration (`tailwind.config.js`)
Tailwind is configured to consume these CSS variables. We map semantic names to our CSS variables so developers can use standard Tailwind utility classes.

```javascript
/* tailwind.config.js */
module.exports = {
  theme: {
    extend: {
      colors: {
        'bg-base': 'var(--color-bg-base)',
        'text-base': 'var(--color-text-base)',
      }
    }
  }
}
```
*Usage in React*: `<div className="bg-bg-base text-text-base">Hello</div>`

### Pillar C: Ant Design Specificity Bypass
Ant Design injects its own hardcoded styles that often conflict with Tailwind. To force Ant Design components to obey our theme, we wrap our app in a `.ant-app` class and strictly override AntD's variables using our CSS variables.

```css
/* src/index.css */
.ant-app {
  color: var(--color-text-base) !important;
  background-color: var(--color-bg-base) !important;
}
```

---

## 3. Guide: Adding a New Color Token

If you need a new semantic color (e.g., a special color for a "Premium" badge), follow these 2 steps:

**Step 1: Define the variable in `src/index.css`**
Add the variable to both the `:root` (light) and `[data-scheme="dark"]` blocks.
```css
:root {
  /* ... existing vars */
  --color-premium-bg: #fef08a; /* Yellow for light mode */
}

[data-scheme="dark"] {
  /* ... existing vars */
  --color-premium-bg: #854d0e; /* Dark gold for dark mode */
}
```

**Step 2: Map it in `tailwind.config.js`**
```javascript
theme: {
  extend: {
    colors: {
      // ... existing colors
      'premium-bg': 'var(--color-premium-bg)',
    }
  }
}
```
**Result**: You can now use `className="bg-premium-bg"` anywhere in the app!

---

## 4. Guide: Adding an Entirely New Theme

Adding a new theme (like a high-contrast "Dracula" theme) is incredibly simple because the components themselves never need to change.

**Step 1: Create the new scheme block in `src/index.css`**
Just duplicate the `:root` block, change the selector to your new scheme name, and replace the hex codes!
```css
[data-scheme="dracula"] {
  --color-bg-base: #282a36;
  --color-bg-surface: #44475a;
  --color-text-base: #f8f8f2;
  --color-text-muted: #6272a4;
  --color-primary-500: #ff79c6; /* Pink accent */
  --color-border-base: #6272a4;
  /* ... map all required variables */
}
```

**Step 2: Update the Theme Switcher Logic**
Find your theme toggle logic (usually in a Context or Layout file) and allow it to set the `<html>` attribute to `"dracula"`.

```typescript
// Example Theme Toggle
const enableDraculaTheme = () => {
  document.documentElement.setAttribute('data-scheme', 'dracula');
};
```
*That's it! Every component, tailwind class, and AntD override will instantly adapt to the Dracula colors.*

---

## 5. Golden Rules for Developers

1. **NO HARDCODED HEX CODES**: Never write `text-[#FF0000]` or `style={{ color: '#000' }}` in a `.tsx` file.
2. **NO HARDCODED TAILWIND COLORS**: Avoid `bg-blue-500` unless it specifically maps to a semantic brand color that *should not* change in dark mode. Always prefer semantic names like `bg-primary-500` or `bg-bg-surface`.
3. **RESPECT THE CONTRAST**: Whenever you add a new token to `:root`, you *must* add its equivalent to `[data-scheme="dark"]`. If you forget, the token will fallback to the light mode color in dark mode, ruining the UI contrast.
