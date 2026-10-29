import {transactionalEmail,rondaEmailLogoAttachment} from './email-template.js';

const EXCERPT=140;
const excerpt=text=>typeof text==='string'?(text.length>EXCERPT?text.slice(0,EXCERPT-1)+'…':text):'';

// Context shared by every notification of one piece: names for the bell and the email.
async function pieceContext(db,space,versionId){
  return (await db.query(`SELECT v.number,v.asset_id AS "assetId",v.project_id AS "projectId",a.name AS "assetName",a.created_by AS "ownerId",p.name AS "projectName"
    FROM shared_versions v JOIN shared_assets a ON a.id=v.asset_id JOIN shared_projects p ON p.id=v.project_id WHERE v.id=$1 AND v.workspace_id=$2`,[versionId,space])).rows[0];
}

// Keeps only people who can open the project (same rule as the project list: open
// project, admin, its creator or a selected member) and never the person who acted.
async function members(db,space,actor,ids,projectId){
  const unique=[...new Set(ids.filter(Boolean))].filter(id=>id!==actor);
  if(!unique.length)return [];
  return (await db.query(`SELECT m.user_id FROM workspace_members m JOIN shared_projects p ON p.workspace_id=m.workspace_id AND p.id=$3
    WHERE m.workspace_id=$1 AND m.user_id=ANY($2::uuid[]) AND p.deleted_at IS NULL
    AND (NOT p.restricted OR m.role='admin' OR p.created_by=m.user_id
      OR EXISTS(SELECT 1 FROM shared_project_members pm WHERE pm.workspace_id=$1 AND pm.project_id=p.id AND pm.user_id=m.user_id))`,[space,unique,projectId])).rows.map(row=>row.user_id);
}

async function insert(db,space,actor,kind,userIds,details){
  if(!userIds.length)return;
  await db.query('INSERT INTO user_notifications(user_id,workspace_id,actor_id,kind,details) SELECT unnest($1::uuid[]),$2,$3,$4,$5',[userIds,space,actor,kind,details]);
}

// Turns a team event into notifications for the people it concerns. Runs inside the
// event's transaction, so a rolled-back action leaves no notification behind.
export async function notifyFromEvent(db,space,actor,action,details){
  if(!details?.versionId)return;
  const handled=['review.version_created','review.link_created','review.comment_created','review.reply_created','review.decision'];
  if(!handled.includes(action))return;
  const piece=await pieceContext(db,space,details.versionId);
  if(!piece)return;
  const base={projectId:piece.projectId,assetId:piece.assetId,versionId:details.versionId,versionNumber:piece.number,assetName:piece.assetName,projectName:piece.projectName};
  if(action==='review.version_created'||action==='review.link_created'){
    const everyone=(await db.query('SELECT user_id FROM workspace_members WHERE workspace_id=$1',[space])).rows.map(row=>row.user_id);
    return insert(db,space,actor,piece.number>1?'version':'asset',await members(db,space,actor,everyone,piece.projectId),base);
  }
  if(action==='review.decision'){
    return insert(db,space,actor,'decision',await members(db,space,actor,[piece.ownerId],piece.projectId),{...base,decision:details.decision});
  }
  const comment=(await db.query('SELECT id,author_id,text FROM shared_version_comments WHERE id=$1 AND version_id=$2',[details.commentId,details.versionId])).rows[0];
  if(!comment)return;
  const reply=action==='review.reply_created'?(await db.query('SELECT text FROM shared_comment_replies WHERE id=$1',[details.replyId])).rows[0]:null;
  const text=excerpt(reply?reply.text:comment.text);
  const mentioned=await members(db,space,actor,Array.isArray(details.mentionIds)?details.mentionIds:[],piece.projectId);
  await insert(db,space,actor,'mention',mentioned,{...base,commentId:comment.id,text});
  // The piece owner and everyone already talking on this version hear about new comments.
  const participants=(await db.query(`SELECT author_id FROM shared_version_comments WHERE version_id=$1
    UNION SELECT author_id FROM shared_comment_replies WHERE version_id=$1`,[details.versionId])).rows.map(row=>row.author_id);
  const audience=(await members(db,space,actor,[piece.ownerId,comment.author_id,...participants],piece.projectId)).filter(id=>!mentioned.includes(id));
  await insert(db,space,actor,reply?'reply':'comment',audience,{...base,commentId:comment.id,text});
}

