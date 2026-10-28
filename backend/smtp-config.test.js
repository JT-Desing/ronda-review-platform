import test from 'node:test';
import assert from 'node:assert/strict';
import {smtpConfig} from './smtp-config.js';
const env={SMTP_HOST:'smtp.example.invalid',SMTP_USER:'sender@example.invalid',SMTP_PASSWORD:'test-only',SMTP_PORT:'465',SMTP_SECURE:'true'};
test('configura TLS con certificado verificado',()=>{const config=smtpConfig(env);assert.equal(config.secure,true);assert.equal(config.tls.rejectUnauthorized,true);assert.equal(config.port,465)});
test('sin credenciales no habilita correo',()=>assert.equal(smtpConfig({}),null));
test('rechaza puerto inválido o TLS desactivado en 465',()=>{assert.throws(()=>smtpConfig({...env,SMTP_PORT:'invalid'}));assert.throws(()=>smtpConfig({...env,SMTP_SECURE:'false'}))});
