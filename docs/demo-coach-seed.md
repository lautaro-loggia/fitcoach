# Demo Coach Seed (4 asesorados)

Este documento describe como generar y limpiar una cuenta demo de coach completa (4 asesorados + check-ins + entrenamientos + recetas + pagos) para presentaciones comerciales.

## Script

Archivo:
- `/Users/lauloggia/Desktop/Orbit/scripts/seed-demo-coach-account.ts`

CLI:
- `--mode=recreate|create|cleanup` (default: `recreate`)
- `--seed-date=YYYY-MM-DD` (default: fecha UTC actual)
- `--manifest=tmp/demo-coach-manifest.json` (default: `tmp/demo-coach-manifest.json`)

## Comandos

Recrear demo completa (recomendado antes de cada presentacion):

```bash
npx tsx scripts/seed-demo-coach-account.ts --mode=recreate
```

Crear otra demo adicional sin borrar la previa:

```bash
npx tsx scripts/seed-demo-coach-account.ts --mode=create
```

Semilla con fecha fija (ejemplo):

```bash
npx tsx scripts/seed-demo-coach-account.ts --mode=recreate --seed-date=2026-03-04
```

Limpieza completa de datos demo:

```bash
npx tsx scripts/seed-demo-coach-account.ts --mode=cleanup
```

## Que genera

- 1 coach demo nuevo (`demo.coach+<timestamp>@orbit-demo.local`)
- 4 asesorados masculinos realistas, activos y vinculados a Auth
- Avatares y fotos de check-ins (frente/perfil/espalda) en Storage:
  - bucket `client-avatars`
  - bucket `checkin-images`
- 6 check-ins por asesorado (24 totales), con medidas, observaciones y notas de coach
- 3 rutinas en `workouts`
- 4 asignaciones en `assigned_workouts`
- Logs minimos en `workout_logs`
- 4 recetas en `recipes`
- 4 planes semanales activos en la jerarquia `weekly_meal_*`
- 3 planes comerciales en `plans` (Base/Pro/Elite)
- Escenario de pagos coherente:
  - 1 `paid`
  - 2 `pending` (uno con historial cercano y otro sin historial)
  - 1 `overdue`

## Preflight y seguridad

El script valida antes de sembrar:

- Env vars obligatorias:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Tablas/columnas criticas para el flujo de UI
- Buckets requeridos (`client-avatars`, `checkin-images`), los crea si no existen

Si falla el preflight de esquema, aborta sin iniciar la carga de datos demo.

## Manifest y trazabilidad

Por defecto escribe:
- `/Users/lauloggia/Desktop/Orbit/tmp/demo-coach-manifest.json`

El manifest guarda:
- Credenciales del coach
- Credenciales de los 4 asesorados
- IDs creados por modulo (checkins, workouts, recetas, planes, pagos, meal plans)
- Fuente de fotos

## Cleanup / rollback

`--mode=cleanup` elimina unicamente datos demo detectados por:
- `demo_tag = coach_demo_v1` en JSON de clientes
- emails demo (`demo.coach+...@orbit-demo.local`, `demo.client...@orbit-demo.local`)
- IDs del manifest

Tambien elimina usuarios Auth demo y borra el manifest local.

## Checklist QA rapido

1. Login con coach demo y apertura de dashboard sin errores.
2. `/clients` muestra 4 asesorados activos con avatar.
3. Cada asesorado tiene historial de check-ins con fotos frente/perfil/espalda.
4. Tab de entrenamiento con rutinas asignadas (sin estados vacios).
5. Tab de dieta con plan semanal cargado.
6. `/pagos` muestra mix: 1 paid, 2 pending, 1 overdue.
7. Home coach con metricas no triviales (check-ins, actividad, pagos).

## Notas operativas

- La semilla usa fotos stock de Pexels para mantener realismo visual.
- Si en algun entorno falla la descarga de fotos por red, ejecutar nuevamente con conectividad o preaprobar salida de red del proceso.
- Recomendacion comercial: correr `--mode=recreate` 5 minutos antes de cada demo para fechas frescas y estados coherentes.
