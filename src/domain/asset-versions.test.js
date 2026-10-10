import test from 'node:test';
import assert from 'node:assert/strict';
import {appendAssetVersion,versionsForAsset,resolveAssetVersion} from './asset-versions.js';
const initial=()=>({currentUserId:'u',projects:{p:{id:'p'}},assets:[{id:'a',projectId:'p',type:'image'}],versions:{'asset-a-v1':{id:'asset-a-v1',projectId:'p',number:1,reviewerIds:['u'],decisions:{u:'approved'}}},comments:{c:{versionId:'asset-a-v1',text:'Antes'}},annotations:{old:[]}});
const payload={assetId:'a',fileId:'new-file',name:'Nueva.png',type:'image'};
test('resuelve última versión y original histórico sin mezclar archivos',()=>{const s=appendAssetVersion(initial(),payload),asset=s.assets[0];assert.equal(resolveAssetVersion(s,asset).fileId,'new-file');assert.equal(resolveAssetVersion(s,asset,'asset-a-v1').fileId,'a');assert.equal(resolveAssetVersion(s,asset).id,'a')});
test('crea V2 con archivo independiente y sin copiar decisiones',()=>{const s=initial(),n=appendAssetVersion(s,payload,'2026-10-10');assert.equal(n.versions['asset-a-v2'].fileId,'new-file');assert.deepEqual(n.versions['asset-a-v2'].decisions,{});assert.equal(n.versions['asset-a-v1'].decisions.u,'approved');assert.equal(n.comments,s.comments);assert.equal(n.annotations,s.annotations);assert.equal(n.assets[0].activeVersionId,'asset-a-v2');assert.equal(s.assets[0].activeVersionId,undefined);assert.equal(versionsForAsset(n,'a').length,2)});
test('rechaza reutilizar archivo, pieza inexistente y cambio de tipo',()=>{const s=initial();for(const change of [{fileId:'a'},{assetId:'missing'},{type:'video'}])assert.equal(appendAssetVersion(s,{...payload,...change}),s)});
test('rechaza reintento duplicado sin crear V3',()=>{const n=appendAssetVersion(initial(),payload);assert.equal(appendAssetVersion(n,payload),n)});
