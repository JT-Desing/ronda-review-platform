import React from 'react';
import {parseCommentCommand,priorityCommands} from '../domain/comment-commands.js';
export function PriorityCommands({value,onChange}){
 const parsed=parseCommentCommand(value);
 const query=value.trim().toLowerCase();
 const options=query.startsWith('/')&&!/\s/.test(query)?priorityCommands.filter(item=>item.command.startsWith(query)):[];
 return <>{!!options.length&&<div className="priority-command-options" aria-label="Comandos de prioridad">{options.map(item=><button key={item.command} type="button" onClick={event=>{onChange(`${item.command} `);event.currentTarget.closest('.composer')?.querySelector('textarea')?.focus();}}><strong>{item.command}</strong><span>{item.label}</span></button>)}</div>}{parsed.command&&<small className="priority-command-status" role="status">Prioridad: {priorityCommands.find(item=>item.command===parsed.command).label}{!parsed.text?' · Escribe el comentario después del comando':''}</small>}</>;
}
