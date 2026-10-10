# Ronda — prototipo de revisión creativa

## Ronda Studio — actualización visual

Inicio operativo y biblioteca de proyectos con tarjetas pastel, filtros de estado, búsqueda y vista de lista. Tema negro-violeta, selección lavanda y acciones principales blancas aplicado al shell y vistas existentes; sin modificar datos, contratos API ni colores de anotaciones. Los contadores del Inicio son de la cuenta privada, no del equipo. Calendario y perfil del mockup siguen siendo propuestas, no funciones habilitadas. Tokens en design-tokens.json y vista de componentes en design-preview-studio.html; el preview anterior se conserva como referencia histórica.

## Backend propio en Docker (en integración)

Login/registro conectados a PostgreSQL, datos por cuenta, archivos privados en el PC y respaldos locales diarios, manteniendo el túnel. Importación explícita de datos anteriores disponible. Google requiere credenciales; correo de recuperación pendiente. Detalles y limitaciones en [backend/README.md](backend/README.md).

Equipo administra pertenencias y roles reales por servidor, con invitaciones manuales por código, revocación y actividad. Proyectos → Compartidos con el equipo permite crear nombres/clientes y comentarios generales del espacio; admin/editor gestionan proyectos y estados, revisores comentan. Los proyectos privados, archivos y anotaciones anteriores no se comparten automáticamente. SMTP aún no envía invitaciones. Las referencias antiguas importadas se conservan sin convertirlas en usuarios autenticados.

Prototipo funcional y responsive de la sala de revisión principal. Incluye dibujo con Pointer Events, carga local de videos e imágenes, reproducción y scrub, comentarios vinculados al fotograma actual, persistencia local, resolución de feedback, versiones, flujo de compartir, estado de aprobación y adaptación para tablet/móvil.

## Recorridos disponibles

- Cargar un video o una imagen desde **Cargar archivo**.
- Reproducir o desplazarse por el video y comentar en el instante actual.
- Dibujar sobre el contenido con mouse, dedo o stylus.
- Resolver y filtrar comentarios; se conservan después de recargar.
- Cambiar entre versiones V1–V3.
- Abrir el flujo de compartir y configurar permisos.
- Aprobar o reabrir la versión.
- Navegar por un panel de proyectos con búsqueda, estados y métricas.
- Consultar y filtrar el historial de actividad.
- Administrar miembros, cambiar roles y preparar invitaciones.
- Editar identidad, idioma y permisos predeterminados del espacio.
- Utilizar navegación móvil persistente entre todos los módulos.

## Ejecutar

Los comentarios admiten MP3 y otros audios reproducibles por el navegador, además de grabación de voz con permiso de micrófono. Límite local: 3 adjuntos de hasta 2 MB por comentario; grabación de hasta 60 segundos. Las grabaciones usan el formato del navegador (no se convierten a MP3). No hay transcripción ni sincronización en la nube.

```powershell
pnpm install
pnpm dev
```

Abrir `http://localhost:5173`.

## Archivos de diseño

- `DESIGN.md`: dirección y principios.
- `design-tokens.json`: tokens iniciales.
- `design-preview.html`: catálogo visual autocontenido.

El nombre **Ronda** es provisional y requiere validación de marca y dominio antes de uso comercial.
# Docker y URL fija

La aplicación queda servida por Nginx en `http://localhost:8080`:

```bash
docker compose up -d --build ronda
```

El puerto del host es configurable con `RONDA_PORT` en `.env`; el contenedor siempre escucha en `8080`. Esto permite mantener Ronda disponible aunque otro servicio local esté usando temporalmente el puerto 8080.

Para publicar `https://ronda.repolite.link`, crea un túnel con nombre en Cloudflare Zero Trust, agrega el hostname público `ronda.repolite.link` con servicio `http://ronda:8080`, copia `.env.example` como `.env`, completa `CLOUDFLARE_TUNNEL_TOKEN` y ejecuta:

```bash
docker compose --profile tunnel up -d --build
```

El token nunca debe subirse al repositorio. `.env` está ignorado por Git.
## Pauta (prototipo local)

La navegación Pauta permite crear grupos/campañas y vincular archivos existentes de la parrilla (V1). Cada pieza tiene configuración manual, comentarios por campo, solicitudes con responsable y semáforo. Aplicar solicitudes devuelve a revisión; modificar configuración invalida aprobación. El historial conserva valores anteriores/nuevos, autor local y fecha; cada comentario guarda su configuración de referencia. Los datos se guardan por navegador en ronda-pauta:v1, sin sincronización, publicación de anuncios, autenticación ni auditoría segura. Aún no incluye vista previa multimedia propia, respuestas en hilos, integración de plataformas ni aprobación conjunta de campañas.
# Iconografía

Los iconos funcionales de navegación, revisión y comentarios utilizan `iconoir-react` (Iconoir, licencia MIT), mediante `src/components/Icon.jsx`. Se distribuyen con la aplicación sin CDN, con trazo de 1.5 px y tamaños según el control. Las etiquetas accesibles permanecen en los botones; el símbolo de Ronda es una marca propia, no un icono funcional.
# Preview social

En revisión, abre **Preview social**, configura cuenta/texto/formato y selecciona explícitamente las imágenes o videos y su orden (máximo 20). Se guarda dentro del proyecto privado con el estado de la cuenta. Embla ofrece deslizar, ajuste de posición, flechas y puntos; las proporciones 1:1, 4:5 y 16:9 contienen el medio sin deformarlo. La reproducción automática es opcional, silenciada y solo con video visible; movimiento reducido desactiva automatismo y transición. **Anotar esta lámina** vuelve al visor existente. Los comentarios usan la versión del archivo seleccionado y el tiempo del video, no una conversación compartida entre láminas. Es una simulación orientativa, no integración ni publicación en Instagram. Solo se conecta a proyectos privados del visor actual, no a proyectos compartidos.
