import {createMailer} from './mailer.js';
const mailer=createMailer();
try{
  if(!mailer.enabled)throw new Error('not-configured');
  await mailer.verify();console.log('SMTP: conexión TLS y autenticación verificadas. No se enviaron mensajes.');
}catch(error){console.error(`SMTP: verificación fallida (${['EAUTH','ECONNECTION','ETIMEDOUT','ESOCKET'].includes(error.code)?error.code:'configuration-or-network'}).`);process.exitCode=1;}
finally{mailer.close();}
