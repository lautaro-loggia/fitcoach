---
name: vercel-react-best-practices
description: Apply performance and architecture best practices for React apps deployed on Vercel.
---

# Vercel React Best Practices

Optimize React applications for maximum performance on Vercel infrastructure.

## Core Rules
1. **Eliminating Waterfalls**: Fetch data in parallel using `Promise.all` or Server Components. Avoid nested `useEffect` fetches.
2. **Bundle Size Optimization**: Use dynamic imports (`next/dynamic` or `React.lazy`) for heavy components. Audit dependencies.
3. **Server-Side Performance**: Minimize blocking work in Server Components. Use `Suspense` for slow data.
4. **Data Fetching**: Prefer Server Actions for mutations. Use `SWR` or `React Query` for client-side state when needed.
5. **Re-render Optimization**: Memoize expensive calculations. Use `React.memo` and `useMemo` sparingly but where impactful.

## Patterns
- **Parallel Data Fetching**: Start all requests as early as possible.
- **Streaming**: Break down pages into `Suspense` boundaries to show UI faster.
- **Image Optimization**: Always use `next/image` with proper `priority` for LCP.
