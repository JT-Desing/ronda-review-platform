# Revisión de seguridad, persistencia e infraestructura

Fecha: 2026-10-15. Rama revisada: `feature/shared-review` (6927144).

Pruebas al momento de la revisión: backend 39/39, frontend 86/86. `npm audit` y `pnpm audit` sin vulnerabilidades conocidas.

## Estado de ramas

- `main` va 21 commits detrás de `feature/shared-review`.
- El PR #1 (cabeceras de seguridad y archivos) se fusionó en `automation/comments-panel-redesign`, no en `main`. Si GitHub Pages despliega desde `main`, esos arreglos no están publicados.

## Seguridad

Bien resuelto: scrypt con comparación en tiempo constante, sesiones guardadas como hash, cookie `HttpOnly`/`Secure`/`SameSite=Lax`, verificación de `Origin` en métodos distintos de GET, SQL parametrizado, OAuth de Google con PKCE y nonce, validación de firma de bytes en medios compartidos y consulta de enlaces con IP fijada (evita DNS rebinding).

Hallazgos, de mayor a menor prioridad:

1. Bloqueo de login para todos: `backend/modules/auth.js` tiene un límite global de 60 intentos por minuto. Con 61 peticiones por minuto nadie entra. El límite por correo permite bloquear a una persona concreta. Falta límite por IP, y nginx no reenvía `CF-Connecting-IP`.
2. `inspectLink` corre dentro de `repository.access(..., true)` en `shared-media-service.js`, con `FOR UPDATE` sobre el espacio. Puede bloquear todo el espacio hasta unos 32 s (4 redirecciones de 8 s) y retener una de las 10 conexiones del pool.
3. Enumeración de cuentas: registrar un correo existente responde 409 con mensaje propio (`auth-service.js`).
4. Contenedores sin endurecer: nginx del frontend corre como root, ningún servicio tiene `read_only`, `cap_drop`, `no-new-privileges` ni límites de memoria. El token de Cloudflare va en la línea de comando y aparece en `docker inspect`.
5. `backend/Dockerfile` copia `*.js`, así que la imagen incluye fixtures y scripts de QA.
6. `sessions`, `auth_attempts` y `oauth_states` nunca se limpian. `GET /api/auth/google` inserta filas sin sesión.
7. CI solo despliega Pages. No corre pruebas ni auditoría; las actions no están fijadas por SHA.

## Persistencia

Bien resuelto:

- PostgreSQL en volumen con nombre y `fsync` por defecto. Escrituras en transacción, control de revisión (CAS) y `request_id` para reintentos idempotentes.
- Datos privados del navegador (`src/state/accountStorage.js`): copia local antes de enviar, aviso al cerrar con cambios pendientes, un 409 no sobrescribe y hay opción de recuperar o descargar la copia.
- Migraciones transaccionales con advisory lock y checksum.
- `backend/backup-verify.sh` restaura el último respaldo en una base temporal.

Problemas:

1. Los archivos subidos no se sincronizan a disco antes del `rename` y el `COMMIT` (`modules/files.js`, `storage/local.js`). PostgreSQL sí hace fsync de su commit. Si se corta la luz (riesgo real en el PC), la base puede registrar un archivo que quedó vacío o truncado. Arreglo: `filehandle.sync()` antes de renombrar y fsync del directorio.
2. Los respaldos quedan en el mismo disco (`./.backups`). Si falla el disco del PC se pierde todo, original y copia.
3. Cada respaldo diario hace un tar completo de todos los archivos y se guardan 14 días. Con 3 GB de medios son unos 42 GB de respaldos. En un disco de 60 GB se llena pronto, y con el disco lleno PostgreSQL deja de aceptar escrituras.
4. Pérdida máxima de datos (RPO) de 24 horas. Un comentario hecho a las 9:00 se pierde si el disco falla a las 8:59 del día siguiente.
5. El volcado de la base y el tar de archivos no salen del mismo instante, y `backup-verify.sh` no comprueba que cada fila de `files`/`shared_media_files` tenga su archivo.
6. Los audios de comentarios se guardan como `bytea` en PostgreSQL y `/api/data` reescribe hasta 20 MB de JSON por guardado. Inflan la base, el autovacuum y cada respaldo.
7. `docker compose down -v` borra los volumes. No hay procedimiento escrito para mover los datos del PC a otro servidor.

