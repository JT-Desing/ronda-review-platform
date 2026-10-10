# Arquitectura del backend — primera etapa

## Decisión

Monolito modular Node/PostgreSQL dentro de Docker. Sin microservicios, ORM ni proveedor gestionado adicional. Los contratos HTTP, cookies, origen HTTPS, volúmenes y túnel siguen intactos. Esta etapa no cambia el formato de snapshots por cuenta ni introduce colaboración ficticia.

## Límites y responsabilidades

- `server.js`: proceso HTTP y cierre ordenado; no SQL de esquema ni rutas de negocio.
- `app.js`: composición con pool inyectado, origen permitido, resolución de sesión, enrutamiento y manejo seguro de errores. Se importa sin abrir puertos.
- `http.js`: respuestas y lectura JSON limitada.
- `modules/auth.js`, `account-data.js`, `files.js`: controladores por capacidad.
- `auth-service.js`: registro/login sin depender de solicitudes HTTP; recibe un repositorio. Contraseña nunca sale en la identidad pública.
- `repositories/users.js`: consultas de usuarios y transacción cuenta/espacio/rol inicial. `repositories/sessions.js`: lectura de identidad desde sesión persistida.
- `google.js`: adaptador OAuth existente, deshabilitado sin credenciales. No se afirma validación real de Google.
- `database.js`: pool PostgreSQL. `migration-runner.js` y `migrations/`: evolución de esquema separada del servidor HTTP.

Extracción incremental, no arquitectura hexagonal completa: archivos y snapshots todavía contienen SQL en sus módulos. Próximas etapas podrán separar sus repositorios/servicios al introducir permisos compartidos. No añadir capas vacías para cada consulta.

## Migraciones y recuperación

Docker ejecuta `node migrate.js` antes de iniciar HTTP; si falla, no arranca la nueva API. Ejecutar manualmente con `docker compose run --rm --no-deps api npm run migrate` únicamente después de respaldo y prueba.

Conexión rechazada/reiniciada o PostgreSQL todavía arrancando tienen hasta cinco intentos, con backoff total de 7,5 segundos. Errores de esquema/historial no se reintentan. Docker conserva su política de reinicio existente si el proceso falla.

Archivos `NNNN_descripcion.sql`, ordenados, inmutables una vez desplegados. El ledger `schema_migrations` registra checksum SHA-256 (normaliza CRLF a LF). Historial ausente, modificado o reordenado falla cerrado. Un bloqueo advisory transaccional evita carreras entre despliegues. Todo el lote pendiente y su ledger se confirman juntos; errores revierten el lote. Tiempo máximo de sentencia 60 segundos y espera de bloqueo 10 segundos.

La migración `0001_baseline.sql` adopta el esquema previo usando CREATE/ALTER IF NOT EXISTS, sin eliminar filas ni modificar snapshots. Probada sobre copia restaurada de la base del PC y una base nueva. No constituye detector general de drift de columnas preexistentes.

Migraciones forward-only: no hay comando DROP/reset/down de producción. Revertir código compatible conserva la base expandida; corregir esquema con una migración nueva. Restaurar un respaldo solo como recuperación planificada, con parada de escrituras y validación: nunca restaurar encima de datos vivos automáticamente.

Este runner solo admite migraciones transaccionales pequeñas. CREATE INDEX CONCURRENTLY, backfills grandes y cambios destructivos requieren un flujo separado revisado; no meterlos en este lote. Las pruebas con la base actual no demuestran rendimiento a escala SaaS.

## Verificación

