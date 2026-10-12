export async function reconcileSharedUploads(repository,storage,{limit=20}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100)throw new Error('Invalid cleanup batch');
  let cleaned=0,failed=0;
  for(const row of await repository.expiredUploads(limit)){
    try{if(await repository.reconcileUpload(row.workspace_id,row.id,async upload=>{
      const base=`${upload.workspace_id}/${upload.id}`;
      if(upload.object_key!==base&&upload.object_key!==base+'.part')throw new Error('Unsafe upload key');
      await storage.discardUncommitted({workspaceId:upload.workspace_id,uploadId:upload.id});
    }))cleaned++;}catch{failed++;}
  }
  return {cleaned,failed};
}
