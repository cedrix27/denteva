# Token summary

- Framework: Next.js 16 App Router, React 19, TypeScript.
- UI: shadcn/Radix primitives with Tailwind CSS v4 and `tw-animate-css`.
- Fonts: Geist via `next/font/google`; `--font-sans` and `--font-geist-mono`.
- Current surface: `--background: #f5f8fa`, `--foreground: #0f172a`, white card surfaces, `--radius: 0.75rem`.
- Current primary: `#0f766e`, white foreground. Current destructive: oklch red. Border/input: oklch neutral.
- Existing sidebar: slate-950 with teal-600 logo mark, 250px desktop width.
- Existing type: page titles 20px semibold; body 14px; labels 12–14px.

## Raw global token source

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

:root {
  --background: #f5f8fa;
  --foreground: #0f172a;
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: #0f766e;
  --primary-foreground: #ffffff;
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: #0f766e;
  --radius: 0.75rem;
}
```
