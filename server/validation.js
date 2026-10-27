import sharp from 'sharp';
export class AppError extends Error { constructor(status,message){ super(message); this.status=status; } }
export function account(body={}){
 const email=typeof body.email==='string'?body.email.trim().toLowerCase():'';
 const password=body.password;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||typeof password!=='string'||password.length<10||password.length>128) throw new AppError(400,'Use a valid email and a password of 10–128 characters.');
 return {email,password};
}
export function groupInput(body={}){
 const name=typeof body.name==='string'?body.name.trim():'';
 if(!name||name.length>80||!['daily','weekly'].includes(body.schedule)) throw new AppError(400,'Use a name of 1–80 characters and a daily or weekly schedule.');
 return {name,schedule:body.schedule};
}
export function monthInput(value){if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value||''))throw new AppError(400,'Select a YYYY-MM month.');return value;}
export async function imageInput(file,caption='',now=new Date()){
 if(typeof caption!=='string'||[...caption].length>200)throw new AppError(400,'Captions must be at most 200 characters.');
 if(!file||file.buffer.length>10*1024*1024)throw new AppError(400,'Select a JPEG or PNG up to 10 MB.');
 try{
  const meta=await sharp(file.buffer,{limitInputPixels:20000000,animated:true}).metadata();
  if(!['jpeg','png'].includes(meta.format)||(meta.pages||1)!==1||meta.width*meta.height>20000000)throw Error('Invalid image');
  const bytes=await sharp(file.buffer,{limitInputPixels:20000000}).rotate().toFormat(meta.format).toBuffer();
  const out=await sharp(bytes).metadata();
  return {caption,mime:meta.format==='jpeg'?'image/jpeg':'image/png',width:out.width,height:out.height,uploaded_at:now.toISOString(),month:now.toISOString().slice(0,7),bytes:bytes.toString('base64')};
 }catch{throw new AppError(400,'Use a valid single-frame JPEG or PNG of at most 20 megapixels.');}
}
