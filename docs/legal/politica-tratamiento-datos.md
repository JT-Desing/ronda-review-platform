# Política de tratamiento de datos personales de Ronda

Versión 1.0, vigente desde el [PENDIENTE: fecha de publicación].

Esta política cumple la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y las demás normas colombianas de protección de datos personales. Explica qué datos personales trata Ronda, para qué, con quién los comparte, por cuánto tiempo y cómo puedes ejercer tus derechos.

## 1. Responsable del tratamiento

- Razón social: [PENDIENTE]
- NIT: [PENDIENTE]
- Domicilio: [PENDIENTE: dirección y ciudad]
- Correo para temas de datos personales: ronda@repolite.link
- Sitio web: https://repolite.link

En esta política, "Ronda" se refiere a la plataforma de revisión de piezas creativas disponible en https://ronda.repolite.link, y "el Responsable" a la empresa identificada arriba.

## 2. Dos roles distintos: Responsable y Encargado

Ronda trata dos tipos de información, y el papel del Responsable cambia en cada caso:

- **Datos de las cuentas** (nombre, correo, acceso, plan y uso de la plataforma). Aquí el Responsable decide sobre el tratamiento y actúa como **Responsable**.
- **Contenido que suben los equipos** (piezas, archivos, comentarios, notas de voz y anotaciones). Ese contenido pertenece a la empresa o persona que lo sube, y puede incluir datos de terceros, por ejemplo una persona que aparece en un video. Sobre ese contenido el Responsable actúa como **Encargado**: lo guarda y lo procesa solo para prestar el servicio, siguiendo las instrucciones de la empresa usuaria. Esa empresa debe contar con la autorización de las personas que aparecen en su material.

## 3. Datos que se tratan

### 3.1 Datos que entregas al crear o usar tu cuenta

- Nombre y correo electrónico.
- Contraseña. No se guarda: se guarda un resumen irreversible (hash scrypt con sal).
- Si entras con Google: el identificador de tu cuenta de Google, tu nombre y tu correo verificado. No se reciben tus contactos, archivos ni otra información de Google.
- Plan de tu cuenta o de tu empresa, su estado y el espacio usado.

### 3.2 Datos que se generan al trabajar en Ronda

- Proyectos, piezas, versiones, comentarios, respuestas, anotaciones sobre imágenes, videos, documentos y páginas web, y decisiones de aprobación. Cada uno queda asociado a su autor y a una fecha.
- Notas de voz que grabes como comentario. Se guardan como audio para que el equipo las escuche. No se usan para identificar a nadie por su voz.
- Historial de actividad del equipo: quién invitó a quién, cambios de rol, aprobaciones y cambios de estado de los comentarios.

### 3.3 Datos de terceros que entrega un administrador

Cuando un administrador invita a una persona, entrega su correo y, si quiere, su nombre y el rol que tendrá. El administrador declara que tiene una relación con esa persona y que puede compartir esos datos con este fin. La invitación vence a los 7 días si nadie la usa.

### 3.4 Datos técnicos

- Una cookie de sesión (`ronda_session`) que mantiene tu acceso durante 7 días. Es esencial para que la plataforma funcione. Ronda no usa cookies de publicidad ni de analítica.
- La dirección IP de cada conexión, guardada solo como un resumen irreversible (hash), para limitar los intentos de acceso y proteger las cuentas. Se borra al día siguiente.
- Los registros técnicos del servidor web, que pueden incluir la dirección IP, la fecha y la ruta solicitada. Se usan para seguridad y diagnóstico.
- Una copia de respaldo de tus datos de trabajo en el almacenamiento local de tu navegador, para no perder cambios si se cae la conexión. Puedes borrarla limpiando los datos del sitio en tu navegador.

### 3.5 Enlaces a sitios externos

Cuando agregas un enlace a una revisión, el servidor de Ronda consulta esa dirección una vez para saber qué tipo de contenido es. Cuando abres el enlace en el visor, tu navegador se conecta directamente con ese sitio, que recibe tu conexión según su propia política.

### 3.6 Extensión "Ronda · Anotaciones web"

La extensión es opcional. En los sitios HTTPS que tú autorizas uno por uno, lee las dimensiones y el desplazamiento de la página y el texto que seleccionas para comentar, y se lo envía a la pestaña de Ronda que tienes abierta. Guarda en tu navegador qué sitios conectaste. No lee tu historial, no envía el contenido de las páginas a otros servidores y no se usa para publicidad.

### 3.7 Datos sensibles y de menores

Ronda no pide datos sensibles. Si una empresa sube material con datos sensibles de terceros, como imágenes de salud, es su responsabilidad tener la autorización correspondiente. Ronda está dirigida a mayores de 18 años y no recoge a sabiendas datos de menores.

## 4. Finalidades

Los datos se usan para:

1. Crear y mantener tu cuenta, permitirte el acceso y recuperar tu contraseña.
2. Prestar el servicio: guardar y mostrar piezas, comentarios, anotaciones y aprobaciones a las personas del equipo que tienen acceso.
3. Gestionar equipos: invitar personas, asignar roles y llevar el historial de actividad.
4. Aplicar el plan contratado: contar personas y espacio, y activar o suspender planes.
5. Enviar correos necesarios para el servicio: invitaciones, recuperación de contraseña y avisos sobre la cuenta.
6. Proteger la plataforma: limitar intentos de acceso, detectar usos indebidos y hacer copias de seguridad.
7. Atender tus solicitudes, consultas y reclamos.
8. Cumplir obligaciones legales y responder a autoridades competentes.