- `npm test`: contratos básicos HTTP, servicio auth, contraseñas, integridad/idempotencia/rollback del runner.
- `node migration-integration.js`: crea una base UUID exclusivamente QA, verifica concurrencia, adopción previa, rollback real y conservación; elimina únicamente esa base.
- Preflight: `docker compose run --rm --no-deps --entrypoint sh -v './backend/migration-preflight.sh:/scripts/migration-preflight.sh:ro' backup /scripts/migration-preflight.sh`. Crea respaldo privado completo y una base fija QA; falla si esta ya existe. No ejecutar mientras se modifican archivos para exigir un punto de recuperación coherente.
- `docker compose run --rm --no-deps api node migration-copy-verify.js`: aplica sobre esa copia y compara fingerprints de todos los registros de aplicación sin imprimirlos; elimina exclusivamente la base QA. El respaldo queda en `.backups/`.
- `node data-integration.js`: aislamiento por cuenta, conflictos, archivos privados y descarga segura HTML.
- `node integration.js prepare`, reiniciar database/api sin recrear API entre fases, `node integration.js verify`: sesión persistida y logout; elimina solo su cuenta de prueba.

## Siguiente etapa

## Equipo real — etapa 2

`modules/workspaces.js` es el controlador, `workspace-service.js` gestiona invitaciones/cambios, `repositories/workspaces.js` encapsula lecturas y transacciones, `workspace-policy.js` define roles y protección del último administrador. La identidad viene de sesión, no del body. Lectura solo por miembro (404 para externos); administración solo por admin (403 para editor/revisor). Cada modificación bloquea la fila del espacio y vuelve a comprobar permisos, serializando cambios concurrentes. Lecturas usan FOR SHARE contra ese bloqueo.

`0002_workspace_invitations.sql` añade invitaciones y eventos, sin modificar los snapshots existentes. Tokens de 32 bytes aleatorios, solo digest SHA-256 persistido, devueltos una vez; aceptación por código POST, sin tokens en URLs/referrers, revocación/expiración/uso único y coincidencia de correo de sesión. Aceptación y evento son atómicos con pertenencia. No es verificación de correo. Nunca busca ni agrega usuarios por email sin su aceptación. Capacidad inicial 20 entre miembros e invitaciones pendientes: restricción operativa, no plan pago.

Equipo renderiza exclusivamente registros de estas APIs; referencias antiguas se muestran aparte y no adquieren permisos. Eventos recientes limitados a 30, sin endpoint para editar el historial. Permisos cubren SOLO administración del equipo; los recursos siguen privados por cuenta hasta la próxima migración. No emitir promesas de colaboración en proyectos ni correo enviado.

Pruebas adicionales: `workspace-integration.js` crea y elimina su base UUID QA. Comprueba permisos, códigos sin exposición en lecturas, coincidencia de correo, expiración/revocación/reutilización, último admin concurrente, retirada inmediata, actividad y capacidad.

## Próxima etapa

## Proyectos compartidos — etapa 3

`modules/shared-projects.js` controla HTTP; `shared-project-service.js` organiza casos de uso; `project-policy.js` valida límites y rol; `repositories/shared-projects.js` centraliza acceso transaccional y lectura de recursos. Algunas consultas del caso de uso permanecen en el servicio: separación incremental, no una arquitectura hexagonal completa.

`0003_shared_projects.sql` añade proyectos y comentarios sin modificar snapshots ni archivos privados. Toda lectura/escritura comprueba pertenencia al espacio dentro de una transacción con bloqueo compatible con cambios del equipo. La revocación impide consultas posteriores. CAS por revisión evita sobrescritura; request_id por autor/recurso permite reintentos idempotentes. Identidad y autor no se aceptan del cliente. Eventos del espacio registran creación, edición y cambios de comentarios.

`shared-project-integration.js` usa una base UUID aislada y cuatro cuentas: roles, externos, cruces entre espacios, autor falsificado, concurrencia, reintentos, revocación, persistencia tras reiniciar la API y conservación de snapshots/archivos privados. La UI es una vista independiente; no adapta ni migra la sala privada. Próximo incremento: archivos compartidos con autorización por espacio y versiones, antes de trasladar anotaciones/aprobaciones. SMTP y Google siguen pendientes.

Permisos reales de espacios compartidos, con políticas y repositorios de recursos. Migrar snapshots a entidades compartidas mediante expand-contract y pruebas de aislamiento entre espacios; sin borrar la copia por cuenta hasta verificar migración explícita. SMTP Zoho, validación de correo y Google siguen pendientes de configuración/implementación correspondiente.
