// Renders docs/legal/*.md into public/legal/*.html, so the policies have a public
// HTTPS address inside the app. Covers the Markdown the policies use: headings,
// paragraphs, lists, tables, bold, inline code and links.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const pages = [
  { source: 'politica-tratamiento-datos.md', target: 'tratamiento-de-datos.html' },
  { source: 'politica-privacidad.md', target: 'privacidad.html' },
];
const links = Object.fromEntries(pages.map(page => [page.source, page.target]));
const escape = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function inline(text) {
  return escape(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => `<a href="${links[href] || href}">${label}</a>`)
    .replace(/(^|[\s(])(https:\/\/[^\s<)]+[^\s<).,])/g, '$1<a href="$2">$2</a>')
    .replace(/([\w.+-]+@[\w-]+\.[\w.]+[a-z])/g, '<a href="mailto:$1">$1</a>');
}

export function render(markdown) {
  const out = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const heading = line.match(/^(#{1,3}) (.+)$/);
    if (heading) { out.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); i++; continue; }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = row => row.slice(1, -1).split('|').map(cell => inline(cell.trim()));
      const [head, , ...body] = rows;
      out.push(`<div class="table"><table><thead><tr>${cells(head).map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${cells(r).map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const list = line.match(/^(-|\d+\.) /);
    if (list) {
      const tag = list[1] === '-' ? 'ul' : 'ol';
      const items = [];
      while (i < lines.length && /^(-|\d+\.) /.test(lines[i])) items.push(lines[i++].replace(/^(-|\d+\.) /, ''));
      out.push(`<${tag}>${items.map(item => `<li>${inline(item)}</li>`).join('')}</${tag}>`);
      continue;
    }
    const paragraph = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3} |\||-|\d+\. )/.test(lines[i])) paragraph.push(lines[i++]);
    out.push(`<p>${inline(paragraph.join(' '))}</p>`);
  }
  return out.join('\n');
}

export function page(markdown) {
  const title = markdown.match(/^# (.+)$/m)[1];
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
<style>
:root{color-scheme:dark;--bg:#0d0e0c;--text:#f1eee7;--muted:#979c8e;--line:#2d3029;--accent:#c9adff}
body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:760px;margin:0 auto;padding:48px 16px 80px}
h1{font-size:clamp(28px,5vw,40px);line-height:1.15;margin:0 0 8px}
h2{font-size:22px;margin:40px 0 8px}h3{font-size:17px;margin:28px 0 6px}
p,li{color:#d6d2c9}a{color:var(--accent)}code{font-size:.92em;color:var(--text)}
.table{overflow-x:auto;margin:16px 0}table{border-collapse:collapse;width:100%;font-size:14px}
th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}th{color:var(--text)}
.back{display:inline-block;margin-bottom:24px;color:var(--muted);text-decoration:none}
</style>
</head>
<body>
<main>
<a class="back" href="/">Volver a Ronda</a>
${render(markdown)}
</main>
</body>
</html>
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await mkdir(new URL('../public/legal/', import.meta.url), { recursive: true });
  for (const { source, target } of pages) {
    const markdown = await readFile(new URL(`../docs/legal/${source}`, import.meta.url), 'utf8');
    await writeFile(new URL(`../public/legal/${target}`, import.meta.url), page(markdown));
    console.log(`public/legal/${target}`);
  }
}
