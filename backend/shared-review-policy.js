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
  if(!input||!['pen','arrow','square','type','selection'].includes(input.tool)||!/^#[0-9a-f]{6}$/i.test(input.color)||!Array.isArray(input.points)||input.points.length<1||input.points.length>5000||(input.coordinateSpace!==undefined&&input.coordinateSpace!=='document')||(input.coordinateSpace==='document'&&kind&&kind!=='web')||(input.documentSize!==undefined&&(!input.documentSize||!Number.isFinite(input.documentSize.width)||!Number.isFinite(input.documentSize.height)||input.documentSize.width<1||input.documentSize.height<1||input.documentSize.width>100_000_000||input.documentSize.height>100_000_000||input.coordinateSpace!=='document')))throw invalid();
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
  if(input.tool==='selection'){
    if(kind!=='web'||input.coordinateSpace!=='document'||typeof input.textQuote!=='string'||!input.textQuote.trim()||input.textQuote.length>2000||points.length!==1||!Array.isArray(input.selectionRects)||input.selectionRects.length<1||input.selectionRects.length>80)throw invalid();
    result.textQuote=input.textQuote.trim();
    result.selectionRects=input.selectionRects.map(rect=>{
      if(!rect||!['x','y','width','height'].every(key=>Number.isFinite(rect[key]))||rect.x<0||rect.y<0||rect.width<=0||rect.height<=0||rect.x+rect.width>1.001||rect.y+rect.height>1.001)throw invalid();
      return {x:rect.x,y:rect.y,width:rect.width,height:rect.height};
    });
  }
  return result;
}
export function validateAnchor(input,kind){
  if(!['image','video','web'].includes(kind))throw workspaceError(400,'Tipo de medio inválido.');
  const timeSeconds=input?.timeSeconds??null;
  if(timeSeconds!==null&&(!Number.isFinite(timeSeconds)||timeSeconds<0||kind!=='video'))throw workspaceError(400,'Tiempo del comentario inválido.');
  return {timeSeconds};
}
