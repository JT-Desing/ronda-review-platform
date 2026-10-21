import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('share dialog contains focus, restores trigger and explains clipboard failure',()=>{
 const source=readFileSync(new URL('./ShareProjectButton.jsx',import.meta.url),'utf8');
 assert.match(source,/containDialogFocus/);
 assert.match(source,/triggerRef\.current\?\.focus/);
 assert.match(source,/No se pudo copiar/);
});
test('media shortcuts ignore interactive controls and modal dialogs',()=>{
 const source=readFileSync(new URL('./OriginalMediaStage.jsx',import.meta.url),'utf8');
 assert.match(source,/ignoreReviewShortcut/);
});
test('read-only review keeps keyboard playback controls and failed images leave the loader',()=>{
 const source=readFileSync(new URL('./OriginalMediaStage.jsx',import.meta.url),'utf8');
 const shortcuts=source.slice(source.indexOf('const handler=e=>{'),source.indexOf("window.addEventListener('keydown'"));
 assert.match(shortcuts,/canPlayback&&key===' '/);
 assert.match(shortcuts,/canPlayback&&key==='arrowleft'/);
 assert.match(shortcuts,/canPlayback&&key==='f'/);
 assert.match(shortcuts,/if\(readonly\)return/);
 assert.match(source,/onError=\{\(\)=>\{setFailedUrl\(media\.url\);setReadyUrl\(media\.url\);\}\}/);
});
test('native audio playback stays synchronized with the review controls',()=>{
 const source=readFileSync(new URL('./OriginalMediaStage.jsx',import.meta.url),'utf8');
 const audio=source.slice(source.indexOf("media?.type==='audio'&&<audio"),source.indexOf("media?.type==='pdf'&&<iframe"));
 assert.match(audio,/muted=\{muted\}/);
 assert.match(audio,/onPlay=\{\(\)=>\{setPlaying\(true\);setPlaybackError\(''\);\}\}/);
 assert.match(audio,/onPause=\{\(\)=>setPlaying\(false\)\}/);
 assert.match(audio,/onEnded=\{\(\)=>setPlaying\(false\)\}/);
 assert.match(audio,/onLoadedMetadata=\{e=>media\.setDuration\?\.\(e\.currentTarget\.duration\)\}/);
 assert.match(source,/aria-label=\{media\?\.type==='audio'\?'Posición del audio':'Posición del video'\}/);
 assert.match(source,/media\?\.type==='video'&&<span className="fps">24 FPS<\/span>/);
});
test('rejected playback start reports a recoverable message and resets the play state',()=>{
 const source=readFileSync(new URL('./OriginalMediaStage.jsx',import.meta.url),'utf8');
 assert.match(source,/attempt&&typeof attempt\.catch==='function'\)attempt\.catch\(playbackFailed\)/);
 assert.match(source,/catch \{ playbackFailed\(\); \}/);
 assert.match(source,/const playbackFailed=\(\)=>\{setPlaying\(false\);setPlaybackError\('No se pudo iniciar la reproducción/);
 assert.match(source,/media&&playbackError&&failedUrl!==media\.url&&<span className="media-brand-loading" role="alert">\{playbackError\} Usa Reproducir para volver a intentarlo/);
 assert.match(source,/useEffect\(\(\)=>\{setPlaybackError\(''\);setPlaying\(false\);\},\[media\?\.url\]\)/);
});
test('annotation area can be focused and operated without a pointer',()=>{
 const source=readFileSync(new URL('./AnnotationLayer.jsx',import.meta.url),'utf8');
 assert.match(source,/tabIndex=\{activeTool\?0:-1\}/);
 assert.match(source,/Área de anotación con \$\{activeTool\}/);
 assert.match(source,/e\.key==='Enter'/);
 assert.match(source,/e\.key==='Escape'/);
 assert.match(source,/\['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'\]/);
 assert.match(source,/keyboardPoints\.current=activeTool==='pen'/);
});
test('approved versions expose annotation tools as disabled and announce read-only status',()=>{
 const source=readFileSync(new URL('./OriginalMediaStage.jsx',import.meta.url),'utf8');
 assert.match(source,/versionApproved\?['"]Versión aprobada · solo lectura/);
 assert.match(source,/button key=\{tool\} disabled=\{readonly\}/);
 assert.match(source,/button key=\{c\} disabled=\{readonly\}/);
 assert.match(source,/aria-label="Herramientas de anotación"/);
});
test('mobile review controls expose comfortable touch targets',()=>{
 const css=readFileSync(new URL('./original-media-stage.css',import.meta.url),'utf8');
 assert.match(css,/@media\(max-width:780px\).*shared-original-review \.original-media-stage \.player-controls>button\{min-width:44px;min-height:44px\}/);
 assert.match(css,/shared-review-room \.topbar \.approval\{min-width:44px;min-height:44px;height:44px\}/);
 assert.match(css,/shared-original-review \.original-media-stage \.color-options button\{width:44px;height:44px;min-width:44px;min-height:44px/);
 assert.match(css,/figure-pin\{width:44px;height:44px\}/);
 assert.match(css,/shared-original-review \.comments-panel\.shared-original-comments \.comment-card>button:not\(\.comment-location\)[^\{]+\{min-height:44px;height:44px\}/);
 assert.match(css,/restored-composer \.audio-comment-input button\{min-height:44px;height:44px\}/);
 assert.match(css,/shared-original-review \.shared-review-people button\{min-height:44px\}/);
 assert.match(css,/shared-original-review \.delivery-grid \.upload-button\{min-width:44px;min-height:44px\}/);
});
test('mobile reviewer-save action overrides the compact desktop button height',()=>{
 const css=readFileSync(new URL('./shared-review-layout-fix.css',import.meta.url),'utf8');
 assert.match(css,/@media\(max-width:780px\)\{\.app-shell \.shared-projects \.shared-original-review \.shared-review-people>label\{box-sizing:border-box;min-height:44px\}\.app-shell \.shared-projects \.shared-original-review \.shared-review-people>button\{min-height:44px\}\}/);
});
test('tablet review controls retain 44px touch targets despite compact base styles',()=>{
 const css=readFileSync(new URL('./shared-review-layout-fix.css',import.meta.url),'utf8');
 const accountCss=readFileSync(new URL('./account-access.css',import.meta.url),'utf8');
 assert.match(accountCss,/\.account-profile-action,\.account-profile-links button\{[^}]*min-height:44px/);
 assert.match(accountCss,/\.account-profile-trigger\{[^}]*min-height:44px/);
 assert.match(css,/\.shared-review-room \.delivery-position-options button\{min-width:44px\}/);
 assert.match(css,/\.shared-review-room \.annotation-tools>button\{box-sizing:border-box;width:44px;height:44px;min-width:44px;min-height:44px\}/);
 assert.match(css,/\.shared-review-room \.comment-tabs button\{box-sizing:border-box;height:44px;min-height:44px\}/);
 assert.match(css,/\.shared-review-room \.comment-search input\{box-sizing:border-box;height:44px;min-height:44px\}/);
});
test('attached and saved comment audio controls meet tablet/mobile target height',()=>{
 const css=readFileSync(new URL('./shared-review-layout-fix.css',import.meta.url),'utf8');
 assert.match(css,/@media\(max-width:780px\)\{\.app-shell \.shared-projects \.shared-review-room \.comment-attachments audio,\.app-shell \.shared-projects \.shared-review-room \.audio-draft audio\{box-sizing:border-box;height:44px;min-height:44px\}\}/);
});
test('team delivery upload action is not collapsed by the generic compact upload rule',()=>{
 const css=readFileSync(new URL('./delivery-grid-polish.css',import.meta.url),'utf8');
 assert.match(css,/delivery-grid\.storyboard \.delivery-add-actions>\.upload-button\{[^}]*width:auto;min-width:120px;min-height:44px;[^}]*font-size:12px/);
});
test('session recovery moves initial focus past the read-only account field',()=>{
 const source=readFileSync(new URL('./AccountAccess.jsx',import.meta.url),'utf8');
 assert.match(source,/requestAnimationFrame\(focusPassword\)/);
 assert.match(source,/readOnly tabIndex=\{-1\}/);
});
test('shared projects resume a failed read after session recovery without discarding work',()=>{
 const source=readFileSync(new URL('./SharedProjects.jsx',import.meta.url),'utf8');
 assert.match(source,/addEventListener\('ronda-session-restored',resume\)/);
 assert.match(source,/if\(!hasPending&&!busy\)setRefresh/);
});
test('shared project comment editing and replies stay compact inside the comments column',()=>{
 const css=readFileSync(new URL('./shared-review-layout-fix.css',import.meta.url),'utf8');
 assert.match(css,/\.shared-projects \.shared-original-comments \.comment-card>form:not\(\.inline-reply\)\{display:grid;grid-template-columns:repeat\(2,max-content\);justify-content:start/);
 assert.match(css,/\.shared-original-comments \.comment-card>form:not\(\.inline-reply\) textarea\{[^}]*box-sizing:border-box;width:100%;min-width:0/);
 assert.match(css,/\.shared-original-comments \.comment-card>form\.inline-reply\{display:flex;flex-wrap:nowrap/);
 assert.match(css,/\.shared-original-comments \.comment-card>form\.inline-reply input\{[^}]*min-width:0/);
});
