export type CollageLayout = 'classic' | 'grid' | 'scrapbook';
export type Memory = { id: string; title: string; story: string; createdAt: string; photos: string[]; collageLayout: CollageLayout };
export type PhotoInput = { uri: string; mimeType?: string | null; fileSize?: number; width: number; height: number };
export type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string,value: string): Promise<void> };
export type PhotoStore = { persist(photo: PhotoInput,id: string,index: number): Promise<string>; remove(uri: string): Promise<void> };
export const STORAGE_KEY='memorycircle_memories';
export const LAYOUTS: CollageLayout[]=['classic','grid','scrapbook'];
export const LIMITS={title:80,story:2000,photos:10,bytes:10*1024*1024,pixels:20000000,monthlyPhotos:30};
export class MemoryError extends Error {}
function parse(raw: string|null): Memory[]{
 if(raw===null)return [];
 let rows: unknown;
 try{rows=JSON.parse(raw);}catch{throw new MemoryError('Saved memories could not be read. Your existing data has not been replaced.');}
 if(!Array.isArray(rows))throw new MemoryError('Saved memories have an invalid format.');
 return rows.map((row: Record<string,unknown>)=>{
  if(!row||typeof row.id!=='string'||typeof row.title!=='string'||typeof row.story!=='string'||typeof row.createdAt!=='string'||!Number.isFinite(Date.parse(row.createdAt))||(row.photos!==undefined&&(!Array.isArray(row.photos)||!row.photos.every((x:unknown)=>typeof x==='string')))||(row.collageLayout!==undefined&&!LAYOUTS.includes(row.collageLayout as CollageLayout)))throw new MemoryError('A saved memory has an invalid format.');
  return {...row,photos:row.photos??[],collageLayout:row.collageLayout??'classic'} as Memory;
 });
}
export function validateDraft(title: string,story: string,photos: PhotoInput[]){
 if(!title.trim()||!story.trim())throw new MemoryError('Please enter a title and your memory.');
 if([...title.trim()].length>LIMITS.title||[...story.trim()].length>LIMITS.story)throw new MemoryError('Use a title up to 80 characters and a story up to 2000 characters.');
 if(photos.length>LIMITS.photos)throw new MemoryError('Choose up to 10 photos for one memory.');
 for(const photo of photos){
  if(!photo.uri||!['image/jpeg','image/png'].includes(photo.mimeType||''))throw new MemoryError('Choose JPEG or PNG photos.');
  if(photo.fileSize!==undefined&&(!Number.isFinite(photo.fileSize)||photo.fileSize<1||photo.fileSize>LIMITS.bytes))throw new MemoryError('Each photo must be at most 10 MB.');
  if(!Number.isInteger(photo.width)||!Number.isInteger(photo.height)||photo.width<1||photo.height<1||photo.width*photo.height>LIMITS.pixels)throw new MemoryError('Each photo must be at most 20 megapixels.');
 }
}
export function nextReelIndex(current:number,count:number){if(!Number.isInteger(count)||count<1)return 0;return (current+1)%count;}
export function makeRepository(storage:Storage,files:PhotoStore,clock=()=>new Date(),id=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)){
 // All writes share one queue: two overlapping saves never read the same old list.
 let queue:Promise<unknown>=Promise.resolve();
 const write=<T>(work:()=>Promise<T>):Promise<T>=>{const p=queue.then(work);queue=p.catch(()=>{});return p;};
 const list=async()=>parse(await storage.getItem(STORAGE_KEY));
 return {list,
 async find(id:string){return (await list()).find(m=>m.id===id)??null;},
 create(input:{title:string;story:string;photos:PhotoInput[]}){return write(async()=>{
  validateDraft(input.title,input.story,input.photos);
  const rows=await list(),createdAt=clock().toISOString(),month=createdAt.slice(0,7);
  const used=rows.filter(m=>m.createdAt.slice(0,7)===month).reduce((n,m)=>n+m.photos.length,0);
  if(used+input.photos.length>LIMITS.monthlyPhotos)throw new MemoryError('This device has reached its 30-photo limit for this UTC month.');
  const memory:Memory={id:id(),title:input.title.trim(),story:input.story.trim(),createdAt,photos:[],collageLayout:'classic'};
  try{for(const [i,p] of input.photos.entries())memory.photos.push(await files.persist(p,memory.id,i));await storage.setItem(STORAGE_KEY,JSON.stringify([memory,...rows]));}
  catch(error){const cleanup=await Promise.allSettled(memory.photos.map(uri=>files.remove(uri)));if(cleanup.some(r=>r.status==='rejected'))throw new MemoryError('The memory was not saved. Some copied photos could not be cleaned up; keep the app data for recovery.');throw error;}
  return memory;
 });},
 setLayout(id:string,layout:CollageLayout){return write(async()=>{if(!LAYOUTS.includes(layout))throw new MemoryError('Choose a valid collage layout.');const rows=await list();if(!rows.some(m=>m.id===id))throw new MemoryError('Memory not found.');const updated=rows.map(m=>m.id===id?{...m,collageLayout:layout}:m);await storage.setItem(STORAGE_KEY,JSON.stringify(updated));return updated.find(m=>m.id===id)!;});}
 };
}