const LIMIT=30;
export async function listNotifications(pool,userId){
  const items=(await pool.query(`SELECT n.id,n.kind,n.details,n.created_at AS "createdAt",n.read_at AS "readAt",n.workspace_id AS "workspaceId",u.name AS "actorName"
    FROM user_notifications n LEFT JOIN users u ON u.id=n.actor_id
    JOIN workspace_members m ON m.workspace_id=n.workspace_id AND m.user_id=n.user_id
    WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT ${LIMIT}`,[userId])).rows;
  const unread=(await pool.query(`SELECT count(*)::integer AS count FROM user_notifications n JOIN workspace_members m ON m.workspace_id=n.workspace_id AND m.user_id=n.user_id
    WHERE n.user_id=$1 AND n.read_at IS NULL`,[userId])).rows[0].count;
  return {items:items.map(item=>({...item,line:notificationLine(item)})),unread};
}

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function markNotificationsRead(pool,userId,input){
  if(input?.all===true){await pool.query('UPDATE user_notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL',[userId]);return {ok:true};}
  const ids=input?.ids;
  if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(id=>typeof id!=='string'||!UUID.test(id)))throw Object.assign(new Error('Notificaciones inválidas.'),{status:400});
  await pool.query('UPDATE user_notifications SET read_at=now() WHERE user_id=$1 AND id=ANY($2::uuid[]) AND read_at IS NULL',[userId,ids]);
  return {ok:true};
}

const DECISIONS={approved:'aprobó',changes_requested:'pidió cambios en',pending:'dejó pendiente'};
export function notificationLine(item){
  const who=item.actorName||'Alguien',d=item.details||{},piece=`"${d.assetName||'una pieza'}"`;
  switch(item.kind){
    case 'asset':return `${who} subió ${piece} para revisión`;
    case 'version':return `${who} subió la versión ${d.versionNumber} de ${piece}`;
    case 'mention':return `${who} te mencionó en ${piece}`;
    case 'reply':return `${who} respondió en ${piece}`;
    case 'decision':return `${who} ${DECISIONS[d.decision]||'decidió sobre'} ${piece}`;
    default:return `${who} comentó en ${piece}`;
  }
}

// One email per person per pass with everything new since the last one, so a batch of
// uploads does not become a batch of emails. Rows older than a day are dropped from email.
export async function sendNotificationDigests({pool,mailer,origin,limit=200}){
  if(!mailer?.enabled)return {sent:0};
  const client=await pool.connect();
  let rows;
  try{
    await client.query('BEGIN');
    rows=(await client.query(`SELECT n.id,n.user_id,n.workspace_id AS "workspaceId",n.kind,n.details,u.email,u.name,a.name AS "actorName"
      FROM user_notifications n JOIN users u ON u.id=n.user_id LEFT JOIN users a ON a.id=n.actor_id
      WHERE n.emailed_at IS NULL AND n.read_at IS NULL AND n.created_at>now()-interval '1 day'
      ORDER BY n.created_at LIMIT $1 FOR UPDATE OF n SKIP LOCKED`,[limit])).rows;
    if(rows.length)await client.query('UPDATE user_notifications SET emailed_at=now() WHERE id=ANY($1::uuid[])',[rows.map(row=>row.id)]);
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{client.release();}
  const byUser=new Map();
  for(const row of rows)byUser.set(row.user_id,[...(byUser.get(row.user_id)||[]),row]);
  let sent=0;
  for(const items of byUser.values()){
    const first=items[0],lines=items.map(notificationLine);
    const link=new URL('/',origin).href+`#team/${first.workspaceId}/${first.details.projectId}`;
    const subject=items.length===1?lines[0]:`${items.length} novedades en Ronda`;
    const quotes=items.filter(item=>item.details.text).map(item=>`"${item.details.text}"`);
    try{
      await mailer.send({to:first.email,subject:subject.replace(/[\r\n]+/g,' ').slice(0,180),
        text:`${lines.join('\n')}\n\n${quotes.join('\n')}\n\nAbre Ronda para verlo:\n${link}`,
        html:transactionalEmail({preheader:lines[0],eyebrow:'Novedades del equipo',title:subject,paragraphs:[...lines,...quotes].slice(0,12),actionLabel:'Abrir en Ronda',actionUrl:link,details:[]}),
        attachments:[rondaEmailLogoAttachment]});
      sent++;
    }catch{console.error('notification_email_failed');}
  }
  return {sent};
}
