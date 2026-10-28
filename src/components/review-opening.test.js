import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('asset lookup is loading, never an empty project before the response',()=>{
 const source=readFileSync(new URL('./SharedProjectMedia.jsx',import.meta.url),'utf8');
 assert.match(source,/\[loading,setLoading\]=useState\(true\)/);
 assert.match(source,/if\(loading\)return/);
 assert.ok(source.indexOf('if(loading)return')<source.indexOf('if(selected)return'));
});
test('review room loads its selected version without a second initial request and waits for media',()=>{
 const source=readFileSync(new URL('./SharedReviewRoom.jsx',import.meta.url),'utf8');
 assert.match(source,/\[workspaceId,projectId,assetId,requestedVersion,refresh,permissionRevision\]/);
 assert.match(source,/await measurePhase\('review\.image-decode',\(\)=>image\.decode\(\)\)/);
 assert.match(source,/if\(loading&&!room\)return/);
 assert.match(source,/if\(!retainReviewView\(cachedMedia.current\?\.versionId,requestedVersion\)\)\{setMedia\(null\);setRoom\(null\);\}/);
 assert.match(source,/reusableReviewMedia\(cachedMedia.current,data\)/);
 assert.doesNotMatch(source,/if\(selectedVersion!==versionId\)/);
 const videoBranch=source.indexOf("if(data.asset.kind==='video')");
 const bufferBranch=source.indexOf("const blob=await measurePhase('review.preview-buffer'");
 assert.ok(videoBranch>0&&videoBranch<bufferBranch,'video must use Range URL before any full download');
 assert.match(source.slice(videoBranch,source.indexOf('const response=await fetch')),/kind:'video'.*return;/);
});
test('review refresh also synchronizes the shared delivery grid without leaving the active room',()=>{
 const media=readFileSync(new URL('./SharedProjectMedia.jsx',import.meta.url),'utf8');
 const room=readFileSync(new URL('./SharedReviewRoom.jsx',import.meta.url),'utf8');
 const grid=readFileSync(new URL('./SharedDeliveryGrid.jsx',import.meta.url),'utf8');
 assert.match(media,/async function refreshDelivery\(\)/);
 assert.match(media,/if\(operation\.current\|\|assetRefresh\.current\|\|reviewDirty\.current\)return/);
 assert.match(media,/setAssets\(active\.assets\);setTrash\(deleted\.assets\)/);
 assert.match(media,/onRefreshDelivery=\{refreshDelivery\}/);
 assert.match(room,/onRefreshDelivery\?\.\(\)/);
 assert.match(grid,/Actualizando piezas del equipo/);
 assert.match(grid,/blocked=busy\|\|refreshing/);
});
