import test from 'node:test';
import assert from 'node:assert/strict';
import {createMailer} from './mailer.js';
const env={SMTP_HOST:'example.invalid',SMTP_PORT:'465',SMTP_SECURE:'true',SMTP_USER:'sender@example.invalid',SMTP_PASSWORD:'fake-only'};
test('envía con remitente del backend sin aceptar reemplazo del cliente',async()=>{let message;const mailer=createMailer(env,()=>({verify:async()=>true,sendMail:async value=>{message=value;return {messageId:'test'}},close(){}}));assert.equal(await mailer.verify(),true);await mailer.send({from:'fake@example.invalid',to:'receiver@example.invalid',subject:'Prueba',text:'Hola'});assert.equal(message.from,env.SMTP_USER)});
test('rechaza inyección de encabezados',async()=>{const mailer=createMailer(env,()=>({sendMail:()=>assert.fail('no debe enviar'),close(){}}));await assert.rejects(mailer.send({to:'receiver@example.invalid',subject:'Hola\r\nBcc: other',text:'Hola'}))});
