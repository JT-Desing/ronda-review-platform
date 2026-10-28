export function fileLabel(media) {
  if (!media) return 'DEMO';
  const extension=media.name?.includes('.')?media.name.split('.').at(-1):'';
  return String(media.extension||extension||({image:'IMG',video:'VIDEO',audio:'AUDIO',pdf:'PDF',html:'HTML',document:'DOC',presentation:'PPT'}[media.type])||'ARCHIVO').toUpperCase().slice(0,12);
}
