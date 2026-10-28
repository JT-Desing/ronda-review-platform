import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retainReviewView,reusableReviewMedia} from './reviewMediaCache.js';
test('refresh retains current view but an explicit different version never flashes old content',()=>{
 assert.equal(retainReviewView('v1',''),true);
 assert.equal(retainReviewView('v1','v1'),true);
 assert.equal(retainReviewView('v1','v2'),false);
 assert.equal(retainReviewView('',''),false);
});
test('reuse decoded media only for the identical version and resource',()=>{
 const media={url:'blob:qa'},cached={versionId:'v1',fileId:'f1',externalUrl:null,media};
 const data={version:{id:'v1',fileId:'f1',externalUrl:null}};
 assert.equal(reusableReviewMedia(cached,data),media);
 assert.equal(reusableReviewMedia(cached,{version:{...data.version,id:'v2'}}),null);
 assert.equal(reusableReviewMedia(cached,{version:{...data.version,fileId:'f2'}}),null);
 assert.equal(reusableReviewMedia(cached,{version:{...data.version,externalUrl:'https://example.org/'}}),null);
 assert.equal(reusableReviewMedia(null,data),null);
});
