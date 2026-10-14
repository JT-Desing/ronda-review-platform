// Only called after the invitation transaction has committed.
export async function sendInvitationMail({mailer, origin, result}) {
  if (!mailer?.enabled) return {status:'unavailable'};
  try {
    const delivery = await mailer.send({
      to: result.invitation.email,
      subject: 'Te invitaron a un equipo en Ronda',
      text: `Recibiste una invitación privada para colaborar en Ronda.\n\nAbre ${new URL('/',origin).href}\nRegístrate o inicia sesión con ${result.invitation.email}.\nEn Equipo → Unirme a otro espacio, pega este código:\n\n${result.token}\n\nVence el ${new Date(result.invitation.expires_at).toISOString()}. Es de un solo uso y solo sirve para el correo invitado.\nSi no esperabas esta invitación, ignora este mensaje.`,
    });
    const accepted = delivery?.accepted?.some(address => String(address).toLowerCase() === result.invitation.email.toLowerCase());
    return {status:accepted ? 'accepted' : 'failed'};
  } catch { return {status:'failed'}; } // Never log tokens, credentials or SMTP responses.
}
