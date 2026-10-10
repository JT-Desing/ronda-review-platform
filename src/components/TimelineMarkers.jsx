import React, { useState } from 'react';
import { groupTimelineComments } from '../domain/timeline.js';

export function TimelineMarkers({ comments, duration, members, onOpen, versionId }) {
  const [expanded, setExpanded] = useState(null);
  const groups = groupTimelineComments(comments, duration, versionId);
  return groups.map(group => <div className="timeline-group" key={group.frame} style={{left:`${group.percent}%`}} onKeyDown={e=>{if(e.key==='Escape')setExpanded(null)}}>
    <button className={`timeline-comment ${group.comments.every(c=>c.status==='resolved')?'resolved':''}`} aria-label={`${group.comments.length} comentario${group.comments.length===1?'':'s'} en fotograma ${group.frame}`} aria-expanded={expanded===group.frame} onClick={()=>{if(group.comments.length===1){onOpen(group.comments[0]);setExpanded(null)}else setExpanded(expanded===group.frame?null:group.frame)}}><i/>{group.comments.length>1&&<b>{group.comments.length}</b>}</button>
    <div className={`timeline-thread-list ${expanded===group.frame?'expanded':''}`} style={{left:group.percent<15?'0':undefined,right:group.percent>85?'0':undefined,transform:group.percent<15||group.percent>85?'none':undefined}}>
      <strong>Fotograma {group.frame} · {group.comments.length} comentarios</strong>
      {group.comments.map(c=><button key={c.id} onClick={()=>{onOpen(c);setExpanded(null)}}><strong>{members[c.authorId]?.name||'Invitado'}</strong><span>{c.text}</span><small>{c.status==='resolved'?'Resuelto':'Pendiente'} · Abrir comentario</small></button>)}
    </div>
  </div>);
}
