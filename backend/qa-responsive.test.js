import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {injectQaDiagnostics,responsiveQaHtml} from './qa-responsive.js';

test('diagnostic bootstrap is injected before application scripts and captures only structural error data',()=>{
  const html=injectQaDiagnostics('<html><head></head><body><script type="module" src="/app.js"></script></body></html>');
  assert.ok(html.indexOf('MutationObserver.prototype.observe')<html.indexOf('src="/app.js"'));
  assert.match(html,/ronda-qa-diagnostic/);
  assert.match(html,/targetNodeType/);
  assert.doesNotMatch(html,/innerHTML|localStorage|document\.body\.textContent/);
});

test('diagnostic insertion requires an HTML document',()=>{
  assert.throws(()=>injectQaDiagnostics('not html'),/require an HTML document/);
});

test('MutationObserver diagnostics report stack/target shape and rethrow the original exception',()=>{
  const html=injectQaDiagnostics('<html><head></head><body><script src="/app.js"></script></body></html>');
  const bootstrap=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(bootstrap);
  const reports=[];
  const listeners={};
  const failure=new TypeError('parameter 1 is not of type Node');
  class FakeMutationObserver{observe(){throw failure;}}
  runInNewContext(bootstrap,{
    MutationObserver:FakeMutationObserver,
    parent:{postMessage:(message,targetOrigin)=>reports.push({message,targetOrigin})},
    location:{origin:'http://127.0.0.2:24201',pathname:'/'},
    addEventListener:(name,listener)=>{listeners[name]=listener;},
  });
  const target={nodeType:undefined};
  assert.throws(()=>new FakeMutationObserver().observe(target,{}),error=>error===failure);
  assert.equal(reports.length,1);
  assert.equal(reports[0].targetOrigin,'http://127.0.0.2:24201');
  assert.equal(reports[0].message.kind,'MutationObserver.observe');
  assert.equal(reports[0].message.detail.targetNodeType,null);
  assert.equal(reports[0].message.detail.targetConstructor,'Object');
  assert.match(reports[0].message.detail.stack,/parameter 1 is not of type Node/);
  assert.equal(typeof listeners.error,'function');
  assert.equal(typeof listeners.unhandledrejection,'function');
  assert.doesNotMatch(JSON.stringify(reports),/private page text/);
});

test('diagnostic wrapper preserves successful observer call receiver, arguments and return value',()=>{
  const html=injectQaDiagnostics('<html><head></head><body><script src="/app.js"></script></body></html>');
  const bootstrap=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  let observed;
  class FakeMutationObserver{observe(...args){observed={receiver:this,args};return 23;}}
  runInNewContext(bootstrap,{MutationObserver:FakeMutationObserver,parent:{postMessage(){}},location:{origin:'http://127.0.0.2:24201',pathname:'/'},addEventListener(){}});
  const observer=new FakeMutationObserver(),node={nodeType:1},options={childList:true};
  assert.equal(observer.observe(node,options),23);
  assert.equal(observed.receiver,observer);
  assert.deepEqual(observed.args,[node,options]);
});

test('responsive diagnostic mode is explicit, targets QA route and validates frame message source in page',()=>{
  const ordinary=responsiveQaHtml({selected:[393,852],hash:'#team/11111111-1111-4111-8111-111111111111',diagnostics:false});
  assert.doesNotMatch(ordinary,/qaDiagnostics|qa-diagnostics/);
  const diagnostic=responsiveQaHtml({selected:[393,852],hash:'#team/11111111-1111-4111-8111-111111111111',diagnostics:true});
  assert.match(diagnostic,/\?qaDiagnostics=1#team/);
  assert.match(diagnostic,/event\.source!==frame\.contentWindow/);
  assert.match(diagnostic,/event\.origin!==location\.origin/);
  assert.match(diagnostic,/textContent/);
  assert.match(diagnostic,/String\.fromCharCode\(10\)/);
  assert.doesNotMatch(diagnostic,/innerHTML/);
});

test('responsive diagnostic mode observes parent errors while redacting query, hash and error message',()=>{
  const diagnostic=responsiveQaHtml({selected:[393,852],hash:'#team/11111111-1111-4111-8111-111111111111',diagnostics:true});
  const bootstrap=diagnostic.match(/<pre id="qa-diagnostics"[^>]*>[^<]*<\/pre>\s*<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(bootstrap);
  assert.match(bootstrap,/frame:'parent'/);
  assert.match(bootstrap,/MutationObserver\.prototype\.observe/);
  const reports=[];
  const listeners={};
  const panel={textContent:'QA diagnostics'};
  class FakeMutationObserver{observe(){throw new TypeError('sensitive page text must not be collected');}}
  runInNewContext(bootstrap,{
    MutationObserver:FakeMutationObserver,
    URL,
    location:{origin:'http://127.0.0.20:24201',href:'http://127.0.0.20:24201/qa/responsive?secret=query#private',pathname:'/qa/responsive'},
    document:{getElementById:id=>id==='qa-diagnostics'?panel:null},
    addEventListener:(name,listener)=>{listeners[name]=listener;},
  });
  const error=new Error('sensitive page text must not be collected');
  error.stack='Error: sensitive page text must not be collected\n    at render (http://127.0.0.20:24201/assets/review.js?secret=query#private:5:7)\n    at thirdParty (https://third.example.org/lib.js?secret=query:2:1)';
  listeners.error({filename:'http://127.0.0.20:24201/assets/review.js?secret=query#private',lineno:5,colno:7,error});
  const observed=panel.textContent.slice('QA diagnostics'.length);
  assert.match(observed,/"frame":"parent"/);
  assert.match(observed,/"filename":"\/assets\/review\.js"/);
  assert.match(observed,/"errorType":"Error"/);
  assert.match(observed,/\/assets\/review\.js:5:7/);
  assert.match(observed,/<external>:2:1/);
  assert.doesNotMatch(observed,/secret|private|sensitive page text|\?secret|#private/);
  assert.equal(typeof listeners.unhandledrejection,'function');
  assert.equal(reports.length,0);
});

test('parent MutationObserver diagnostic rethrows without collecting error message or page content',()=>{
  const diagnostic=responsiveQaHtml({selected:[393,852],hash:'#team/11111111-1111-4111-8111-111111111111',diagnostics:true});
  const bootstrap=diagnostic.match(/<pre id="qa-diagnostics"[^>]*>[^<]*<\/pre>\s*<script>([\s\S]*?)<\/script>/)?.[1];
  const panel={textContent:''};
  const failure=new TypeError('private customer content');
  failure.stack='TypeError: private customer content\n    at observe (http://127.0.0.20:24201/qa/wrapper.js?token=hidden:8:2)';
  class FakeMutationObserver{observe(){throw failure;}}
  runInNewContext(bootstrap,{
    MutationObserver:FakeMutationObserver,URL,
    location:{origin:'http://127.0.0.20:24201',href:'http://127.0.0.20:24201/qa/responsive',pathname:'/qa/responsive'},
    document:{getElementById:id=>id==='qa-diagnostics'?panel:null},addEventListener(){},
  });
  const target={nodeType:undefined};
  assert.throws(()=>new FakeMutationObserver().observe(target,{}),error=>error===failure);
  assert.match(panel.textContent,/MutationObserver\.observe/);
  assert.match(panel.textContent,/"targetConstructor":"Object"/);
  assert.match(panel.textContent,/\/qa\/wrapper\.js:8:2/);
  assert.doesNotMatch(panel.textContent,/private customer|token=hidden|\?token/);
});
