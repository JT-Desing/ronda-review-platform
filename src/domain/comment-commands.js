export const priorityCommands=Object.freeze([
 {command:'/urgente',priority:'high',label:'Urgente'},
 {command:'/bloqueo',priority:'blocking',label:'Bloqueante'},
 {command:'/normal',priority:'normal',label:'Normal'},
]);
export function matchingPriorityCommands(value){
 const query=String(value||'').trimStart().toLowerCase();
 return /^\/[a-z]*$/.test(query)?priorityCommands.filter(item=>item.command.startsWith(query)):[];
}
// Only an explicit leading command is interpreted; URLs and quoted body text stay intact.
export function parseCommentCommand(value,fallback='normal'){
 const text=String(value||'').trim();
 const match=text.match(/^\/(urgente|bloqueo|normal)(?=\s|$)\s*/i);
 if(!match)return {text,priority:fallback,command:null};
 const item=priorityCommands.find(item=>item.command===`/${match[1].toLowerCase()}`);
 return {text:text.slice(match[0].length).trim(),priority:item.priority,command:item.command};
}
