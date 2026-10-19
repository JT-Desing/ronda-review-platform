export async function shutdownQaUi({server,closeFixture,timeoutMs=5000}){
  server.closeAllConnections?.();
  await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  let timer;
  try{
    return await Promise.race([
      Promise.resolve().then(closeFixture).then(()=>true),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs);}),
    ]);
  }finally{clearTimeout(timer);}
}
