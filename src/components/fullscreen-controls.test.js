import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('fullscreen includes a labelled exit inside the fullscreen subtree',()=>{
 const source=readFileSync(new URL('./OriginalMediaStage.jsx',import.meta.url),'utf8');
 const stage=source.slice(source.indexOf('<div className="media-stage"'),source.indexOf('<div className={`player-controls'));
 assert.match(stage,/aria-label="Salir de pantalla completa"/);
 assert.match(stage,/onClick=\{toggleFullscreen\}/);
 assert.match(source,/e.key==='Escape'&&document.fullscreenElement===stageRef.current/);
});
