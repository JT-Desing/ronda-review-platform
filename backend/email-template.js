import { readFileSync } from 'node:fs';

const rondaLogo=readFileSync(new URL('./ronda-logo-v3.png',import.meta.url));
export const rondaEmailLogoAttachment={filename:'ronda-logo.png',content:rondaLogo,cid:'ronda-mark@ronda'};
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

export function transactionalEmail({ preheader, eyebrow, title, paragraphs, actionLabel, actionUrl, details = [] }) {
  const safeUrl = escapeHtml(actionUrl);
  const content = paragraphs.map(paragraph => `<p style="margin:0 0 16px;color:#c9c4d5;font:15px/1.65 Arial,Helvetica,sans-serif;">${escapeHtml(paragraph)}</p>`).join('');
  const detailContent = details.map(detail => `<p style="margin:0 0 12px;color:#c9c4d5;font:14px/1.6 Arial,Helvetica,sans-serif;">${detail}</p>`).join('');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#0d0b12;padding:32px 12px;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#14111a;border:1px solid #332d3b;border-radius:20px;overflow:hidden;">
<tr><td style="padding:28px 32px 12px;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td width="38" valign="middle"><img src="cid:ronda-mark@ronda" width="34" height="34" alt="Ronda" style="display:block;width:34px;height:34px;border:0;object-fit:contain;"></td><td style="padding-left:9px;color:#f7f4fb;font:bold 22px Arial,Helvetica,sans-serif;letter-spacing:-.5px;">Ronda</td></tr></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;"><tr><td width="58%" height="2" bgcolor="#c9adff"></td><td width="42%" height="2" bgcolor="#e9a7dc"></td></tr></table></td></tr>
<tr><td style="padding:16px 32px 32px;"><p style="margin:0 0 10px;color:#c9adff;font:bold 11px/1.4 Arial,Helvetica,sans-serif;letter-spacing:1.8px;text-transform:uppercase;">${escapeHtml(eyebrow)}</p><h1 style="margin:0 0 18px;color:#f7f4fb;font:bold 28px/1.2 Arial,Helvetica,sans-serif;letter-spacing:-.6px;">${escapeHtml(title)}</h1>
${content}<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0 22px;"><tr><td bgcolor="#c9adff" style="border-radius:999px;"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;color:#17121e;text-decoration:none;font:bold 15px Arial,Helvetica,sans-serif;">${escapeHtml(actionLabel)}</a></td></tr></table>
${detailContent}<p style="margin:22px 0 0;padding-top:18px;border-top:1px solid #332d3b;color:#938b9e;font:12px/1.6 Arial,Helvetica,sans-serif;">Este mensaje se envió automáticamente desde Ronda. Si no esperabas esta notificación, puedes ignorarla.</p></td></tr></table>
<p style="margin:18px 0 0;color:#766e82;font:12px/1.5 Arial,Helvetica,sans-serif;">Ronda · Revisión y colaboración creativa</p>
</td></tr></table></body></html>`;
}
