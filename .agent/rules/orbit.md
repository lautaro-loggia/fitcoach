---
trigger: always_on
---

# WORKSPACE RULES – ORBIT

## Stack y arquitectura
- Frontend: React / Next.js + Tailwind.
- UI: shadcn/ui + lucide-react.
- No crear componentes custom si existe uno equivalente en shadcn.
- Mantener componentes simples, reutilizables y predecibles.

## UI / UX (MUY IMPORTANTE)
- Estilo consistente tipo shadcn: limpio, sobrio, sin diseños “creativos” innecesarios.
- Usar spacing estándar: gap-2 / gap-4 / gap-6, padding p-4 / p-6.
- Cards con rounded-2xl y shadow-sm.
- No hardcodear colores: usar tokens/variables existentes.
- Priorizar layouts compactos y escaneables (Orbit es una herramienta de trabajo, no marketing).

## Formularios y flujos
- Formularios: React Hook Form + zod.
- Inputs claros, labels explícitos, feedback inmediato.
- Evitar pasos innecesarios.
- Pensar siempre en uso real por coaches (flujo rápido, sin fricción).

## Fotos
- Las fotos deben:
  - Comprimirse antes de subir.
  - Limitar resolución.
  - Nunca guardarse como base64 en la base de datos.

## Supabase / Base de datos
- Supabase como backend principal.
- No crear migraciones nuevas sin que el prompt lo pida explícitamente.
- No modificar RLS policies sin avisar primero.
- Preferir JSONB solo cuando tenga sentido; justificar su uso.
- Evitar consultas N+1.

## Costos y performance
- Optimizar siempre pensando en costos (storage, queries, IA).
- No guardar datos innecesarios.
- Evitar lógica pesada en el cliente si puede resolverse mejor.

## Forma de responder
- Respuestas directas, técnicas y sin relleno.
- No “explicar de más”.
- Priorizar soluciones prácticas y accionables.
