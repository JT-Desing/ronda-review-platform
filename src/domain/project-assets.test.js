import test from 'node:test';
import assert from 'node:assert/strict';
import {assetsForProject,projectAssetOrder} from './project-assets.js';
const assets=[{id:'a',projectId:'p'},{id:'b',projectId:'q'},{id:'c',projectId:'p'}];
test('filtra piezas por proyecto',()=>assert.deepEqual(assetsForProject(assets,'p').map(a=>a.id),['a','c']));
test('ordena un proyecto sin mover piezas ajenas',()=>assert.deepEqual(projectAssetOrder(assets,'p',['c','a']),['c','b','a']));
test('rechaza órdenes incompletos y piezas de otro proyecto',()=>{assert.deepEqual(projectAssetOrder(assets,'p',['b','a']),['a','b','c']);assert.deepEqual(projectAssetOrder(assets,'p',['a']),['a','b','c'])});
