import {Directory,File,Paths} from 'expo-file-system';
import type {PhotoStore} from './memory-repository';
export const photoStore:PhotoStore={
 async persist(photo,id,index){
  const folder=new Directory(Paths.document,'memorycircle-photos');folder.create({idempotent:true,intermediates:true});
  const source=new File(photo.uri);
  if(!source.exists||source.size<1||source.size>10*1024*1024)throw new Error('Photo is missing or larger than 10 MB.');
  const destination=new File(folder,id+'-'+index+(photo.mimeType==='image/png'?'.png':'.jpg'));
  try{source.copy(destination);if(!destination.exists)throw new Error('Could not copy this photo.');return destination.uri;}
  catch(error){if(destination.exists)destination.delete();throw error;}
 },
 async remove(uri){const file=new File(uri);if(file.exists)file.delete();}
};
