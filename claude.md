# Rem-E Design System Guide

This document serves as a comprehensive guide for understanding and working with the Rem-E design system. It outlines the core design principles, component usage, and styling conventions that must be followed in all future development.

---

## 🚨 CRITICAL: LLM Response Format Rules

**⚠️ MANDATORY: When working with LLM prompts and responses in this project:**

### JSON Response Rule
- **NEVER return JSON to the user** - Users should ONLY receive natural language responses
- LLMs should respond with plain text in Spanish, not JSON structures
- JSON is ONLY for internal system communication, never for user-facing responses

### Second Person Rule
- **Always use second person (tú/tienes/puedes)** when addressing the user
- **NEVER use first person (yo/tengo/necesito)** - the assistant should not speak as if it owns things
- The assistant is helping the USER, not talking about itself

**Examples:**

✅ **CORRECT:**
```
User: "¿Cuántos tomates tengo?"
Assistant: "Tienes 3 tomates en la alacena"
```

❌ **WRONG - JSON response:**
```
User: "¿Cuántos tomates tengo?"
Assistant: {"action": "getInventory", "user_message": "Tengo 3 tomates"}
```

❌ **WRONG - First person:**
```
User: "¿Cuántos tomates tengo?"
Assistant: "Tengo 3 tomates en la alacena"
```

### When Creating System Prompts:
Always include these reminders in LLM system prompts:
1. "Responde SOLO con texto natural en español, NUNCA con JSON"
2. "Usa segunda persona (tú/tienes/puedes), NO primera persona (yo/tengo)"
3. "Sé conciso y directo"

---

## 🎨 Design Philosophy

### iPad-Inspired Modern Minimalist Design
Rem-E follows an **iPad-style interface** with a focus on:
- **Large, visible, touch-friendly components** (minimum 48px touch targets)
- **Widget/card-based layouts** with prominent visual elements
- **Clean, spacious designs** with generous padding and spacing
- **Smooth animations and transitions** for a polished feel
- **Fresh, warm color palette** centered around pistachio green

---

## 🚫 CRITICAL: LIGHT THEME ONLY

**⚠️ IMPORTANT: Dark theme/dark mode is FORBIDDEN in this application.**

- The design system is built exclusively for **LIGHT THEME**
- All color variables, components, and styles are optimized for light backgrounds
- The warm, fresh aesthetic requires light backgrounds with soft, natural tones
- Do NOT implement dark mode toggles or dark theme variants
- The `@media (prefers-color-scheme: dark)` in theme.css is legacy code and should NOT be used

**When adding new styles:**
```css
/* ✅ CORRECT - Include light theme reminder */
/* IMPORTANT: These styles are designed for LIGHT THEME ONLY.
 * DO NOT use dark theme or dark mode for these components. */
.my-new-style {
  background-color: var(--color-primary);
}

/* ❌ WRONG - No dark mode variants */
@media (prefers-color-scheme: dark) {
  .my-new-style {
    background-color: #1A1A1A; /* DON'T DO THIS */
  }
}
```

---

## 🎨 Color System

### Primary Palette - Fresh Pistachio Green
```css
--color-primary: #97c28a;          /* Main brand color */
--color-primary-light: #F5FAF3;    /* Soft background tint */
--color-primary-dark: #8FC280;     /* Hover/active states */
```

### Secondary Palette - Complementary Greens
```css
--color-secondary: #5eac42;        /* Accent actions */
--color-secondary-light: #B8D9AA;  /* Light accents */
--color-secondary-dark: #7FB76D;   /* Dark accents */
```

### Background Gradients
```css
--color-background-gradient-start: #E8F5E3;
--color-background-gradient-middle: #F5FBF2;
--color-background-gradient-end: #D4ECC8;
```

### Glassmorphism Effects
```css
--glass-bg: rgba(255, 255, 255, 0.35);
--glass-bg-hover: rgba(255, 255, 255, 0.45);
--glass-border: rgba(255, 255, 255, 0.25);
--glass-shadow: rgba(171, 211, 159, 0.1);
--glass-blur: 20px;
```

### Optional Orange Theme
Available via `data-theme="orange"` attribute for alternate warm aesthetic.

---

## 📦 Core Components

### Card Component
The foundation of the widget-based layout system.

**Import:**
```tsx
import { Card } from '@/components/ui/Card';
```

**Variants:**
- `default` - Standard card with border
- `elevated` - Card with shadow and glassmorphism (recommended for main content)
- `outlined` - Emphasized border with backdrop blur
- `glass` - Full glassmorphism effect

