# Extensión Ronda · Comentarios web

La extensión conecta el visor de Ronda con una web externa aprobada por quien revisa. Lee la selección de texto y el desplazamiento del documento únicamente después de que Ronda inicia la comunicación con ese frame. No modifica la web, sus solicitudes ni sus respuestas.

## Instalación en Chrome de escritorio

1. Descarga y descomprime `ronda-review-extension.zip`.
2. Abre `chrome://extensions`, activa **Modo de desarrollador** y pulsa **Cargar descomprimida**.
3. Selecciona la carpeta `ronda-review-extension` que descomprimiste y fija la extensión en la barra del navegador.
4. Abre el proyecto y el visor web en Ronda. Pulsa el icono de la extensión, elige el dominio que aparece y autorízalo.
5. En el visor, pulsa **Seleccionar texto**, marca el texto de la web y escribe el comentario. El pin y el resaltado de cada línea siguen el scroll del documento.

Chrome pedirá permiso solo para el dominio HTTPS elegido. Para retirar el acceso, abre los detalles de la extensión en `chrome://extensions` y revoca el acceso al sitio o desinstálala. Cada revisor que necesite anotar tiene que instalar la extensión y autorizar el dominio en su propio navegador.

La extensión es un paquete de carga local para Chrome; no está publicada en Chrome Web Store. Las webs externas deben permitir mostrarse dentro de un iframe para verse dentro de Ronda; la extensión no puede anular `X-Frame-Options` ni `Content-Security-Policy`.
