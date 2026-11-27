import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const component = name => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
test('personal and shared review composers keep audio, text and send actions in one message bar', () => {
  const personal = component('../main.jsx');
  const shared = component('SharedReviewRoom.jsx');
  assert.match(personal, /<div className="composer-message-bar has-reference"><AudioCommentInput/);
  assert.match(personal, /composer-message-bar[\s\S]*?onSend=\{add\}[\s\S]*?aria-label="Escribir comentario"/);
  assert.match(shared, /<div className="composer-message-bar"><AudioCommentInput/);
  assert.match(shared, /composer-message-bar[\s\S]*?canSend=\{Boolean\([\s\S]*?requestSubmit\(\)/);
  assert.doesNotMatch(shared, /Prioridad del comentario|composer-bottom/);
  assert.match(shared, /<PriorityCommands value=\{draft\.text\}/);
  assert.match(shared, /priority:parsed\.priority/);
});
test('WhatsApp-style icon controls remain accessible and retain recording status', () => {
  const audio = component('AudioCommentInput.jsx');
  assert.match(audio, /aria-label="Adjuntar MP3 u otro audio"/);
  assert.match(audio, /aria-pressed=\{recording\}/);
  assert.match(audio, /title=\{recording\?/);
  assert.match(audio, /role="status">Grabando/);
  assert.match(audio, /aria-hidden="true" viewBox="0 0 24 24"/);
});
test('composer bar maintains keyboard focus and 44px touch controls', () => {
  const css = component('comment-composer.css');
  assert.match(css, /composer-message-bar:focus-within/);
  assert.match(css, /:focus-visible\{outline:2px solid var\(--accent\)/);
  assert.match(css, /@media\(pointer:coarse\)[\s\S]*?height:44px;min-height:44px/);
  assert.doesNotMatch(css, /transition:\s*all/);
});
test('review comments panel can be collapsed and reopened with an accessible toggle',()=>{
 const source=component('../main.jsx'),shared=component('SharedReviewRoom.jsx'),css=component('comment-composer.css');
 assert.match(source,/comments-collapse-toggle[\s\S]*?aria-expanded=\{!collapsed\}/);
 assert.match(source,/commentsPanelCollapsed\?' comments-collapsed':''/);
 assert.match(source,/onToggleCollapsed=\{\(\)=>setCommentsPanelCollapsed/);
 assert.match(shared,/commentsPanelCollapsed \? "Mostrar comentarios" : "Ocultar comentarios"/);
 assert.match(shared,/aria-expanded=\{!commentsPanelCollapsed\}/);
 assert.match(shared,/onClick=\{\(\)=>setCommentsPanelCollapsed/);
 assert.match(css,/review-layout\.shared-original-review:has\(>\.comments-panel>\.panel-head>\.comments-collapse-toggle\[aria-expanded=false\]\)\{display:grid;grid-template-columns:minmax\(0,1fr\) 56px/,'collapsed comments should reserve a slim side rail instead of covering the delivery controls');
 assert.match(css,/shared-original-review:has\([\s\S]*?\)>.comments-panel\{display:flex;align-self:stretch;width:56px/,'the collapsed panel stays in its own grid column');
 assert.match(css,/shared-original-review:has\([\s\S]*?\)>.comments-panel \.comments-collapse-toggle\{position:static/,'the toggle is integrated into the rail rather than absolutely floating');
 assert.doesNotMatch(css,/top:130px;right:14px/,'the old overlay position must not return');
 assert.match(css,/@media\(max-width:780px\)[\s\S]*?comments-panel\.comments-collapsed/);
});
test('composer starts compact and reveals contextual help during composition',()=>{
 const css=component('comment-composer.css');
 assert.match(css,/composer-message-bar textarea:placeholder-shown\{height:52px;min-height:52px;max-height:52px;padding-block:4px;overflow-y:hidden\}/);
 assert.match(css,/comments-panel \.composer\{max-height:none;overflow:visible\}/);
 assert.match(css,/height:52px;min-height:52px;max-height:120px;padding:4px 2px;resize:none;line-height:20px/);
 assert.match(css,/composer-meta\{display:none\}/);
 assert.match(css,/:focus-within .composer-meta/);
 assert.match(css,/resize:none/);
 assert.match(component('MentionInput.jsx'),/placeholder:'Escribe un mensaje…',rows:1/);
});
test('focused composer keeps metadata out of normal flow and uses one focus treatment',()=>{
 const css=component('comment-composer.css');
 assert.match(css,/composer-meta\{display:flex;position:absolute/);
 assert.match(css,/composer-message-bar:focus-within\{outline:0;border-color:var\(--line-strong\);box-shadow:none\}/);
 assert.match(css,/box-shadow:inset 0 0 0 2px var\(--accent\)/);
 assert.match(css,/composer-input:has\(.composer-meta>button\) textarea\{padding-right:32px\}/);
});
test('priority commands remain connected and reference attachments stay available in personal review',()=>{
 const personal=component('../main.jsx'),shared=component('SharedReviewRoom.jsx');
 assert.match(personal,/priority:parsed.priority,text:parsed.text/);
 assert.match(shared,/text:parsed.text,[\s\S]*?attachments:[\s\S]*?priority:parsed.priority/);
 assert.match(personal,/title="Agregar imagen o captura"/);
 assert.match(personal,/aria-label="Filtrar por prioridad"/);
 assert.match(shared,/aria-label="Filtrar por prioridad"/);
 for(const command of ['/urgente','/bloqueo','/normal'])assert.ok(component('ShortcutHelp.jsx').includes(command));
});

test('shared review rail matches the compact local panel geometry',()=>{
 const css=component('review-comments-restored.css');
 assert.match(css,/shared-original-review\{--panel:390px\}/);
 assert.match(css,/shared-original-comments>\.panel-head\{[^}]*min-height:84px/);
 assert.match(css,/shared-original-comments \.comment-card\{padding:16px 0\}/);
 assert.match(css,/shared-original-comments \.restored-composer>\.composer-message-bar\{[^}]*display:grid;grid-template-columns:40px minmax\(0,1fr\) 40px/);
 assert.match(css,/shared-original-comments \.restored-composer>\.composer-message-bar \.audio-comment-input\{display:contents/);
 assert.match(css,/shared-original-comments \.restored-composer>\.composer-message-bar textarea\{[^}]*height:52px;min-height:52px/);
 assert.match(component('SharedReviewRoom.jsx'),/comment-toolbar"><div className="comment-tabs"[\s\S]*?comment-search/);
 assert.match(component('SharedReviewRoom.jsx'),/comment-toolbar">[\s\S]*?<label className="priority-filter">Prioridad/);
 assert.doesNotMatch(component('SharedReviewRoom.jsx'),/priorityMenuOpen/);
});