Ronda no vende datos personales ni los usa para publicidad.

## 5. Con quién se comparten los datos

Ronda se apoya en estos proveedores, que tratan datos solo para prestar su servicio:

| Proveedor | Para qué | Datos |
| --- | --- | --- |
| Cloudflare | Dominio, protección y túnel de conexión hacia el servidor | Tráfico de la plataforma, incluida la dirección IP |
| Zoho (correo) | Enviar invitaciones y correos de recuperación | Correo y nombre del destinatario, contenido del mensaje |
| Google | Inicio de sesión con Google, solo si lo eliges | Identificador, nombre y correo |
| Proveedor de almacenamiento compatible con S3 | Copias de seguridad cifradas fuera del servidor | Copia cifrada de la base de datos y los archivos |
| Proveedor de hosting | Servidor donde funciona Ronda | Todos los datos de la plataforma |

[PENDIENTE: confirmar el proveedor de hosting y el de copias externas antes de publicar.]

Dentro de un equipo, las personas con acceso ven tu nombre, tu correo, tu rol y lo que publicas en los proyectos que comparten.

## 6. Transferencia y transmisión internacional

Varios de estos proveedores tienen servidores fuera de Colombia, por ejemplo en Estados Unidos y la Unión Europea. Al aceptar esta política autorizas que tus datos se transmitan a esos países para las finalidades descritas, con las garantías de seguridad que exige la ley.

## 7. Por cuánto tiempo se guardan

| Dato | Plazo |
| --- | --- |
| Cuenta, proyectos y comentarios | Mientras la cuenta esté activa o hasta que pidas su supresión |
| Sesión | 7 días desde el último ingreso |
| Enlace de recuperación de contraseña | Vence a los 30 minutos; su registro se borra 7 días después |
| Invitación | Vence a los 7 días; queda en el historial del equipo |
| Resumen de la IP para limitar intentos | 1 día |
| Copias de seguridad en el servidor | 14 días |
| Copias de seguridad externas cifradas | Hasta unos 6 meses (últimas 4, 14 diarias, 8 semanales y 6 mensuales) |

Cuando suprimes tu cuenta, los datos salen de la plataforma de inmediato y desaparecen de las copias de seguridad cuando estas vencen, como máximo en unos 6 meses. Las copias no se usan para nada más que restaurar el servicio.

## 8. Seguridad

- Las contraseñas se guardan con hash scrypt y sal única.
- La cookie de sesión es HttpOnly, SameSite=Lax y, en producción, Secure.
- Cada equipo está aislado: una persona solo ve los proyectos de los equipos a los que pertenece y según su rol.
- Los archivos se guardan con permisos restringidos en el servidor, y las copias externas van cifradas.
- Los enlaces de invitación y de recuperación son de un solo uso y vencen.

Ningún sistema es infalible. Si ocurre un incidente que afecte tus datos, te lo informaremos y lo reportaremos a la Superintendencia de Industria y Comercio como exige la ley.

## 9. Tus derechos

Como titular de los datos tienes derecho a:

1. Conocer, actualizar y rectificar tus datos.
2. Pedir prueba de la autorización que diste.
3. Saber cómo se han usado tus datos.
4. Presentar quejas ante la Superintendencia de Industria y Comercio, después de agotar el trámite con el Responsable.
5. Revocar la autorización y pedir que se borren tus datos, cuando no exista un deber legal o contractual de conservarlos.
6. Acceder gratis a tus datos.

Para ejercerlos, escribe al correo de la sección 1.

## 10. Cómo ejercer tus derechos

Escribe a **ronda@repolite.link** con el asunto "Datos personales". Incluye tu nombre, el correo de tu cuenta, lo que pides y, si aplica, los documentos que lo soporten. Para proteger tu cuenta, responderemos al correo registrado en Ronda.

- **Consultas** (saber qué datos tenemos o cómo los usamos): respuesta en máximo 10 días hábiles. Si no alcanzamos, te avisamos el motivo y respondemos en máximo 5 días hábiles más.
- **Reclamos** (corregir, actualizar, suprimir o revocar): respuesta en máximo 15 días hábiles. Si el reclamo está incompleto, te pedimos lo que falta dentro de los 5 días siguientes; si no lo completas en 2 meses, se entiende desistido. Si no alcanzamos el plazo, te avisamos y respondemos en máximo 8 días hábiles más.

Si tu información forma parte del contenido de una empresa usuaria (sección 2), trasladaremos tu solicitud a esa empresa, que es la responsable de ese contenido, y te informaremos.

## 11. Autorización

Al crear tu cuenta o entrar por una invitación, Ronda te pide que aceptes esta política. Esa aceptación es tu autorización para el tratamiento descrito, y Ronda guarda la fecha y la versión aceptada como prueba.

## 12. Cambios a esta política

Si cambia algo importante, como una finalidad nueva o un proveedor nuevo, lo avisaremos en la plataforma o por correo antes de aplicarlo y, cuando la ley lo exija, pediremos de nuevo tu autorización.
