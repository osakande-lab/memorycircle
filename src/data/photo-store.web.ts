import type {PhotoStore} from './memory-repository';
export const photoStore:PhotoStore={
 async persist(photo){
  const response=await fetch(photo.uri);if(!response.ok)throw new Error('Could not read the selected photo.');
  const blob=await response.blob();if(blob.size<1||blob.size>10*1024*1024||!['image/jpeg','image/png'].includes(blob.type))throw new Error('Use a JPEG or PNG up to 10 MB.');
  // Blob URLs expire on reload. Store a durable data URI for the local web demo.
  return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(new Error('Could not read photo.'));reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(blob);});
 },async remove(){/* Data URIs have no separate stored object. */}
};
