# Borrador de ficha — Chrome Web Store

**Nombre:** Ronda — Anotaciones web  
**Resumen (≤132 caracteres):** Revisa páginas web en vivo desde Ronda con comentarios y marcas ancladas al documento.  
**Categoría sugerida:** Productividad  
**Idioma:** Español

## Descripción

Conecta una página HTTPS de tu proyecto con Ronda para revisar su contenido en vivo. Selecciona texto o usa lápiz, flecha, rectángulo y texto; las anotaciones se guardan en coordenadas de la página y siguen su desplazamiento.

La extensión no es necesaria para iniciar sesión ni para el resto de Ronda. Al conectar un proyecto, Chrome pide permiso únicamente para el origen de esa web. Puedes revocarlo cuando quieras. Si no la instalas, puedes seguir revisando capturas fijas.

## Permisos — explicación para revisión

- `scripting`: inyectar el puente de scroll/selección únicamente en el origen que el usuario autorizó.
- `storage`: recordar localmente los orígenes que el usuario conectó.
- Acceso requerido a `https://ronda.repolite.link/*`: intercambiar el origen actual del visor y el estado de conexión.
- Acceso HTTPS opcional: se solicita en tiempo de ejecución solo para el origen exacto del proyecto abierto, tras pulsar el botón de conexión.

## Pendiente antes del envío

- Cuenta de desarrollador de Chrome Web Store habilitada y aceptación de su acuerdo/registro por el titular.
- Hecho: correo de soporte ronda@repolite.link.
- Política publicada en https://ronda.repolite.link/legal/privacidad.html al desplegar esta versión. Falta completar el cuestionario de uso de datos en la consola.
- Hecho: iconos de 16, 32, 48 y 128 en `extension/icons/` y ZIP de producción con `scripts/package-extension.sh` (sale en `dist-extension/`).
- Hecho: probada en Chromium contra Ronda local, con conexión del sitio, selección de texto, comentario y scroll (ver PR #22 y #25).
- Faltan las capturas de ficha (1280×800).
- Enviar a revisión, esperar aprobación, copiar el ID/listing URL y configurar `VITE_RONDA_EXTENSION_STORE_URL` en el build de Ronda.
