# Motion Performance Baseline

## Objective
Apply Motion patterns in Orbit without harming load and interaction quality on the critical routes:

- `/` (coach dashboard)
- `/dashboard` (advised dashboard)

## Budgets and success gates

- LCP regression: at most `+150ms`
- INP p75: `<= 200ms`
- CLS: `<= 0.02`
- Route JS increase (`/`, `/dashboard`): `<= +15KB gzip` per phase
- `prefers-reduced-motion`: always respected

## Runtime kill switch

`NEXT_PUBLIC_MOTION_LEVEL` supports:

- `off`: disables runtime Motion variants and gestures
- `minimal` (default): subtle animations and reduced movement
- `full`: full preset movement (still transform/opacity-only)

If not set, Orbit defaults to `minimal`.

## Route animation budgets

Defined in [route-budget.ts](/Users/lauloggia/Desktop/Orbit/src/lib/motion/route-budget.ts):

- max animated items per route
- stagger timing per route
- max simultaneous sections
- scroll reveal toggle

## Baseline and regression procedure

1. Build with motion off:

```bash
NEXT_PUBLIC_MOTION_LEVEL=off npm run build
```

2. Build with motion minimal:

```bash
NEXT_PUBLIC_MOTION_LEVEL=minimal npm run build
```

3. Compare route chunks and first-load output for `/` and `/dashboard`.
4. Run interaction smoke checks on mobile and desktop:
   - rapid tab changes
   - bottom-nav taps
   - open/close dialog and sheet
   - scroll long progress/nutrition screens
5. Verify reduced motion:
   - enable reduced motion at OS level
   - confirm animations become static/minimal

## Manual verification checklist

- No visible jank in nav transitions.
- No long task spikes during quick tap sequences.
- Modal focus remains correct after open/close.
- Scroll remains smooth on progress and diet views.
- No layout shift introduced by active indicators.
