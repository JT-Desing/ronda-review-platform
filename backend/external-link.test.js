import test from 'node:test';import assert from 'node:assert/strict';
import {publicIPv4,externalUrl,linkKind,inspectLink} from './external-link.js';
test('rejects private, loopback, metadata, reserved IP and credential URLs',()=>{
  for(const ip of ['127.0.0.1','10.1.2.3','172.16.1.2','192.168.1.2','169.254.169.254','100.64.1.1','0.0.0.0','::1','198.18.0.1'])assert.equal(publicIPv4(ip),false);
  for(const url of ['http://example.com','https://localhost','https://127.1','https://2130706433','https://[::1]/','https://user:pass@example.com','https://example.com:8080'])assert.throws(()=>externalUrl(url));
});
test('classifies by actual Content-Type, not misleading names',()=>{assert.equal(linkKind('text/html; charset=utf-8'),'web');assert.equal(linkKind('video/mp4'),'video');assert.equal(linkKind('image/webp'),'image');assert.throws(()=>linkKind('application/octet-stream'));});
test('DNS and redirects cannot reach private services; transport pins inspected address',async()=>{
  let calls=0;
  await assert.rejects(inspectLink('https://example.com',{lookup:async()=>['10.0.0.1'],request:async()=>{calls++;}}));assert.equal(calls,0);
  await assert.rejects(inspectLink('https://example.com',{lookup:async()=>['93.184.216.34'],request:async()=>({status:302,location:'https://127.0.0.1/'})}));
  const result=await inspectLink('https://example.com/fake.mp4',{lookup:async()=>['93.184.216.34'],request:async(url,address)=>{assert.equal(address,'93.184.216.34');return {status:200,mime:'text/html'};}});assert.equal(result.type,'web');
});
