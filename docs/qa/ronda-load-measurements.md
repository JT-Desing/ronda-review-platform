# Mediciones HTTP del laboratorio QA

Datos locales de iteraciones mixtas, no métricas de producción ni rendimiento de usuarios reales. Solo peticiones concluidas: las esperas sin respuesta no figuran aquí y se registran aparte en la matriz de fallos. Los tiempos no incluyen renderizado completo, interacción ni velocidad de red de otras personas.

| Etapa | Peticiones | Errores HTTP | p50 ms | p95 ms | Máximo ms |
|---|---:|---:|---:|---:|---:|
| Datos de revisión | 192 | 2 | 9 | 22 | 113 |
| Entrega de medio | 109 | 0 | 6 | 8 | 18 |
| Finalización de carga | 4 | 0 | 16 | 18 | 18 |
| Inspección de enlace | 3 | 3 | 5010 | 72297 | 72297 |
| Otras peticiones | 362 | 2 | 5 | 20 | 80 |
| Reserva de carga | 6 | 1 | 11 | 21 | 21 |
| Transferencia de archivo | 5 | 1 | 12 | 16 | 16 |

Transferencia y finalización se miden por separado. Sin registro de bytes ni duración completa del gesto de subir, no se calcula ancho de banda ni tiempo total de carga. Errores esperados de permisos y formato también cuentan en Errores HTTP. No se incluyen tokens, correos ni contenido privado.

## Fases en cliente (instrumentación local)

La interfaz registra User Timing (`performance.measure`) con una lista fija de nombres: `upload.reserve`, `upload.transfer`, `upload.finalize`, `delivery.refresh`, `review.preview-fetch`, `review.preview-buffer`, `review.image-decode` y `review.preview-ready`. No se envían al backend ni incluyen ruta, usuario, nombre/tamaño de archivo, URL o contenido. Los consumidores pueden inspeccionar `performance.getEntriesByType('measure')` en la sesión local y calcular sus propias métricas; no se agregan aquí métricas de navegador reales porque la automatización no ejecutó una carga desde selector de archivos en este ciclo. Pruebas unitarias cubren lista permitida, errores no fatales y propagación del error original de la operación.

## Recorrido de empresa y proyecto en UI (Inés QA, 2026-10-16)

Petición por petición del loopback QA para la identidad sintética de incorporación (`persona=6`); se calculó p50/p95 por endpoint solo con respuestas HTTP 2xx. Son tiempos del servidor QA local, no del render del navegador ni de producción:

| Endpoint | N | p50 ms | p95 ms | Máximo ms |
|---|---:|---:|---:|---:|
| `GET /api/auth/session` | 7 | 1 | 13 | 13 |
| `GET /api/data` | 6 | 2 | 5 | 5 |
| `GET /api/workspaces` | 15 | 2 | 11 | 11 |
| `POST /api/workspaces` | 1 | 16 | 16 | 16 |
| `GET /api/workspaces/:id/projects` | 7 | 8 | 9 | 9 |
| `POST /api/workspaces/:id/projects` | 1 | 8 | 8 | 8 |

La API local no parece explicar una espera alta en este recorrido QA, pero no permite inferir cómo cargan los dispositivos/red de Johana o Jaime ni cómo se comporta ePayco MKT. No se consultaron ni alteraron sistemas de producción.

## Lectura nueva de telemetría QA (últimas 24 h al 2026-10-16)

Se recalculó desde el JSONL local ya existente (`timings.jsonl`) después de la última sesión UI: 2,246 respuestas concluidas de nueve identidades sintéticas; no incluye duración del navegador ni solicitudes que nunca terminaron. Las rutas se anonimizan sustituyendo UUID por `:id` y se agrupan sin parámetros ni cuerpos.

| Ruta / fase | N | p50 ms | p95 ms | Máximo ms | Respuestas no 2xx |
|---|---:|---:|---:|---:|---:|
| `GET /api/workspaces/:id/media/:id` (entrega de medio) | 322 | 7 | 9 | 21 | 0 |
| `GET .../assets/:id/versions` (datos de revisión; incluye revisiones y lecturas) | 471 | 8 | 21 | 90 | 3 |
| `GET .../assets` (parrilla/lista de piezas) | 104 | 7 | 10 | 38 | 0 |
| `GET .../versions/:id/comments` | 148 | 8 | 22 | 25 | 0 |
| `GET /api/workspaces/:id/projects` | 177 | 8 | 42 | 73 | 0 |
| `POST .../projects/:id/assets` (crear/importar enlace) | 3 | 915 | 1,481 | 1,481 | 0 |
| `POST /api/links/inspect` | 5 | 1,286 | 5,022 | 5,022 | 2 (400) |

