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

## Centro de actividad operativo

- La actividad ahora puede filtrarse simultáneamente por tipo, proyecto, persona, período y estado sin leer.
- Se agregó búsqueda por contenido, proyecto o participante y una acción para limpiar todos los filtros.
- Los eventos se agrupan en Hoy, Ayer y Esta semana, con estado leído persistente.
- Las métricas resumen eventos pendientes, comentarios, decisiones y proyectos activos.
- Cada evento enlaza con su proyecto o sala de revisión y existe un estado vacío accionable.
- La vista responde en escritorio, tablet y móvil sin convertir los filtros en una tabla horizontal.

## Presencia colaborativa

- El indicador superior muestra cuántas personas están viendo la revisión y despliega su nombre, actividad y timecode actual.
- Los avatares visibles funcionan como accesos directos y `+N` abre la lista completa de participantes.
- Seleccionar una persona lleva el reproductor a su fotograma y muestra su cursor identificado sobre el contenido.
- La implementación actual simula presencia local; el modelo visual y de interacción queda preparado para sincronización por WebSockets.

## Panel editorial de comentarios

- Hipótesis: una jerarquía editorial plana, con menos contenedores repetidos, permite revisar más rápido y evita la apariencia genérica de un panel generado automáticamente.
- Criterios de aceptación: distinguir pendientes y resueltos, buscar comentarios, saltar al timecode, responder dentro del hilo, resolver comentarios y conservar referencias visuales sin perder claridad.
- Se reorganizó la cabecera con contexto de revisión, conteos reales y filtros `Todos`, `Abiertos` y `Resueltos`.
- Cada hilo muestra autor, estado, timecode y fotograma como acciones claras; los comentarios bloqueantes conservan una señal visible sin dominar la interfaz.
- Las respuestas se escriben y persisten dentro del comentario, con envío por teclado y contador por hilo.
- Se incorporó búsqueda con estado vacío, y se mantuvieron las capturas de referencia y el compositor fijo al pie.
- Archivos: `src/main.jsx` y `src/styles.css`.
- Verificación: pruebas unitarias 3/3, compilación de producción, `git diff --check`, búsqueda sin coincidencias y respuesta persistida verificadas en navegador.
- Siguiente prioridad: sincronizar respuestas y presencia con un backend en tiempo real; hoy ambas capacidades siguen siendo locales o simuladas.
