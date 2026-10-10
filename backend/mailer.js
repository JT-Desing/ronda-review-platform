import nodemailer from 'nodemailer';
import {smtpConfig} from './smtp-config.js';

export function createMailer(env=process.env,transportFactory=nodemailer.createTransport){
  const config=smtpConfig(env);
  if(!config)return {enabled:false,verify:async()=>false,send:async()=>{throw new Error('Correo no configurado')},close:()=>{}};
  const {from,...options}=config;
  const transport=transportFactory({...options,logger:false,debug:false});
  return {
    enabled:true,
    verify:()=>transport.verify(),
    send:async({to,subject,text,html})=>{
      if(typeof to!=='string'||!/^\S+@\S+\.\S+$/.test(to)||/[\r\n]/.test(to)||typeof subject!=='string'||/[\r\n]/.test(subject)||!text)throw new Error('Mensaje inválido');
      return transport.sendMail({from,to,subject,text,...(html?{html}:{})});
    },
    close:()=>transport.close(),
  };
}
