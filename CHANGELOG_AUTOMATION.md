# Registro de mejora continua

Este archivo documenta cambios realizados por el ciclo automatizado de Ronda.

## 2026-10-07 — Preparación inicial

- Se creó el prototipo funcional y responsive.
- Se añadieron las vistas de proyectos, actividad, equipo y configuración.
- Se configuró una automatización de mejora continua cada 30 minutos.
- Se añadió el workflow de compilación y despliegue para GitHub Pages.
- Verificación: `pnpm build` completado correctamente.
# 2026-10-08 — Ciclo de revisión conectado

- Se incorporó un estado central versionado y persistente para comentarios, decisiones, actividad y notificaciones.
- Crear, resolver o reabrir comentarios ahora alimenta el registro de actividad.
- Se añadieron reglas verificadas para bloquear una aprobación cuando existen comentarios bloqueantes.
- Se agregó un centro de notificaciones web y lectura persistente.
- Se corrigió el enlace compartido para funcionar bajo la ruta de GitHub Pages.
- Las herramientas de anotación todavía no implementadas se muestran deshabilitadas para evitar acciones engañosas.
- La invitación al equipo valida correos, duplicados y el límite de cinco puestos del plan Studio.
