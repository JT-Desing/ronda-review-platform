# Participantes y canales de proyecto — 2026-10-20

## Comportamiento publicado

- Al crear un proyecto compartido se puede mantener todo el equipo o seleccionar miembros existentes y asignar Editor/Revisor.
- El creador y administradores del equipo conservan acceso; el rol de proyecto nunca amplía los permisos del equipo. Un revisor de equipo no puede convertirse en editor de proyecto.
- El creador con permisos de edición y los administradores pueden actualizar participantes desde el proyecto. Revisión concurrente protegida con revision/409.
- Compartir ofrece copiar enlace, correo (mailto) y WhatsApp (wa.me). Abre un mensaje preparado: no envía automáticamente, no crea usuarios y no concede acceso por poseer el enlace.
- La migración 0012 es aditiva. Proyectos existentes siguen visibles para su equipo; no se modificaron miembros ni proyectos reales para probar.

## Evidencia

- Frontend: 260/260 pruebas; backend: 101/101.
- Integración HTTP en PostgreSQL temporal: selección y aislamiento entre cuatro identidades, roles efectivos, listado, comentarios, archivos directos, subida/finalización, revocación, roles inválidos, idempotencia y conflicto de revisión. PASS.
- Integración de medios concurrentes: cinco identidades, tres subidas simultáneas, cinco comentarios, versiones/decisiones/orden/papelera/restauración y conflictos. PASS.
- Ambas imágenes Docker construidas correctamente. API de producción saludable; migración informa migrations_ok 1.
- Diez comprobaciones no destructivas de seguridad en dominio público: PASS (2026-10-20T19:12Z). No equivale a certificación de seguridad.
- Seis recursos iniciales JS/CSS idénticos entre dominio público y origen local por SHA-256; artefacto también copiado a dist local para QA. No se afirma validación funcional de un servidor QA separado.
- Revisión visual e interacción mediante navegador pendientes: la herramienta de control no está disponible. Las pruebas HTTP no sustituyen esa revisión.

## Operación y recuperación

Copia previa local privada: .backups/project-members-20261020/database.dump; index anterior en before.html; imagen API anterior etiquetada before-project-members-20261020. No contienen entregables para Git.

IMPORTANTE: una versión antigua del backend no interpreta las restricciones de proyecto. No regresar a ella después de crear proyectos restringidos: expondría esos proyectos al equipo completo. Una recuperación requiere mantener el backend con control de participantes o una corrección hacia delante; no restaurar la base antigua sobre datos nuevos sin una decisión explícita del operador.

No se enviaron correos ni mensajes WhatsApp en estas pruebas. Producción permanece encendida.
