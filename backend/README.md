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

Copias en .backups/FECHA_UTC/, con database.dump, files.tar.gz y COMPLETE solo al terminar ambos. Se borran las de más de `BACKUP_RETENTION_DAYS` días (14 por defecto) y solo después de completar una nueva. Cada copia incluye todos los archivos, así que ocupan espacio rápido; vigilar el disco. No son respaldo contra pérdida del PC: para eso está el respaldo externo de abajo. Este directorio está excluido de Git y de la imagen Docker. Las credenciales backend/.env y del túnel se conservan por separado, fuera de Git.

Las subidas se escriben a disco (`flush` y `fsync` del directorio) antes de confirmar su fila en PostgreSQL, para que un corte de luz no deje registros apuntando a archivos vacíos.

### Respaldo externo en Cloudflare R2

El servicio `offsite` usa restic: copias cifradas e incrementales de la base y de los archivos cada 6 horas. Solo sube lo que cambió y conserva 4 recientes, 14 diarias, 8 semanales y 6 mensuales. Es opcional (perfil `offsite`) y no modifica el respaldo local.

Configuración, una sola vez:

1. En Cloudflare, R2 → crear el bucket `ronda-backups` sin acceso público. Restic no crea el bucket: si no existe, reintenta varios minutos y falla.
2. R2 → Manage API tokens → token con permiso "Object Read & Write" limitado a ese bucket. Anotar Access Key ID, Secret Access Key y el endpoint `https://ACCOUNT_ID.r2.cloudflarestorage.com`.
3. Copiar `backend/.env.offsite.example` como `backend/.env.offsite` y completarlo. Usar una ruta por despliegue dentro del bucket, por ejemplo `/ronda-backups/epayco-mkt`.
4. Generar `RESTIC_PASSWORD` largo y guardarlo en el gestor de contraseñas del equipo antes de la primera copia. Sin esa contraseña los respaldos no se pueden restaurar.
5. Iniciar con `docker compose --profile offsite up -d --build offsite` y revisar `docker compose logs offsite`: debe decir `created restic repository` la primera vez y `Offsite backup completed` al terminar.

Verificación (recomendada una vez al mes): restaura el último volcado en una base temporal, comprueba que cada archivo registrado esté en la copia y lee el 10 % de los datos guardados. Borra solo su base temporal.

```sh
docker compose --profile offsite run --rm --entrypoint sh offsite /usr/local/bin/offsite-verify.sh
```

Restaurar después de perder el PC, en una máquina nueva con Docker y las mismas variables: `restic snapshots` lista las copias; `restic dump --tag database latest /database.dump > database.dump` recupera la base para `pg_restore`; `restic restore latest --tag files --target /` recupera `/data/files` dentro de un contenedor que monte el volumen de archivos. Restaurar con la API detenida.

El plan gratuito de R2 incluye 10 GB de almacenamiento al mes. El token puede borrar objetos del bucket; si se filtra, revocarlo en Cloudflare y generar otro.

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

### Revisión compartida — rama de desarrollo, 12 octubre 2026

Esta rama añade `0004_shared_review.sql`, piezas/archivos/versiones del espacio, comentarios con anotación y respuestas, revisores y aprobación. Solo PNG/JPEG/WebP y MP4; los demás visores privados conservan su alcance anterior. Todos los miembros ven los proyectos compartidos. Editor/admin suben y resuelven; solo los revisores asignados deciden; un bloqueante impide aprobar. La versión aprobada queda en solo lectura y cada nueva versión tiene original y decisiones independientes.

Archivos compartidos locales en `/data/files/_shared`, dentro del volumen y respaldo de archivos existente. Límites del prototipo 100 MB/archivo y 2 GB/espacio, no capacidades comerciales. No hay migración automática de medios privados, enlaces externos ni contrataciones. Retirar un miembro impide futuras lecturas/escrituras y elimina su participación activa, preservando historia; bytes ya descargados no se pueden revocar.

Pruebas en contenedor PostgreSQL QA independiente, sin leer `.env`, credenciales ni volúmenes reales: `node backend/shared-review-qa-runner.js shared-review-flow-integration.js` desde raíz. El runner valida la etiqueta y elimina únicamente el contenedor QA creado. Pruebas adicionales de modelo, subida, versiones, comentarios y decisiones usan el mismo runner. `node --test` comprueba las pruebas unitarias; compilación mediante `node node_modules/vite/bin/vite.js build`.

**No desplegado ni aprobado para venta.** La comprobación visual/interactiva en navegador no pudo ejecutarse por bloqueo de URL local. Se conservan avisos existentes de fuentes y bundle. Antes de uso con cliente real: conectar/probar almacenamiento comercial, recuperación/copia externa, correo y controles del plan. No declarar estas capacidades activas por tener un cotizador o preferencias guardadas.

Recuperación: originales deterministas permiten reintentar una finalización tras rename con rollback SQL. El servidor revisa cada minuto un máximo de 20 cargas vencidas/no referenciadas, bajo bloqueo del espacio y del archivo; nunca borra ready ni un archivo asociado a versión. Bytes pendientes siguen ocupando cuota hasta confirmar limpieza. Fallos conservan el registro para reintentar. El test `shared-cleanup-integration.js` verifica esta política; `shared-review-backup-integration.js` restaura un dump QA y confirma datos privados/metadatos/original. No demuestra recuperación de producción ni elimina la necesidad de respaldo externo.

Demo: la API frontend nueva rechaza las llamadas compartidas reales mientras el demo está activo. El selector de proyectos no abre el espacio real desde ese modo. El resto de los módulos demo mantiene su alcance anterior.

Los párrafos históricos siguientes describen el alcance anterior a esta rama; no se deben usar como garantía de la versión desplegada o comercial.

El login protege el acceso y los datos por cuenta. Equipo usa pertenencias e invitaciones reales. La nueva vista compartida solo comparte nombres/clientes y comentarios generales; los proyectos, archivos, comentarios anotados, menciones y aprobaciones anteriores siguen en snapshots privados por cuenta. Referencias del equipo importado se conservan aparte, sin conceder acceso. Los planes todavía no tienen pagos ni validación comercial. La actividad del equipo es un registro servidor, no auditoría externa inmutable ni edición en tiempo real.

Faltan SMTP/verificación de correo/recuperación de contraseña, configuración y prueba de Google, archivos/anotaciones/aprobaciones compartidos, herramientas de eliminación/retención, sincronización automática de sesiones simultáneas y respaldo externo. Invitaciones se entregan manualmente por un canal privado, no por correo; requieren poseer el código e iniciar sesión con el correo dirigido, pero NO verifican la propiedad de esa dirección. No enviar códigos a terceros ni publicarlos. Los documentos Office requieren exportar a PDF para revisión visual, como antes.

La importación completa de datos privados del usuario no se ejecutó automáticamente ni se utilizó como prueba. Cargas interrumpidas mantienen datos previos; puede haber medios huérfanos si se cierra antes de guardar metadatos, pendientes de limpieza segura.
## Transporte SMTP — 10 octubre 2026

Nodemailer está integrado mediante mailer.js en la composición del servidor, con TLS/certificado verificado, timeouts y sin logs de credenciales. Verificación manual: node --env-file=.env smtp-verify.js. La prueba con Zoho alcanzó autenticación pero fue rechazada con EAUTH; no se enviaron mensajes. Se requiere corregir credencial/configuración de la cuenta. El transporte aún no dispara invitaciones, recuperación ni notificaciones automáticamente. 19 pruebas backend pasaron. Pendiente despliegue del código SMTP.
