import test from 'node:test';
import assert from 'node:assert/strict';
import { finalizeAnnotation, toNormalizedPoint } from './annotations.js';

test('conserva la herramienta seleccionada al finalizar el gesto',()=>{
  const points=[{x:.1,y:.2},{x:.8,y:.7}];
  assert.equal(finalizeAnnotation('arrow','#fff',points).tool,'arrow');
  assert.equal(finalizeAnnotation('square','#fff',points).tool,'square');
  assert.equal(finalizeAnnotation('pen','#fff',points).tool,'pen');
});

test('normaliza y limita coordenadas al área visible',()=>{
  const rect={left:100,top:50,width:400,height:200};
  assert.deepEqual(toNormalizedPoint({clientX:300,clientY:150},rect),{x:.5,y:.5});
  assert.deepEqual(toNormalizedPoint({clientX:900,clientY:-20},rect),{x:1,y:0});
});

test('ignora gestos incompletos y texto vacío',()=>{
  assert.equal(finalizeAnnotation('square','#fff',[{x:.2,y:.2}]),null);
  assert.equal(finalizeAnnotation('type','#fff',[{x:.2,y:.2}],'   '),null);
});
