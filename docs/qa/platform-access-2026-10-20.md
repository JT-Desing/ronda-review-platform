# Accesos de plataforma e invitaciones

Implementado y desplegado el 20 de octubre de 2026 por solicitud del propietario.

## Reglas

- Un único ID de cuenta autenticada recibe `platformRole=superadmin`. La identidad fue confirmada explícitamente por el usuario y corresponde a una cuenta existente. Una configuración con varios IDs distintos deniega ese permiso a todos.
- Equipo, Configuración y Personalización quedan fuera de navegación lateral, móvil y menús personales para el resto de cuentas. Los enlaces directos muestran acceso restringido sin montar esas vistas.
- Inicio, Pauta, Proyectos, Actividad, Planificación, espacio personal y revisión continúan disponibles según los permisos y pertenencia existentes.
- La lectura del panel administrativo del equipo y las mutaciones de miembros se reservan al superadministrador en servidor. Esto no convierte el rol editable de equipo en permiso global.
- Los administradores de un equipo pueden invitar desde Proyectos a ese equipo. La API existente comprueba pertenencia y rol de administrador antes de crear la invitación. Editores, revisores y cuentas externas no reciben una excepción.
- Se permite aceptar invitaciones desde Proyectos, sin necesidad de abrir Equipo. El correo de invitación usa esta nueva instrucción y el alta desde enlace conserva su recorrido.
- Las invitaciones muestran estado de aceptación SMTP y el código privado de un solo uso en la sesión que lo creó. No se guarda ese código en logs ni en este informe.
- No se cambió la pertenencia ni los roles de ningún miembro. El superadministrador no recibe por este cambio acceso automático a los archivos personales privados de otras cuentas.

## Despliegue y recuperación

El servidor usa `compose.epayco.yaml` junto con `compose.platform-owner.yaml`. Es necesario conservar ambos al recrear la API; omitir el segundo desactiva la asignación global por defecto. La configuración SMTP y base de datos existente se reutilizó sin cambiar credenciales. Se creó un dump previo en `.backups/role-policy-20261020/database.dump` y una imagen de rollback `ronda-epayco-mkt-api:rollback-role-policy-20261020`. No hubo nuevas migraciones.

La comprobación dentro de la API desplegada contó un solo superadministrador, coincidente con el correo confirmado, y tres cuentas ordinarias. La API reportó healthy tras recreación. Se publicó el frontend, se copió su artefacto a `dist` de QA y se comprobó igualdad de scripts/estilos entre dominio y origen local.

## Verificación y límites

256 pruebas frontend aprobadas. Suite backend aprobada; diez pruebas focalizadas comprobaron la exclusión de administradores de equipo del permiso global, denegación por varios IDs, rutas reservadas, validación de cuerpos y rol necesario para invitar. El smoke anónimo de diez controles de seguridad pasó después del despliegue.

La herramienta de navegador sigue bloqueada por sus recursos locales. No se declara verificado visualmente el nuevo formulario ni un envío de invitación desde dos identidades reales de producción. No se enviaron invitaciones durante estas pruebas ni se hicieron cambios a cuentas reales para probar roles.

Las preferencias personales viajan en el documento privado genérico de cada cuenta: la restricción de sus pantallas no es una prohibición general de escribir ese documento, necesario para guardar proyectos y comentarios privados. Ningún campo de ese documento concede `platformRole` ni permisos de equipo.
