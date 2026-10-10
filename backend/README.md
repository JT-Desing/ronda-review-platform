# Backend propio — acceso y persistencia por cuenta

Primera separación modular y migraciones versionadas implementadas. Responsabilidades, respaldo previo, pruebas y límites del runner en [ARCHITECTURE.md](ARCHITECTURE.md). Docker migra antes de iniciar HTTP; no elimina ni reinicializa los volúmenes existentes.

Ronda conserva https://ronda.repolite.link y el túnel original. Nginx envía /api/ a Node; PostgreSQL y la API no publican puertos al host. No hay dependencia de Supabase.

## Disponible

- Pantalla de registro/login por correo, comprobación de sesión, logout con revocación. Cookie HttpOnly, Secure y SameSite=Lax, duración de 7 días; contraseñas scrypt con sal.
- Datos de revisión, proyectos, comentarios, anotaciones, equipo de referencia, configuración y Pauta guardados por cuenta en PostgreSQL. El servidor obtiene el propietario desde la sesión, nunca desde un ID enviado por el cliente.
- Guardado serializado con revisión optimista: HTTP 409 evita sobrescribir cambios de otra pestaña. Copia pendiente aislada por cuenta en el navegador; recuperación explícita o descarga de JSON al regresar.
- Archivos privados en volumen Docker, consulta por propietario, hasta 100 MB por archivo y 2 GB por cuenta (límite operativo inicial, no facturación). HTML se descarga como octet-stream y se visualiza en iframe aislado, sin scripts/red.
- Importación explícita de la copia anterior en localStorage/IndexedDB del mismo navegador/origen. Reemplaza los datos de la cuenta; preserva el original. Traslada la identidad del usuario local a la cuenta y conserva otras personas como referencias, no como usuarios autenticados.
- Respaldos automáticos de PostgreSQL y archivos cada 24 horas mientras Docker funciona, y al arrancar el servicio de backup.
- Equipo real: selección de espacios, miembros registrados, roles admin/editor/reviewer, invitaciones por código privado (siete días, un solo uso), revocación y actividad de cambios. Solo administradores gestionan miembros; el último administrador está protegido incluso ante solicitudes concurrentes. Límite operativo de 20 miembros más invitaciones vigentes, independiente de planes comerciales.

## Persistencia en el PC

### Proyectos compartidos — primer incremento

Proyectos → Compartidos con el equipo usa entidades PostgreSQL propias, separadas de los snapshots privados. Los miembros actuales y futuros del espacio ven nombre, cliente y comentarios generales. Admin/editor crean y editan proyectos, resuelven/reabren comentarios; todos los miembros pueden comentar. Autor y permisos proceden de la sesión. Revisiones optimistas rechazan ediciones obsoletas; claves de solicitud evitan duplicados al reintentar.

Límites operativos: 100 proyectos por espacio, 1000 comentarios por proyecto; se muestran los últimos 100 comentarios. Actualización manual, sin tiempo real ni correo. No incluye archivos, audio, menciones, anotaciones ni aprobaciones compartidas. Los borradores son temporales en esta vista, no persistentes; cambiar de sección puede descartarlos. No se migra ni se publica contenido privado automáticamente.


Volúmenes ronda-prototype_ronda-database y ronda-prototype_ronda-files. Reiniciar contenedores/PC no los elimina. NO ejecutar docker compose down -v ni eliminar estos volúmenes.

Copias en .backups/FECHA_UTC/, con database.dump, files.tar.gz y COMPLETE solo al terminar ambos. No tienen retención automática para evitar borrar respaldo útil; vigilar el espacio. No son respaldo contra pérdida del PC: copiar una versión completa a un disco o servidor externo de confianza. Este directorio está excluido de Git y de la imagen Docker. Las credenciales backend/.env y del túnel se conservan por separado, fuera de Git.

La copia anterior del prototipo sigue dependiendo del perfil de navegador/origen hasta importarla. No borrar datos del navegador antes de completar la importación.

## Google (implementado, deshabilitado sin credenciales)

Crear un cliente OAuth tipo aplicación web en Google Cloud con callback exacto:
https://ronda.repolite.link/api/auth/google/callback

