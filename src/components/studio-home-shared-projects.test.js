import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('home lists only team projects available to the signed-in user and opens the selected shared project',()=>{
  const source=readFileSync(new URL('./StudioWorkspace.jsx',import.meta.url),'utf8');
  assert.match(source,/api\('\/api\/workspaces'\)/);
  assert.match(source,/teamWorkspaces\(workspaces\)/);
  assert.match(source,/api\(`\/api\/workspaces\/\$\{encodeURIComponent\(workspace\.id\)\}\/projects`\)/);
  assert.match(source,/setSharedProjectLocation\(window,selected\.workspaceId,selected\.id\)/);
  assert.match(source,/Proyectos compartidos con tus equipos/);
  assert.match(source,/export function ProjectTile\(/,'home reuses the existing global project tile');
  assert.match(source,/studio-project-grid home-cards/,'team home cards should use the same global project-card layout');
  assert.match(source,/<ProjectTile key=\{`\$\{project\.workspaceId\}:\$\{project\.id\}`\} project=\{\{\.\.\.project,assets:\[\],assetCount:project\.assetCount,pending:project\.pending,status:project\.assetCount\?'in_review':'draft',palette:index%4\}\} canRename=\{false\} onOpen=\{selected=>setSharedProjectLocation\(window,selected\.workspaceId,selected\.id\)\}\/>/,'a team project card must show server stats and open its exact shared-project route');
  assert.match(source,/Los proyectos compartidos de los equipos a los que perteneces aparecerán aquí/);
  const main=readFileSync(new URL('../main.jsx',import.meta.url),'utf8');
  assert.match(main,/<StudioHome onNavigate=\{setCurrentView\}/,'home navigation must preserve the team-project route');
  assert.match(main,/onRouteSynced:hash=>\{setSharedLinkKey\(hash\);const view=readSharedProjectLink\(hash\)\?'projects':readStudioView\(hash\);if\(view\)\{setRequestedReviewVersion\(readReviewRoute\(hash\)\);setSharedDirty\(false\);setCurrentViewRaw\(view\);\}\}/,'internal route updates must switch the main view as well as remount the destination project');
});

test('shared project cards reuse the responsive project-card and keyboard-focus styles',()=>{
  const css=readFileSync(new URL('../studio-theme.css',import.meta.url),'utf8');
  const tile=readFileSync(new URL('./project-rename.css',import.meta.url),'utf8');
  assert.match(css,/\.studio-project-grid\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/@media\(max-width:680px\)[\s\S]*?\.studio-project-grid,\.home-cards[\s\S]*?grid-template-columns:1fr/);
  assert.match(tile,/project-open-hitarea:focus-visible\{outline:3px solid/);
});
