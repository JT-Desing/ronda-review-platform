const defaultHosts=['127.0.0.2','127.0.0.3','127.0.0.4','127.0.0.5','127.0.0.6','127.0.0.7','127.0.0.8','127.0.0.9','127.0.0.10'];
export function qaListeners({hosts=defaultHosts,basePort=24101}={}){
  const values=Array.isArray(hosts)?hosts:[];
  if(values.length!==9||values.some(host=>typeof host!=='string'||!/^127(?:\.\d{1,3}){3}$/.test(host)||host.split('.').slice(1).some(part=>Number(part)>255)))throw new Error('QA requires nine loopback hosts.');
  if(new Set(values).size!==values.length)throw new Error('QA hosts must be unique.');
  if(!Number.isInteger(basePort)||basePort<1024||basePort>65527)throw new Error('QA base port is invalid.');
  return values.map((host,index)=>({host,port:basePort+index}));
}
