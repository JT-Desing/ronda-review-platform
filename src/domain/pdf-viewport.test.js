import test from 'node:test';
import assert from 'node:assert/strict';
import {pdfFitScale} from './pdf-viewport.js';

test('PDF scale fits narrow mobile canvas without horizontal clipping',()=>{
  assert.equal(pdfFitScale(300,263),263/300);
});

test('PDF scale stays at the existing 900px desktop maximum',()=>{
  assert.equal(pdfFitScale(300,1200),3);
});

test('invalid measurements fall back to natural scale',()=>{
  assert.equal(pdfFitScale(0,320),1);
  assert.equal(pdfFitScale(300,Number.NaN),1);
});
