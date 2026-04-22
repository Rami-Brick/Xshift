I have a React + Vite + TypeScript + Tailwind v3 app. I also have a design kit at ./design-kit/ that I want to use for all UI.

Setup first:

Install missing deps: clsx, tailwind-merge, lucide-react, recharts
In tailwind.config.ts, add presets: [require('./design-kit/tailwind-preset')] and add './design-kit/**/*.{ts,tsx}' to content
Add this to the top of the global CSS: @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
Then read design-kit/CLAUDE.md before touching anything — it has the rules for tokens, colors, radius, and what not to break.

Now build [describe your screen/feature here]. Import components from ./design-kit/index.ts. Use the semantic Tailwind classes (bg-canvas, text-ink, rounded-xl, etc.) instead of raw colors. Don't hardcode hex values.