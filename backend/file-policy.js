// The client rebuilds a Blob with the type we return, and some views render it
// in an unsandboxed iframe. Only types the UI shows through media elements or
// the PDF viewer keep their label; anything else could run as HTML/script on
// Ronda's origin, so it is served as opaque bytes.
const DISPLAYABLE = [/^image\/[a-z0-9.+-]+$/, /^video\/[a-z0-9.+-]+$/, /^audio\/[a-z0-9.+-]+$/, /^application\/pdf$/, /^text\/plain$/];
export function servedFileType(declared) {
  const type = String(declared ?? '').split(';')[0].trim().toLowerCase();
  return DISPLAYABLE.some(pattern => pattern.test(type)) ? type : 'application/octet-stream';
}
export function decodeFileName(header) {
  try { return decodeURIComponent(String(header ?? 'archivo')).slice(0, 255) || 'archivo'; }
  catch { return 'archivo'; }
}
