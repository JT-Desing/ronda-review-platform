# Landing de Ronda

Sitio estático en Astro, separado de la app. Vive aparte para que la página
siga arriba aunque el PC con el túnel esté apagado.

## Desarrollo

```bash
cd landing
pnpm install
pnpm dev       # http://localhost:4321
pnpm test      # precios y lógica de la demo
pnpm build     # genera dist/
```

## Qué editar

- `src/data/plans.js`: planes, cuotas, paquete de espacio extra, plan a medida,
  descuento anual y la referencia de precio por persona de la calculadora.
  Las cifras salen del documento "Planes de Ronda: costos y almacenamiento".
- `src/data/site.js`: URL de la app, correo comercial (`ronda@repolite.link`,
  alias de Zoho) y enlaces a Repolite.
- `src/pages/index.astro`: textos de cada sección.
- `src/components/ReviewRoom.astro` y `src/scripts/walkthrough.js`: el recorrido corto del inicio.
- `src/data/tour.js`: video del recorrido completo y sus capítulos. Mientras `TOUR_VIDEO` sea `null` se muestra la portada con "Video en preparación". Para activarlo, copiar el MP4 a `public/video/` y poner su ruta; ajustar los segundos de cada capítulo al montaje final.

Los colores salen de `design-tokens.json` (Ronda Studio 0.2) y están copiados
en `src/styles/global.css`. `src/scripts/liquid-motion.js` es copia del de la
app; si cambia allá, hay que copiarlo de nuevo.

## Publicar en Cloudflare Pages

1. Cloudflare > Workers & Pages > Create > Pages > conectar el repositorio.
2. Directorio raíz: `landing`. Comando de build: `pnpm build`. Salida: `dist`.
3. Variable de entorno `NODE_VERSION=22` o superior.
4. Agregar el dominio propio en la pestaña Custom domains.

Si la landing ocupa el dominio de la app, primero hay que mover la app a un
subdominio (por ejemplo `app.`) en el túnel y actualizar `APP_URL` en
`src/data/site.js`.

## Pendiente antes de publicar

- Confirmar nombre y dominio (el README principal dice que "Ronda" es provisional).
- Crear el alias `ronda@repolite.link` en Zoho.
- Páginas de términos y privacidad.
- Imagen para compartir en redes (`og:image`).
- Grabar el video del recorrido completo.
- Las cuotas de 50 GB a 2 TB requieren tener los archivos en R2 (ver el documento de costos).
