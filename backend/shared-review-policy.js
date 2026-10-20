import { requireWorkspaceMember, workspaceError } from './workspace-policy.js';

export function requireReviewAction(role,action){
  requireWorkspaceMember(role);
  const allowed={read:['admin','editor','reviewer'],comment:['admin','editor','reviewer'],upload:['admin','editor'],assign:['admin','editor'],resolve:['admin','editor'],download:['admin','editor']};
  if(!Object.hasOwn(allowed,action))throw workspaceError(400,'Acción inválida.');
  if(!allowed[action].includes(role))throw workspaceError(403,'Tu rol no permite esta acción.');
}
const invalid=()=>workspaceError(400,'Anotación inválida.');
export function validateAnnotation(input,kind){
  if(input==null)return null;
  if(!input||!['pen','arrow','square','type'].includes(input.tool)||!/^#[0-9a-f]{6}$/i.test(input.color)||!Array.isArray(input.points)||input.points.length<1||input.points.length>5000||(input.coordinateSpace!==undefined&&input.coordinateSpace!=='document')||(input.coordinateSpace==='document'&&kind&&kind!=='web')||(input.documentSize!==undefined&&(!input.documentSize||!Number.isFinite(input.documentSize.width)||!Number.isFinite(input.documentSize.height)||input.documentSize.width<1||input.documentSize.height<1||input.documentSize.width>100_000_000||input.documentSize.height>100_000_000||input.coordinateSpace!=='document')))throw invalid();
  const points=input.points.map(p=>{
    if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1)throw invalid();
    return {x:p.x,y:p.y};
  });
  if(['arrow','square'].includes(input.tool)&&points.length!==2)throw invalid();
  const result={tool:input.tool,color:input.color.toLowerCase(),points};
  if(input.coordinateSpace==='document')result.coordinateSpace='document';
  if(input.documentSize)result.documentSize={width:input.documentSize.width,height:input.documentSize.height};
  if(input.tool==='type'){
    if(typeof input.text!=='string'||!input.text.trim()||input.text.length>500||points.length!==1)throw invalid();
    result.text=input.text.trim();
  }
  return result;
}
export function validateAnchor(input,kind){
  if(!['image','video','web'].includes(kind))throw workspaceError(400,'Tipo de medio inválido.');
  const timeSeconds=input?.timeSeconds??null;
  if(timeSeconds!==null&&(!Number.isFinite(timeSeconds)||timeSeconds<0||kind!=='video'))throw workspaceError(400,'Tiempo del comentario inválido.');
  return {timeSeconds};
}
