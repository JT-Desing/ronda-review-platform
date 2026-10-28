import test from 'node:test';import assert from 'node:assert/strict';
import {publicIPv4,externalUrl,linkKind,inspectLink,suggestLinkName} from './external-link.js';
test('rejects private, loopback, metadata, reserved IP and credential URLs',()=>{
  for(const ip of ['127.0.0.1','10.1.2.3','172.16.1.2','192.168.1.2','169.254.169.254','100.64.1.1','0.0.0.0','::1','198.18.0.1'])assert.equal(publicIPv4(ip),false);
  for(const url of ['http://example.com','https://localhost','https://127.1','https://2130706433','https://[::1]/','https://user:pass@example.com','https://example.com:8080'])assert.throws(()=>externalUrl(url));
  assert.throws(()=>externalUrl('https://exa\0mple.com'),/Solo se permiten enlaces HTTPS públicos/);
});
test('classifies by actual Content-Type, not misleading names',()=>{assert.equal(linkKind('text/html; charset=utf-8'),'web');assert.equal(linkKind('video/mp4'),'video');assert.equal(linkKind('image/webp'),'image');assert.throws(()=>linkKind('application/octet-stream'));});
test('suggests useful safe names from a link path and falls back to host at the root',()=>{
 assert.equal(suggestLinkName(new URL('https://cdn.example.com/assets/Brand%20Kit%20-%20Final.png?version=2')),'Brand Kit - Final.png');
 assert.equal(suggestLinkName(new URL('https://example.com/')),'example.com');
 assert.equal(suggestLinkName(new URL('https://example.com/projects/summer-launch')),'summer-launch');
 assert.equal(suggestLinkName(new URL('https://example.com/files/unsafe%2Fname%3F.png')),'unsafe name .png');
});
test('stalled DNS returns a bounded error without attempting a connection',async()=>{
 let requested=false;
 await assert.rejects(inspectLink('https://example.com',{lookup:()=>new Promise(()=>{}),lookupTimeoutMs:5,request:()=>{requested=true;}}),/resolver el dominio/);
 assert.equal(requested,false);
});
test('overall inspection deadline aborts an in-flight request after redirects',async()=>{
 let calls=0,signal;
 await assert.rejects(inspectLink('https://example.com',{lookup:async()=>['93.184.216.34'],totalTimeoutMs:10,request:async(_url,_address,requestSignal)=>{calls++;signal=requestSignal;if(calls===1)return {status:302,location:'/next'};return new Promise(()=>{});}}),/tardó demasiado/);
 assert.equal(calls,2);
 assert.equal(signal.aborted,true,'the pending external request must be canceled when the overall deadline expires');
});
test('DNS and redirects cannot reach private services; transport pins inspected address',async()=>{
  let calls=0;
  await assert.rejects(inspectLink('https://example.com',{lookup:async()=>['10.0.0.1'],request:async()=>{calls++;}}));assert.equal(calls,0);
  await assert.rejects(inspectLink('https://example.com',{lookup:async()=>['93.184.216.34'],request:async()=>({status:302,location:'https://127.0.0.1/'})}));
  const result=await inspectLink('https://example.com/assets/fake.mp4',{lookup:async()=>['93.184.216.34'],request:async(url,address)=>{assert.equal(address,'93.184.216.34');return {status:200,mime:'text/html'};}});assert.equal(result.type,'web');assert.equal(result.name,'fake.mp4');
});
test('external link status errors explain how to recover without bypassing access controls',async()=>{
 const inspectStatus=status=>inspectLink('https://example.com/resource',{lookup:async()=>['93.184.216.34'],request:async()=>({status,mime:'text/html'})});
 await assert.rejects(inspectStatus(401),/requiere iniciar sesión.*enlace HTTPS público/);
 await assert.rejects(inspectStatus(403),/requiere iniciar sesión.*enlace HTTPS público/);
 await assert.rejects(inspectStatus(404),/No se encontró contenido.*Comprueba la URL/);
 await assert.rejects(inspectStatus(503),/no está disponible.*Verifica que sea público/);
});