## Escalamiento

Horizontal:

- Bloqueo principal: archivos en disco local. `storage/local.js` ya es una abstracción reemplazable por S3/R2, pero `modules/files.js` escribe directo al filesystem.
- `container_name` fijo en `compose.yaml` impide `--scale`.
- El limpiador de cargas (`setInterval` en `server.js`) correría en cada réplica.
- A favor: sesiones y límites en PostgreSQL, migraciones con lock, nginx resuelve `api` dinámicamente.

Vertical:

- Pool fijo en 10 conexiones (`database.js`), sin `statement_timeout` en ejecución.
- scrypt usa el threadpool de libuv (4 hilos): ajustar `UV_THREADPOOL_SIZE`.
- El `FOR UPDATE` por espacio en cada escritura serializa el trabajo de un mismo cliente.
- `orderAssets` hace un UPDATE por pieza; `listVersions` tiene N+1.
- Sin logs estructurados, ID de petición ni métricas.

## Clean code

- Estilo mezclado: parte del backend y del JSX está escrita en líneas muy densas (`shared-media-service.js`, `modules/shared-review.js`, `main.jsx`). Falta ESLint y Prettier.
- Enrutador manual con regex e índices (`parts[9]`) en `app.js` y `modules/shared-review.js`.
- SQL de límite de intentos repetido 4 veces; extraer `rateLimiter(key, max, window)`.
- `google.js` lee `process.env` al importarse, a diferencia del resto que recibe dependencias en `createApp`.
- La raíz de `backend/` mezcla código, pruebas, fixtures y scripts (unos 80 archivos). Separar `src/`, `test/`, `scripts/`.
- `package.json` del frontend usa `"latest"` para react, vite y el plugin.
- PNG de 1,3 a 1,5 MB en `src/` se empaquetan sin optimizar.
- La presencia en vivo de revisores está simulada en `main.jsx`.

## Plan para Lightsail

Planes de referencia (fuentes de terceros, julio 2026, confirmar en AWS):

| Plan | RAM | vCPU | SSD | Transferencia |
|---|---|---|---|---|
| USD 12 | 2 GB | 2 | 60 GB | 3 TB |
| USD 24 | 4 GB | 2 | 80 GB | 4 TB |

Consumo esperado del stack en reposo: PostgreSQL 150 a 300 MB, API 100 a 200 MB, nginx y cloudflared menos de 100 MB. Cabe en 2 GB con estas condiciones:

1. No compilar en la instancia. `vite build` y `npm ci` pueden agotar 2 GB. Construir las imágenes en GitHub Actions, publicarlas en GHCR y en el servidor solo hacer `docker compose pull`.
2. Swap de 2 GB como margen ante picos.
3. `mem_limit` por servicio y PostgreSQL ajustado a la máquina (`shared_buffers` cerca de 256 MB, `max_connections` bajo).
4. Respaldos fuera de la instancia: base y archivos a almacenamiento de objetos con una herramienta incremental (restic o similar), no tar completo diario. Snapshots automáticos de Lightsail como segunda capa.
5. Arreglar el fsync de archivos (problema 1 de persistencia) antes de migrar.
6. Alerta de disco al 70 %. El disco es el límite que se alcanzará primero, antes que CPU o RAM.

Cuándo pasar al plan de USD 24: memoria usada sostenida sobre 75 % con swap activo, disco sobre 70 % después de mover respaldos fuera, o tiempos de respuesta que suben con varios revisores a la vez.

Alternativa para estirar el plan de USD 12: mover los medios a almacenamiento de objetos (Cloudflare R2 no cobra salida de datos y ya se usa Cloudflare para el túnel). Así el disco de la instancia solo guarda la base y deja de ser el límite. Requiere un adaptador S3 para `storage/local.js` y que `modules/files.js` use esa misma abstracción.
