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
 assert.match(source,/\[workspaceId,projectId,assetId,requestedVersion,refresh\]/);
 assert.match(source,/await image.decode\(\)/);
 assert.match(source,/if\(loading\)return/);
 assert.doesNotMatch(source,/if\(selectedVersion!==versionId\)/);
 const videoBranch=source.indexOf("if(data.asset.kind==='video')");
 assert.ok(videoBranch>0&&videoBranch<source.indexOf('await response.blob()'),'video must use Range URL before any full download');
 assert.match(source.slice(videoBranch,source.indexOf('const response=await fetch')),/kind:'video'.*return;/);
});