**Padding Options:**
- `none` - No padding (for custom layouts)
- `sm` - 16px padding
- `md` - 24px padding (default)
- `lg` - 32px padding (recommended for iPad-style widgets)

**Usage Examples:**
```tsx
{/* Large widget card - iPad style */}
<Card variant="elevated" padding="lg" hoverable>
  <h3 className="text-2xl font-bold">Widget Title</h3>
  <p>Widget content...</p>
</Card>

{/* Hero card with custom background */}
<Card
  variant="elevated"
  padding="lg"
  hoverable
  className="home-hero-card"
>
  {/* Use home-hero-card class for primary background */}
</Card>

{/* Compact info card */}
<Card variant="outlined" padding="md">
  <span className="text-4xl">💡</span>
  <p>Tip content...</p>
</Card>
```

**Best Practices:**
- Use `padding="lg"` for main widget/tile layouts
- Add `hoverable` prop for interactive cards
- Combine with large icons (text-5xl to text-8xl) for iPad aesthetic
- Use `className` for additional customization, not inline styles

---

### Button Component
Touch-optimized buttons with generous sizing.

**Import:**
```tsx
import { Button } from '@/components/ui/Button';
```

**Variants:**
- `primary` - Main actions (pistachio green)
- `secondary` - Secondary actions (complementary green)
- `ghost` - Subtle actions with border
- `danger` - Destructive actions (red)

**Sizes:**
- `sm` - 40px min-height
- `md` - 48px min-height (default, touch-optimized)
- `lg` - 56px min-height
- `xl` - 64px min-height (recommended for primary CTAs)

**Usage Examples:**
```tsx
{/* Primary CTA - large and visible */}
<Button variant="primary" size="xl" fullWidth>
  Comenzar a Cocinar
</Button>

{/* With icon */}
<Button variant="primary" size="lg" icon={<span>🍽</span>} iconPosition="left">
  Ver Receta
</Button>

{/* Ghost button for secondary actions */}
<Button variant="ghost" size="md">
  Cancelar
</Button>
```

**Best Practices:**
- Use `size="lg"` or `size="xl"` for main actions
- Add icons for better visual recognition
- Use `fullWidth` for mobile/form buttons
- Prefer `primary` variant for main CTAs

---

### Badge Component
Small labels for metadata and status indicators.

**Import:**
```tsx
import { Badge } from '@/components/ui/Badge';
```

**Variants:**
- `default` - Neutral badge
- `success` - Positive indicators (green)
- `warning` - Caution indicators (orange)
- `error` - Error/alert states (red)
- `info` - Informational (pistachio)

**Usage Examples:**
```tsx
<Badge variant="info">⏱ 30m</Badge>
<Badge variant="success">👨‍🍳 Fácil</Badge>
<Badge variant="warning">🔥 Caliente</Badge>
```

**Best Practices:**
- Use emojis/icons for better visual communication
- Keep text short and concise
- Combine multiple badges for rich metadata
- Use semantic variants (success for difficulty, info for time, etc.)

---

## 🎯 Layout Patterns

### Widget/Tile Grid (Home Page Style)

**iPad-Style Grid Layout:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[minmax(140px,auto)] md:auto-rows-[minmax(240px,1fr)] gap-3 md:gap-5 lg:gap-6">
  {/* 2x2 Hero Tile */}
  <Link href="/action" className="col-span-2 row-span-2">
    <Card variant="elevated" padding="lg" hoverable className="h-full">
      {/* Large content */}
    </Card>
  </Link>

  {/* 1x1 Widget Tiles */}
  <Link href="/feature" className="col-span-1 row-span-1">
    <Card variant="elevated" padding="lg" hoverable className="h-full">
      <span className="text-6xl">🥫</span>
      <h3 className="text-xl font-semibold">Feature</h3>
    </Card>
  </Link>