Los dos 400 de inspección fueron solicitudes inválidas; no demuestran un fallo de enlace público válido. Los 401 de comentario (2) son sesión no autorizada/expirada; los 403 de papelera (2) corresponden a permisos y están cubiertos como rechazo. El máximo de 1,481 ms al crear/importar enlace parte de solo tres observaciones, insuficiente para una conclusión de rendimiento. `POST /api/auth/register` tuvo 4 respuestas 200 y un 400 de validación; `PUT /api/data` tuvo 14 respuestas 200 y 2 cuerpos 400 rechazados. No se encontró en estas respuestas una demora elevada del stream local, pero faltan cargas reales por selector, mediciones de bytes, navegadores de Johana/Jaime y red/de dispositivo de usuarios.

## Relectura de QA por endpoint (ventana móvil al 2026-10-17 12:47 UTC)

Se recalculó sobre las 2,012 filas del logger aislado entre 2026-10-16 12:47 y 2026-10-17 12:47 UTC. En las rutas que el logger conserva (método, ruta con UUID reemplazado, status y duración; sin cuerpos ni query strings) hubo 5 respuestas sobre 1 s y ninguna sobre 5 s. Las cinco duraron 2.010–2.025 ms y coinciden con R52, que inyecta deliberadamente 2 s por petición en la identidad QA `persona=0`; no son latencia espontánea ni de usuario real.

| Endpoint QA | N | Errores HTTP | p50 ms | p95 ms | Máximo ms | Lectura |
|---|---:|---:|---:|---:|---:|---|
| `GET .../assets` | 103 | 0 | 8 | 19 | 2,024 | Máximo durante R52 artificial |
| `GET .../assets/trash` | 94 | 1 | 13 | 21 | 2,025 | Máximo durante R52 artificial; el error pertenece a otras operaciones/validaciones |
| `GET .../assets/:id/versions` | 146 | 3 | 9 | 26 | 2,023 | Máximo durante R52 artificial |
| `GET .../versions/:id` | 143 | 0 | 8 | 9 | 2,010 | Máximo durante R52 artificial |
| `GET .../versions/:id/comments` | 143 | 0 | 8 | 20 | 2,010 | Máximo durante R52 artificial |
| `POST /api/links/inspect` | 2 | 0 | 332 | 344 | 344 | Dos observaciones válidas recientes |
| `POST .../assets` | 2 | 0 | 319 | 344 | 344 | Dos importaciones; no basta para inferir rendimiento general |
| `GET /api/workspaces/:id/projects` | 128 | 0 | 8 | 20 | 78 | Datos de proyectos del laboratorio |
| Reserva de carga (`POST .../uploads`) | 8 | 0 | 20 | 52 | 52 | IDs sintéticos; tamaños de archivo no registrados |
| Transferencia (`PUT .../content`) | 8 | 0 | 12 | 49 | 49 | Duración HTTP del cuerpo; no se registró cantidad de bytes |
| Finalización (`POST .../complete`) | 8 | 0 | 16 | 27 | 27 | Persistencia/metadatos tras la transferencia |

El máximo histórico de 72,297 ms de inspección de enlaces pertenece al 2026-10-15 y queda fuera de esta ventana; no se presenta como rendimiento actual. La fuente vigente de `inspectLink` contiene deadline total de 12 s, límite DNS de 5 s y cancelación del request, con pruebas que verifican aborto y mensaje recuperable. La serie reciente aporta dos muestras de inspección solamente. Estas mediciones no demuestran tiempos de carga para Johana/Jaime: faltan sus navegadores, red y tamaños/bytes de archivos reales; no se deben solicitar ni usar datos privados de producción para inferirlo.

## Revisión del runtime QA (2026-10-17)

