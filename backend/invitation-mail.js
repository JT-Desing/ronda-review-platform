import {createInvitationLink} from './invitation-link.js';
import {transactionalEmail,rondaEmailLogoAttachment} from './email-template.js';

// Only called after the invitation transaction has committed.
export async function sendInvitationMail({mailer, origin, result}) {
  if (!mailer?.enabled) return {status:'unavailable'};
  try {
    const link=createInvitationLink(origin,result.token);
    const expiration=new Date(result.invitation.expires_at);
    const expires=Number.isNaN(expiration.valueOf())?'en siete días':new Intl.DateTimeFormat('es-CO',{dateStyle:'long',timeStyle:'short',timeZone:'America/Bogota'}).format(expiration);
    // With a name the link creates the account in one click, unless that address already has one.
    const oneClick=Boolean(result.invitation.name);
    const greeting=oneClick?`Hola, ${result.invitation.name}. `:'';
    const delivery = await mailer.send({
      to: result.invitation.email,
      subject: 'Te invitaron a un equipo en Ronda',
      text: `${greeting}Recibiste una invitación privada para colaborar en Ronda.\n\n${oneClick?'Abre este enlace y pulsa Entrar: tu cuenta queda lista sin contraseña. Si ya tienes cuenta en Ronda, inicia sesión con ella':'Abre este enlace para registrarte o iniciar sesión y entrar al equipo'}:\n${link}\nUsa la cuenta ${result.invitation.email}; la invitación requiere que el correo coincida.\n\nSi el enlace no abre el formulario, entra a ${new URL('/',origin).href}, ve a Proyectos → Unirme con un código de invitación y pega este código:\n\n${result.token}\n\nVence el ${expires}. Es de un solo uso y solo sirve para el correo invitado.\nSi no esperabas esta invitación, ignora este mensaje.`,
      html:transactionalEmail({
        preheader:'Tienes una invitación privada para colaborar en un espacio de Ronda.',
        eyebrow:'Invitación al equipo',title:'Te invitaron a colaborar en Ronda',
        paragraphs:[oneClick?`${greeting}Abre la invitación y pulsa Entrar para revisar y comentar con el equipo. No necesitas crear contraseña.`:`La invitación está dirigida a ${result.invitation.email}. Ábrela con esa misma cuenta para unirte al espacio.`],
        actionLabel:'Aceptar invitación',actionUrl:link,
        details:[`Este enlace es de un solo uso y vence el ${expires}.`,`Si el enlace no abre el registro, visita ${new URL('/',origin).href} y usa este código: <strong style="color:#f7f4fb;word-break:break-all;">${result.token}</strong>`],
      }),
      attachments:[rondaEmailLogoAttachment],
    });
    const accepted = delivery?.accepted?.some(address => String(address).toLowerCase() === result.invitation.email.toLowerCase());
    return {status:accepted ? 'accepted' : 'failed'};
  } catch { return {status:'failed'}; } // Never log tokens, credentials or SMTP responses.
}