</div>
```

**Key Principles:**
- Mobile: 2-column vertical layout
- Tablet+: 4-column grid with variable tile sizes
- Use `col-span-2 row-span-2` for hero/primary actions
- Use `col-span-1 row-span-1` for secondary features
- Always set `h-full` on cards in grid layouts
- Generous gaps (gap-5 on tablet, gap-6 on desktop)

---

## 📐 Spacing & Typography

### Spacing Scale
```css
--space-xs: 0.5rem;   /* 8px */
--space-sm: 1rem;     /* 16px */
--space-md: 1.5rem;   /* 24px */
--space-lg: 2rem;     /* 32px */
--space-xl: 3rem;     /* 48px */
--space-2xl: 4rem;    /* 64px */
```

**Usage:**
- Use generous spacing for iPad aesthetic
- Prefer `space-lg` and `space-xl` for main layouts
- Use `gap-lg` or `gap-xl` in flex/grid containers

### Typography Scale
```css
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */
--font-size-3xl: 2rem;      /* 32px */
--font-size-4xl: 2.5rem;    /* 40px */
```

**Responsive Typography:**
```tsx
{/* Scale up on larger screens */}
<h1 className="text-4xl md:text-6xl lg:text-7xl font-bold">
  Large Heading
</h1>

<p className="text-base md:text-lg lg:text-xl">
  Body text that scales
</p>

{/* Large icons for visual impact */}
<span className="text-5xl md:text-7xl lg:text-8xl">🍽</span>
```

---

## ✨ Animations & Transitions

### Available Animations
```css
/* Fade effects */
.animate-fadeIn
.animate-fadeInUp
.animate-fadeInDown

/* Slide effects */
.animate-slideInRight
.animate-slideInLeft

/* Scale effects */
.animate-scaleIn

/* Loading states */
.animate-pulse
.animate-spin
.animate-bounce

/* Staggered animations for lists */
.stagger-1  /* 50ms delay */
.stagger-2  /* 100ms delay */
.stagger-3  /* 150ms delay */
.stagger-4  /* 200ms delay */
.stagger-5  /* 250ms delay */
```

**Usage Examples:**
```tsx
{/* Hero card with scale animation */}
<Card className="animate-scaleIn">
  Hero content
</Card>

