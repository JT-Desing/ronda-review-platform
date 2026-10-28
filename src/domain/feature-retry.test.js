import {test} from 'node:test';
import assert from 'node:assert/strict';
import {consumeFeatureRetry,consumeFeatureRetryView,rememberFeatureRetry,rememberFeatureRetryView} from './feature-retry.js';

function storage(){
 const values=new Map();
 return {values,setItem:(key,value)=>values.set(key,String(value)),getItem:key=>values.get(key)??null,removeItem:key=>values.delete(key)};
}

test('a failed Pauta or Planning lazy load returns to that feature after reload exactly once',()=>{
 for(const view of ['pauta','planning']){
  const session=storage();
  assert.equal(rememberFeatureRetryView(session,view),true);
  assert.equal(consumeFeatureRetryView(session,'home'),view);
  assert.equal(consumeFeatureRetryView(session,'home'),'home');
 }
});

test('retry restoration ignores unsupported routes and recovers from blocked session storage',()=>{
 const session=storage();
 assert.equal(rememberFeatureRetryView(session,'review'),false);
 session.setItem('ronda:feature-retry-view','review');
 assert.equal(consumeFeatureRetryView(session,'projects'),'projects');
 assert.equal(rememberFeatureRetryView({setItem(){throw Error('blocked')},getItem(){throw Error('blocked')}},'pauta'),false);
 assert.equal(consumeFeatureRetryView({getItem(){throw Error('blocked')}},'home'),'home');
});

test('PDF and social-preview retries preserve the selected asset and restore it once',()=>{
 const session=storage();
 assert.equal(rememberFeatureRetry(session,{view:'review',mediaId:'asset-qa-1',versionId:'asset-qa-1-v2',mode:'social'}),true);
 assert.deepEqual(consumeFeatureRetry(session),{view:'review',mediaId:'asset-qa-1',versionId:'asset-qa-1-v2',mode:'social'});
 assert.equal(consumeFeatureRetry(session),null);
 assert.equal(rememberFeatureRetry(session,{view:'review'}),false);
});
