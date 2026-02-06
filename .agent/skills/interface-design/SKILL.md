---
name: Interface Design
description: Build interface design with craft and consistency. Focused on dashboards, admin panels, SaaS apps, and data interfaces.
---

# Interface Design

Build interface design with craft and consistency.

## Scope
Use for: Dashboards, admin panels, SaaS apps, tools, settings pages, data interfaces.
Not for: Landing pages, marketing sites, campaigns.

## Intent First
Before touching code, answer these:
- **Who is this human?** (Not "users"). What's on their mind?
- **What must they accomplish?** (The verb: Grade, Find, Approve).
- **What should this feel like?** (Warm like a notebook? Cold like a terminal? Dense like a trading floor?).

## Product Domain Exploration (Required)
Do not propose any direction until you produce all four:
1. **Domain**: 5+ concepts/metaphors from the product's world.
2. **Color world**: 5+ colors that exist naturally in this domain.
3. **Signature**: One unique visual/structural element.
4. **Defaults**: Name 3 obvious choices to avoid/replace.

## The Mandate (Evaluation)
Before presenting, run these checks:
- **The Swap Test**: If you swapped the typeface or layout for a standard one, would it feel different?
- **The Squint Test**: Blur your eyes. Is hierarchy still clear? Does anything jump out harshly?
- **The Signature Test**: Point to 5 specific elements where your signature appears.
- **The Token Test**: Read CSS variables out loud. Do they sound like this product?

## Design Principles
- **Subtle Layering**: Surface elevations should be whisper-quiet.
- **Borders**: Light but not invisible. If you notice them first, they're too strong.
- **Spacing**: Use a base unit (e.g., 4px) and stick to multiples.
- **Typography**: Headlines need weight, body needs readability, data needs monospace.
- **Interaction**: Every element needs states (hover, focus, disabled).

## Workflow
1. **Explore domain** (Produce the 4 required outputs).
2. **Propose** (Reference the 4 outputs).
3. **Confirm** (Get user buy-in).
4. **Build** (Apply principles).
5. **Evaluate** (Run mandate checks).
6. **Save** (Offer to save patterns to `.interface-design/system.md`).

## Commands
- `/interface-design:status`: Current system state.
- `/interface-design:audit`: Check code against system.
- `/interface-design:extract`: Extract patterns from code.