{/* Staggered list items */}
<Card className="animate-fadeInUp stagger-1">Item 1</Card>
<Card className="animate-fadeInUp stagger-2">Item 2</Card>
<Card className="animate-fadeInUp stagger-3">Item 3</Card>
```

---

## 🎨 Custom Styling Guidelines

### DO's ✅
1. **Use CSS classes defined in `styles/theme.css`**
   ```tsx
   <div className="home-hero-card">...</div>
   ```

2. **Use CSS variables for colors**
   ```css
   .my-component {
     background-color: var(--color-primary);
     color: var(--color-text-primary);
   }
   ```

3. **Add light theme comments to new styles**
   ```css
   /* IMPORTANT: Light theme only - do not use dark mode */
   .new-style { ... }
   ```

4. **Use responsive Tailwind classes**
   ```tsx
   <div className="text-base md:text-lg lg:text-xl">
   ```

5. **Combine utility classes for spacing**
   ```tsx
   <div className="p-4 md:p-6 lg:p-8">
   ```

### DON'Ts ❌
1. **Never use inline styles with style prop**
   ```tsx
   {/* ❌ WRONG */}
   <div style={{ backgroundColor: '#97c28a' }}>

   {/* ✅ CORRECT */}
   <div className="home-hero-card">
   ```

2. **Don't hardcode colors**
   ```css
   /* ❌ WRONG */
   .button { background: #97c28a; }

   /* ✅ CORRECT */
   .button { background: var(--color-primary); }
   ```

3. **Don't create dark theme styles**
   ```css
   /* ❌ FORBIDDEN */
   @media (prefers-color-scheme: dark) { ... }
   ```

4. **Don't use small touch targets**
   ```tsx
   {/* ❌ WRONG */}
   <button className="px-2 py-1">Tiny</button>

   {/* ✅ CORRECT */}
   <Button size="md">Touch-friendly</Button>
   ```

---

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile: 320px - 767px (default) */
/* Tablet: 768px - 1023px */
/* Desktop: 1024px+ */
```

### Responsive Utilities
```tsx
{/* Show only on mobile */}
<div className="mobile-only">Mobile content</div>

{/* Show on tablet and up */}
<div className="tablet-up">Tablet+ content</div>

{/* Show on desktop only */}
<div className="desktop-up">Desktop content</div>

{/* Custom responsive classes */}
<div className="block md:hidden">Mobile only</div>
<div className="hidden md:flex">Tablet+ flex</div>
```

### Touch-Friendly Guidelines
- Minimum touch target: **48px × 48px**
- Use `Button` component with size `md` or larger
- Generous spacing between interactive elements
- Large, clear icons and text
- Hover effects disabled on touch devices (handled automatically)

---

## 🏠 Home Page Specific Classes

### Hero Card
```tsx
<Card className="home-hero-card">
  {/* Primary color background for main CTA */}
</Card>
```

### Suggestion Image
```tsx
<div className="home-suggestion-image">
  {/* Primary color background for recipe images */}
</div>
```

---

## 🔧 MainLayout Component

**Import:**
```tsx
import { MainLayout } from '@/components/layout';
```

**Usage:**
```tsx
export default function MyPage() {
  return (
    <MainLayout>
      {/* Page content */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        {/* Main content area */}
      </div>
    </MainLayout>
  );
}
```

**Features:**
- Built-in navigation bar
- Safe area insets for mobile devices
- Proper flex layout for full-height pages
- Consistent padding and spacing

---

## 📝 Component Creation Checklist

When creating new components:

1. ✅ Use TypeScript with proper prop interfaces
2. ✅ Use `React.forwardRef` for components that need refs
3. ✅ Define clear variant and size props
4. ✅ Use CSS variables from theme.css
5. ✅ Make components responsive (mobile-first)
6. ✅ Add proper touch targets (min 48px)
7. ✅ Include hover states for desktop
8. ✅ Add transitions for smooth interactions
9. ✅ Export from `components/ui/index.ts`
10. ✅ Document usage in this file

---

## 🎯 Common Patterns

### Large Widget Tile
```tsx
<Link href="/feature">
  <Card
    variant="elevated"
    padding="lg"
    hoverable
    className="h-full flex flex-col justify-center items-center text-center gap-3"
  >
    <span className="text-6xl md:text-7xl">🎯</span>
    <div>
      <h3 className="text-xl md:text-2xl font-semibold">
        Feature Title
      </h3>
      <p className="text-base md:text-lg text-gray-600 mt-2">
        Description
      </p>
    </div>
  </Card>
</Link>
```

### Info Card with Icon
```tsx
<Card variant="outlined" padding="lg">
  <div className="flex items-center gap-4 md:gap-6">
    <span className="text-5xl md:text-6xl flex-shrink-0">💡</span>
    <div className="flex-1">
      <h4 className="text-lg md:text-xl font-semibold mb-2">
        Tip Title
      </h4>
      <p className="text-base md:text-lg text-gray-600">
        Tip content goes here
      </p>
    </div>
  </div>
</Card>
```

### Recipe Card
```tsx
<Card variant="elevated" padding="md" hoverable>
  <h4 className="text-xl font-bold mb-3">
    {recipe.name}
  </h4>
  <p className="text-base text-gray-600 mb-4">
    {recipe.description}
  </p>
  <div className="flex flex-wrap gap-2">
    <Badge variant="info">⏱ {recipe.time}m</Badge>
    <Badge variant="success">👨‍🍳 {recipe.difficulty}</Badge>
    <Badge variant="default">🍴 {recipe.servings}</Badge>
  </div>
</Card>
```

---

## 🚀 Quick Reference

**Always remember:**
1. 🚫 **NO DARK THEME** - Light theme only
2. 📱 **iPad-style** - Large, visible, touch-friendly
3. 🎴 **Widget-based** - Card/tile layouts
4. 🎨 **Use theme variables** - Never hardcode colors
5. 🖱️ **No inline styles** - Use CSS classes
6. 📐 **Generous spacing** - Use space-lg and space-xl
7. 🔤 **Large typography** - Scale up for visibility
8. ✨ **Smooth animations** - Add transitions
9. 👆 **Touch targets** - Minimum 48px
10. 📱 **Responsive** - Mobile-first approach

---

## 📚 File Structure

```
rem-e/
├── app/
│   ├── page.tsx              # Home page (widget grid example)
│   ├── globals.css           # Global styles
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/
│   │   ├── Button.tsx        # Button component
│   │   ├── Card.tsx          # Card component
│   │   ├── Badge.tsx         # Badge component
│   │   └── index.ts          # UI exports
│   └── layout/
│       ├── MainLayout.tsx    # Main layout wrapper
│       └── Navbar.tsx        # Navigation bar
├── styles/
│   └── theme.css             # Design system variables & styles
└── claude.md                 # This file
```

---

## 🎓 Learning Resources

- **Theme Variables:** See `styles/theme.css` for all available CSS variables
- **Components:** Check `components/ui/` for implementation examples
- **Layout Examples:** Review `app/page.tsx` for widget grid patterns
- **Responsive Design:** Use Tailwind's responsive prefixes (md:, lg:)