Colocar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET únicamente en backend/.env (no Vite, no Git ni chat). Recrear API con docker compose up -d api --force-recreate. El botón aparece únicamente con ambos valores.

Implementación con google-auth-library: state aleatorio y cookie enlazada al navegador, nonce, PKCE, expiración de diez minutos, canje en servidor, validación del ID token, audiencia y correo verificado. No mezcla automáticamente una cuenta de correo no verificado con Google: usar contraseña si ese correo ya tiene cuenta. El flujo real aún no está probado por falta de credenciales.

## Instalación y migración

node backend/bootstrap.js debe ejecutarse desde backend con Node 24; genera backend/.env una sola vez, sin imprimir secretos. Desde raíz:
docker compose --profile tunnel up -d --build

Para otro servidor: instalar Docker, trasladar código/configuración y secretos por canal seguro, restaurar database.dump en PostgreSQL y files.tar.gz en el volumen privado, mantener el dominio/túnel o actualizar APP_ORIGIN y callback Google; verificar antes de cambiar tráfico. Nunca copiar volúmenes de PostgreSQL en caliente como respaldo.

El origen de login configurado es HTTPS público; el puerto HTTP local sirve para diagnóstico, no para login con cookies Secure.

## API y pruebas

POST /api/auth/register, POST /api/auth/login, GET /api/auth/session, POST /api/auth/logout.
GET/PUT /api/data, PUT/GET /api/files/:uuid, GET /api/health.
GET /api/auth/google y /api/auth/google/callback.

GET /api/workspaces y /api/workspaces/:id; POST /api/workspaces/:id/invitations; DELETE /api/workspaces/:id/invitations/:invitationId; PATCH/DELETE /api/workspaces/:id/members/:userId; POST /api/workspace-invitations/accept.
Prueba aislada de permisos e invitaciones: `docker compose exec -T api node workspace-integration.js`.

Pruebas: docker compose exec -T api npm test; docker compose exec -T api node data-integration.js.
Persistencia: integration.js prepare, reiniciar database/api, esperar salud, integration.js verify (sin recrear contenedor entre fases).
backup-verify.sh restaura una copia en una base QA temporal, comprueba integridad de archivo y elimina solo esa base temporal.

## Limitaciones antes de uso comercial

El login protege el acceso y los datos por cuenta. Equipo usa pertenencias e invitaciones reales. La nueva vista compartida solo comparte nombres/clientes y comentarios generales; los proyectos, archivos, comentarios anotados, menciones y aprobaciones anteriores siguen en snapshots privados por cuenta. Referencias del equipo importado se conservan aparte, sin conceder acceso. Los planes todavía no tienen pagos ni validación comercial. La actividad del equipo es un registro servidor, no auditoría externa inmutable ni edición en tiempo real.

Faltan SMTP/verificación de correo/recuperación de contraseña, configuración y prueba de Google, archivos/anotaciones/aprobaciones compartidos, herramientas de eliminación/retención, sincronización automática de sesiones simultáneas y respaldo externo. Invitaciones se entregan manualmente por un canal privado, no por correo; requieren poseer el código e iniciar sesión con el correo dirigido, pero NO verifican la propiedad de esa dirección. No enviar códigos a terceros ni publicarlos. Los documentos Office requieren exportar a PDF para revisión visual, como antes.

La importación completa de datos privados del usuario no se ejecutó automáticamente ni se utilizó como prueba. Cargas interrumpidas mantienen datos previos; puede haber medios huérfanos si se cierra antes de guardar metadatos, pendientes de limpieza segura.
## Transporte SMTP — 10 octubre 2026

Nodemailer está integrado mediante mailer.js en la composición del servidor, con TLS/certificado verificado, timeouts y sin logs de credenciales. Verificación manual: node --env-file=.env smtp-verify.js. La prueba con Zoho alcanzó autenticación pero fue rechazada con EAUTH; no se enviaron mensajes. Se requiere corregir credencial/configuración de la cuenta. El transporte aún no dispara invitaciones, recuperación ni notificaciones automáticamente. 19 pruebas backend pasaron. Pendiente despliegue del código SMTP.
