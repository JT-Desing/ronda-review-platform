import test from 'node:test';
import assert from 'node:assert/strict';
import {measurePhase,recordPhaseDuration} from './performanceTelemetry.js';

function clock(){let time=10;const measures=[];return {measures,api:{now:()=>time,measure:(name,options)=>measures.push({name,...options}),advance:ms=>{time+=ms;}}};}

test('records allowlisted upload and preview phases without attaching operation data',async()=>{
 const {api,measures}=clock();
 const result=await measurePhase('upload.transfer',async()=>{api.advance(37);return 'ok';},api);
 assert.equal(result,'ok');assert.deepEqual(measures,[{name:'ronda.upload.transfer',start:10,duration:37}]);
 assert.equal(recordPhaseDuration('review.image-decode',4,api),true);
 assert.equal(recordPhaseDuration('upload.transfer',4,api),true);
 assert.deepEqual(measures.slice(1),[{name:'ronda.review.image-decode',start:43,duration:4},{name:'ronda.upload.transfer',start:43,duration:4}]);
});

test('measures failing phases without swallowing the original failure',async()=>{
 const {api,measures}=clock();
 await assert.rejects(measurePhase('upload.finalize',async()=>{api.advance(12);throw new Error('synthetic failure');},api),/synthetic failure/);
 assert.deepEqual(measures,[{name:'ronda.upload.finalize',start:10,duration:12}]);
});

test('anchors a real User Timing entry to the measured phase, not navigation start',()=>{
 const api=globalThis.performance,name='ronda.upload.transfer';api.clearMeasures(name);
 const duration=10,phaseStart=api.now()-duration;
 assert.equal(recordPhaseDuration('upload.transfer',duration,api),true);
 const entry=api.getEntriesByName(name).at(-1);
 assert.ok(entry);assert.ok(Math.abs(entry.startTime-phaseStart)<2);assert.ok(Math.abs(entry.duration-duration)<2);
 api.clearMeasures(name);
});

test('rejects arbitrary names and invalid durations and keeps telemetry failures non-fatal',async()=>{
 const {api}=clock();
 assert.equal(recordPhaseDuration('private-file-name.png',25,api),false);
 assert.equal(recordPhaseDuration('upload.transfer',-1,api),false);
 assert.equal(recordPhaseDuration('upload.transfer',4,{measure:()=>{}}),false);
 const broken={now:()=>0,measure:()=>{throw new Error('telemetry unavailable');}};
 assert.equal(await measurePhase('upload.reserve',async()=>42,broken),42);
});
