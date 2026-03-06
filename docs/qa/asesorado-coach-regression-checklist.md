# QA Regression Checklist - Asesorado + Coach

## Precondiciones
- Tener un coach autenticado con al menos 1 asesorado activo.
- Tener un asesorado autenticado vinculado al coach.
- Tener al menos una rutina asignada al asesorado.
- Tener notificaciones habilitadas en el entorno de prueba.

## Smoke Coach
- [ ] Ingresar a `/` como coach y validar carga del dashboard.
- [ ] Abrir `/clients` y confirmar que solo aparecen clientes del coach autenticado.
- [ ] Entrar al detalle de un cliente y validar tabs `profile`, `checkin`, `training`, `diet`, `settings`.
- [ ] Asignar rutina desde tab `training` y verificar que el asesorado la vea en `/dashboard/workout`.
- [ ] Crear check-in desde coach y validar persistencia.
- [ ] Editar objetivo (`target`) y validar actualización visible en UI.
- [ ] Ejecutar flujo de pagos en `/pagos` (registrar pago + refresco de estado).
- [ ] Eliminar (soft-delete) un cliente y validar que desaparezca del listado.

## Smoke Asesorado
- [ ] Ingresar a `/dashboard` como asesorado y validar carga de cards principales.
- [ ] Ir a `/dashboard/workout`, iniciar entrenamiento y validar creación de sesión.
- [ ] Finalizar entrenamiento y validar redirección + toast de éxito.
- [ ] Reintentar finalizar la misma sesión y validar respuesta idempotente (sin duplicados visibles).
- [ ] Verificar que estado de rutina completada sea consistente entre `/dashboard` y `/dashboard/workout`.
- [ ] Ejecutar check-in desde `/dashboard/checkin` con foto y validar guardado.
- [ ] Ejecutar flujo de nutrición en `/dashboard/diet` y validar registro de comida.

## Seguridad y permisos
- [ ] Intentar actualizar/borrar un cliente de otro coach (debe fallar con `FORBIDDEN`/`UNAUTHORIZED`).
- [ ] Intentar llamar acciones críticas sin sesión (debe fallar con `UNAUTHORIZED`).
- [ ] Confirmar que `/api/push/vapid-public-key` responda JSON 200 sin redirección a `/login`.

## Notificaciones
- [ ] Finalizar entrenamiento del asesorado y validar creación de notificación al coach.
- [ ] Registrar comida del asesorado y validar notificación al coach.
- [ ] Enviar recordatorio de pago desde coach y validar notificación al asesorado.

## Navegación móvil
- [ ] Probar flujo coach en viewport móvil (`/`, `/clients`, `/pagos`).
- [ ] Probar flujo asesorado en viewport móvil (`/dashboard`, `/dashboard/workout`, `/dashboard/diet`).
- [ ] Confirmar ausencia de solapamientos visuales en headers/nav inferior.