Resumen recalculado de 392 peticiones observadas desde medianoche UTC en el runtime aislado: los datos de sesión tienen p95 9 ms (N=26), lista de espacios 11 ms (N=86), lista de proyectos 37 ms (N=39; máximo 75 ms), inventario de piezas 9 ms (N=22), papelera 18 ms (N=19), comentarios/versión p95 20 ms (N=7) y lectura de medios 8 ms (N=6). Estos son tiempos server-side dentro de la máquina local; las muestras de interacción visual son pequeñas y no sustituyen medidas de red/render cliente.

`POST /api/links/inspect` tuvo dos muestras, ambas con error de proveedor/conectividad (una respuesta en 10 ms, otra a 5,024 ms por el timeout DNS); por tamaño no calculo p95. La verificación DNS de `example.com` repetida el 2026-10-17 volvió a agotar el tiempo. No convierto esta limitación externa en fallo de la app ni cambio la política de seguridad; el caso sigue PARTIAL hasta poder usar DNS/red pública fiable. No hubo cargas de archivo desde el selector durante esta ventana: Edge bloqueó la transferencia local por la preferencia de extensión, por lo que no hay medición visual de upload fresco en esta ronda.

## Revisión adicional de telemetría y baseline de transferencia sintética (2026-10-17)

Recalculé el JSONL local (5,823 respuestas; última fila 20:16:17Z). En las últimas 24 h hubo 1,379 respuestas, pero **ninguna fase de upload** (`/uploads`, `/content`, `/complete`); las últimas observaciones persistentes son del 2026-10-16 15:54:30Z. Históricamente aparecen 17 reservas (p50 19 ms, p95 52 ms, max 52; una validación 400), 15 transferencias (p50 13 ms, p95 49 ms, max 49; una firma MIME 415) y 14 finalizaciones (p50 16 ms, p95 27 ms, max 27; todas 200). No hay cargas frescas de usuarios ni del selector que expliquen las demoras reportadas; no se usó telemetría de ePayco/Johana/Jaime.

Para cubrir la etapa HTTP sin tocar el storage persistente, ejecuté `node backend/shared-review-qa-runner.js upload-performance-qa-integration.js`. El runner creó y borró un contenedor PostgreSQL temporal etiquetado y `reviewFixture` eliminó su raíz de archivos temporal. Con un payload sintético opaco de PNG-signature más padding, hice tres repeticiones por tamaño; todas las reservas/transferencias/finalizaciones fueron 201/200/200:

| Tamaño | Reserva mediana | Transferencia mediana | Finalización mediana | Throughput de transferencia mediano |
|---|---:|---:|---:|---:|
| 1 MiB | 42.07 ms | 43.59 ms | 47.23 ms | 22.94 MiB/s |
| 10 MiB | 20.94 ms | 74.76 ms | 40.23 ms | 133.76 MiB/s |
| 50 MiB | 17.73 ms | 184.74 ms | 36.46 ms | 270.65 MiB/s |

Esto es solo loopback de la misma máquina y mide API/storage, no ancho de banda WAN, velocidad de disco de Johana/Jaime, decode/preview en browser, ni archivos de imagen visualmente válidos. El payload usa firma PNG solo para ejercitar el contrato de transferencia y se destruyó al terminar. Resultado: no se reproduce un cuello de botella de servidor en este baseline sintético; la causa de una carga lenta percibida por usuarias sigue sin estar verificada hasta medir su navegador, red, bytes y la etapa cliente. ePayco quedó intacto.

## Retest del baseline sintético (2026-10-18)

Repetí la misma matriz con 3 muestras por tamaño y runner fresco desechable. Las 9 reservas/transferencias/finalizaciones finalizaron con 201/200/200. Medianas por etapa en ms (reserva / transferencia / finalización) y throughput mediano:

| Tamaño | Reserva / transferencia / finalización mediana | Throughput mediano |
|---|---:|---:|
| 1 MiB | 19.87 / 20.84 / 16.03 | 47.99 MiB/s |
| 10 MiB | 9.18 / 31.56 / 18.73 | 316.88 MiB/s |
| 50 MiB | 9.37 / 83.98 / 22.38 | 595.35 MiB/s |

Estos resultados siguen siendo loopback local y una muestra pequeña, no evidencia de WAN ni de la sesión de Johana/Jaime. Ayudan a acotar que el API/storage sintético responde rápido en este host; para saber por qué a ellas les tarda, hace falta instrumentación de cliente o una carga reproducible en su propio navegador/red con su autorización, sin inspeccionar datos privados de sus archivos.
