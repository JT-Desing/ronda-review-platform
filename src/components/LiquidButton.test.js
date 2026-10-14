import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LiquidButton} from './LiquidButton.js';
test('liquid button keeps label outside the filtered surface and forwards disabled/type/ARIA',()=>{
 const html=renderToStaticMarkup(React.createElement(LiquidButton,{disabled:true,type:'submit','aria-expanded':false},'Invitar persona'));
 assert.match(html,/feGaussianBlur/);assert.match(html,/feColorMatrix/);
 assert.match(html,/<\/svg><span class="liquid-button-label">Invitar persona<\/span>/);
 assert.match(html,/disabled=""/);assert.match(html,/type="submit"/);assert.match(html,/aria-expanded="false"/);
});
