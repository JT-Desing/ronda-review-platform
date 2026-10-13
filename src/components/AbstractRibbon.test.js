import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {AbstractRibbon} from './AbstractRibbon.js';
test('ribbon renders decorative vector folds without raster assets or default motion',()=>{
 const html=renderToStaticMarkup(React.createElement(AbstractRibbon));
 assert.match(html,/<svg/);assert.match(html,/aria-hidden="true"/);
 assert.match(html,/<linearGradient/);assert.match(html,/<path/);
 assert.ok(!html.includes('<image'));assert.ok(!html.includes('is-animated'));
});
test('each section has a distinct ribbon contour, not just another position',()=>{
 const sections=['home','projects','pauta','planning','activity','team','branding','settings'];
 const outlines=sections.map(section=>renderToStaticMarkup(React.createElement(AbstractRibbon,{section})).match(/<path d="([^"]+)"/)[1]);
 assert.equal(new Set(outlines).size,8);
});
