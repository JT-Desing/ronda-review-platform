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

## Referencias visuales y comandos rápidos

- Los comentarios aceptan hasta tres imágenes o capturas de referencia, mediante selector de archivos o pegado desde el portapapeles.
- Las referencias muestran vista previa, se pueden quitar antes de publicar y permanecen vinculadas al comentario.
- Flecha, rectángulo y texto ya son herramientas funcionales junto al lápiz.
- Se añadieron atajos de reproducción, navegación por fotograma, herramientas, sonido, pantalla completa y comentarios.
- El botón `?` abre una guía visual de comandos; `Esc` cierra paneles y modales.
- La paleta completa permanece disponible en móvil mediante desplazamiento horizontal.
- `Ctrl/⌘ + Z` deshace la última anotación y `Ctrl/⌘ + Shift + Z` o `Ctrl/⌘ + Y` la restaura, sin interferir con la edición de texto.

## Contenedor y despliegue por túnel

- Se añadió una imagen Docker multi-stage con Node 24 para compilación y Nginx para producción.
- Nginx sirve la SPA y sus rutas en el puerto `8080`, con caché para assets y cabeceras básicas de seguridad.
- Docker Compose incluye el servicio `ronda` y un perfil opcional `tunnel` mediante Cloudflare Tunnel.
- El hostname previsto es `ronda.repolite.link` y su origen interno es `http://ronda:8080`.
- El token se carga exclusivamente desde `.env`, que permanece fuera del repositorio.
