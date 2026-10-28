export function projectShareChannels(url){
 const target=new URL(url);
 if(!['https:','http:'].includes(target.protocol)||target.username||target.password)throw new Error('Enlace de proyecto inválido');
 const text=`Revisa las piezas de este proyecto en Ronda: ${target.href}`;
 return {email:`mailto:?subject=${encodeURIComponent('Proyecto para revisar en Ronda')}&body=${encodeURIComponent(text)}`,whatsapp:`https://wa.me/?text=${encodeURIComponent(text)}`};
}
