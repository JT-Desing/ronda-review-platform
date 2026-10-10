// Read secrets only from the private backend environment. Never serialize options to logs.
export function smtpConfig(env=process.env){
  if(!env.SMTP_HOST||!env.SMTP_USER||!env.SMTP_PASSWORD)return null;
  const port=Number(env.SMTP_PORT||465);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Puerto SMTP inválido');
  const secure=env.SMTP_SECURE==='true';
  if(port===465&&!secure)throw new Error('SMTP 465 requiere TLS');
  return {host:env.SMTP_HOST,port,secure,requireTLS:!secure,auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD},from:env.SMTP_FROM||env.SMTP_USER,tls:{rejectUnauthorized:true},connectionTimeout:10000,socketTimeout:20000};
}
