import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DeliveryPositionPicker} from './DeliveryPositionPicker.js';

test('position picker exposes numbered destination buttons instead of native select',()=>{
  const html=renderToStaticMarkup(React.createElement(DeliveryPositionPicker,{name:'Fogata.png',index:1,count:4,onChange:()=>{}}));
  assert.ok(!html.includes('<select'));
  assert.match(html,/Cambiar posición de Fogata.png/);
  assert.match(html,/Mover a posición 4/);
  assert.match(html,/aria-pressed="true"/);
  assert.match(html,/type="button"/);
});
