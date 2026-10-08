# Ronda — prototipo de revisión creativa

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

Para publicar `https://ronda.repolite.link`, crea un túnel con nombre en Cloudflare Zero Trust, agrega el hostname público `ronda.repolite.link` con servicio `http://ronda:8080`, copia `.env.example` como `.env`, completa `CLOUDFLARE_TUNNEL_TOKEN` y ejecuta:

```bash
docker compose --profile tunnel up -d --build
```

El token nunca debe subirse al repositorio. `.env` está ignorado por Git.
