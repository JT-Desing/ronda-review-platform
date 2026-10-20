# Validación de producción del 20 de octubre de 2026

## Resultado parcial

El objetivo integral permanece abierto. No se certifica ausencia de vulnerabilidades ni se sustituyen los pendientes por pruebas aisladas.

## Disponibilidad

Al retomar, Docker estaba detenido y el dominio respondió 530. Se abrió Docker Desktop y los contenedores existentes de producción se recuperaron con sus políticas de reinicio; no se recrearon bases ni se modificaron volúmenes. La comprobación posterior del dominio devolvió 200. La disponibilidad depende actualmente de que este PC y Docker permanezcan encendidos: apagar el PC deja este despliegue sin origen disponible.

## Seguridad comprobada en el dominio

El script `scripts/production-security-smoke.mjs` ejecuta diez peticiones secuenciales sin sesión, sin carga masiva y sin escrituras autenticadas. La pasada de las 12:59 UTC del 20 de octubre aprobó las diez comprobaciones:

- Cabeceras CSP, HSTS, nosniff, Referrer Policy, X Frame Options y Permissions Policy presentes.
- Sesión anónima sin usuario y respuesta no almacenable.
- Datos personales, equipos y piezas del proyecto sintético inaccesibles sin sesión: 401.
- Escrituras con origen ajeno o sin origen: 403.
- JSON inválido: 400 controlado, sin traza de pila.
- Las rutas de archivos de configuración probadas devolvieron el HTML de la aplicación, no archivos sensibles. El 200 es fallback SPA, no prueba de exposición de secretos.

Se corrigió el auditor: la ruta real de datos es `/api/data`, no `/api/account-data`. La primera comprobación de esa ruta inexistente era un falso fallo de la prueba, no un defecto de autorización.

## Correo real

Se envió un único mensaje de prueba sin credenciales ni enlaces de acceso al buzón expresamente autorizado por el usuario. La configuración SMTP se verificó; el transporte reportó un destinatario aceptado y ninguno rechazado. Se confirmó en Gmail el mensaje con referencia `RONDA-SMTP-20261020-01`, entregado en INBOX el 20 de octubre a las 08:00 de Bogotá. Authentication Results informa SPF, DKIM y DMARC pass; TLS 1.3 aparece en el salto hacia Gmail. No se guardan en Git la dirección privada, cabeceras completas, tokens ni credenciales.

El buzón no tiene una cuenta registrada en esta instancia. La solicitud de recuperación previa devolvió 202 genérico sin generar correo, comportamiento esperado contra enumeración. Por ello N09 sigue parcial para solicitud UI, enlace de recuperación y cambio final de contraseña con revocación de sesión. El usuario debe introducir y enviar la nueva contraseña personalmente.

## Pruebas funcionales ya ejecutadas en producción

El 19 de octubre se creó un equipo separado de validación y un proyecto explícitamente sintético, sin modificar los proyectos existentes. Se subió una imagen de fixture, se publicó un comentario sintético en V1 y se cargó V2. V2 mostró cero comentarios; al seleccionar V1 reapareció el comentario original y su imagen. La interfaz informa actualización manual entre sesiones; no se acredita sincronización en tiempo real. El retest posterior a reinicio, papelera/restauración, roles en sesiones independientes y los otros recorridos siguen pendientes.

## Evidencia de código y límites

Las huellas del servidor coinciden con el checkout para seguridad criptográfica, recuperación, importación de enlaces y servicio de medios compartidos. La revisión de código muestra scrypt con sal, tokens aleatorios de 32 bytes y hashes de tokens; verificación de pertenencia y rol en servidor; URLs HTTPS públicas con comprobación DNS/destino en cada redirección; iframe externo sandbox sin same origin. Esto es evidencia de implementación, no prueba de explotación en producción.

Las diferencias de API conocidas en `app.js` y `modules/auth.js` corresponden al soporte optativo de `platformRole`, todavía no desplegado. Ninguna cuenta recibió superadmin. La interfaz deniega los ejemplos por defecto. No se modificó DNS, política DMARC ni configuración SMTP.

Las 249 pruebas frontend pasan. La suite backend termina con código 0. No se ejecutó escaneo de dependencias contra un servicio externo, restauración de backup ni pruebas de carga/fuerza bruta en producción.

## Pendientes prioritarios

1. Comprobar persistencia y actualización desde dos sesiones sobre el proyecto sintético tras el reinicio.
2. Ejecutar papelera/restauración, comentarios/anotaciones y permisos con identidades de pruebas independientes en producción.
3. Completar recuperación de una cuenta registrada con intervención del usuario para la nueva contraseña.
4. Auditar dependencias e imágenes con inventario y fuentes de avisos actuales; no declarar cero vulnerabilidades sin ello.
5. Verificar recuperación de backup en destino aislado y acordar alojamiento independiente del PC para disponibilidad continua.
6. Cerrar las entregas documentales y evidencia de los recorridos; no presentar una grabación como sustituto de una prueba.
