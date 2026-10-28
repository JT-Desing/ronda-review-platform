import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('PDF review code is loaded only when a PDF is opened and announces its loading state',()=>{
 const source=readFileSync(new URL('./DocumentReview.jsx',import.meta.url),'utf8');
 assert.match(source,/const loadPdfReview=\(\)=>import\('\.\/PdfReview\.jsx'\)/);
 assert.match(source,/<RetryableFeature load=\{loadPdfReview\}/);
 assert.match(source,/BrandLoader label="Cargando visor PDF…"/);
 assert.doesNotMatch(source,/import\s*\{\s*PdfReview\s*\}\s*from\s*['"]\.\/PdfReview\.jsx/);
});

test('secondary navigation and social preview use lazy chunks with branded fallbacks',()=>{
 const source=readFileSync(new URL('../main.jsx',import.meta.url),'utf8');
 for(const feature of ['Pauta','Planning','SocialPreview']){
  assert.match(source,new RegExp(`const load${feature}=\\(\\)=>import\\('./components/${feature}\\.jsx'\\)`));
  assert.match(source,new RegExp(`<RetryableFeature load=\\{load${feature}\\}`));
 }
 for(const label of ['Cargando Pauta…','Cargando planificación…','Cargando vista previa social…'])assert.ok(source.includes(label));
 assert.match(source,/import \{RetryableFeature\}/);
 assert.match(source,/retryView="pauta"/);
 assert.match(source,/retryView="planning"/);
 assert.match(source,/retryView="review" retryMedia=\{media\} retryMode="social"/);
});

test('failed lazy feature chunks expose an accessible retry and restore the affected route after a fresh load',()=>{
 const source=readFileSync(new URL('./FeatureLoadBoundary.jsx',import.meta.url),'utf8');
 assert.match(source,/getDerivedStateFromError/);
 assert.match(source,/role="alert"/);
 assert.match(source,/Reintentar carga/);
 assert.match(source,/onClick=\{this\.props\.onRetry\}/);
 assert.match(source,/React\.lazy\(load\)/);
 assert.match(source,/rememberFeatureRetry\(storage,\{view:retryView,mediaId:retryMedia\?\.id,versionId:retryMedia\?\.versionId,mode:retryMode\}\)/);
 assert.match(source,/else setAttempt\(value=>value\+1\)/);
 assert.match(source,/window\.location\.reload\(\)/);
});
