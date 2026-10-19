export const retainReviewView=(versionId,requestedVersion)=>Boolean(versionId&&(!requestedVersion||requestedVersion===versionId));
export function reusableReviewMedia(cached,data){
 const version=data.version;
 return cached&&cached.versionId===version.id&&cached.fileId===version.fileId&&cached.externalUrl===version.externalUrl?cached.media:null;
}
