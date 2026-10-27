import {randomBytes,randomUUID,scryptSync,timingSafeEqual} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,renameSync} from 'node:fs';
import {dirname} from 'node:path';
import {AppError} from './validation.js';
export function publicPhoto({bytes,object_path,...p}){return p;}
// Single-process adapter: mutations are synchronous after validation. Do not cluster.
export function localStore(filename){
 let db={users:[],sessions:[],groups:[],members:[],photos:[]};
 if(filename){try{db=JSON.parse(readFileSync(filename,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}}
 const save=()=>{if(!filename)return;mkdirSync(dirname(filename),{recursive:true});writeFileSync(filename+'.tmp',JSON.stringify(db),{mode:0o600});renameSync(filename+'.tmp',filename);};
 const member=(uid,gid)=>db.members.some(m=>m.user_id===uid&&m.group_id===gid);
 const check=(uid,gid)=>{if(!member(uid,gid))throw new AppError(403,'Group access denied.');};
 return {mode:'local',
 async register(email,password){if(db.users.some(u=>u.email===email))throw new AppError(409,'Account already exists.');const salt=randomBytes(16).toString('hex');db.users.push({id:randomUUID(),email,salt,hash:scryptSync(password,salt,64).toString('hex')});save();return {message:'Account created. You can sign in.'};},
 async login(email,password){const u=db.users.find(u=>u.email===email);const hash=scryptSync(password,u?.salt||'dummy-salt',64);if(!u||!timingSafeEqual(hash,Buffer.from(u.hash,'hex')))throw new AppError(401,'Invalid email or password.');const token=randomBytes(32).toString('hex');db.sessions.push({token,user_id:u.id,expires:Date.now()+8*3600000});save();return token;},
 async user(token){const s=db.sessions.find(s=>s.token===token&&s.expires>Date.now());const u=s&&db.users.find(u=>u.id===s.user_id);if(!u)throw new AppError(401,'Please sign in.');return {id:u.id,email:u.email};},
 async logout(token){db.sessions=db.sessions.filter(s=>s.token!==token);save();},
 async groups(uid){return db.groups.filter(g=>member(uid,g.id));},
 async createGroup(uid,name,schedule){const g={id:randomUUID(),name,schedule,owner_id:uid};db.groups.push(g);db.members.push({group_id:g.id,user_id:uid});save();return g;},
 async group(uid,gid){check(uid,gid);return db.groups.find(g=>g.id===gid);},
 async upload(uid,gid,photo){check(uid,gid);if(db.photos.filter(p=>p.user_id===uid&&p.group_id===gid&&p.month===photo.month).length>=30)throw new AppError(409,'Monthly limit of 30 photos reached.');const p={...photo,id:randomUUID(),user_id:uid,group_id:gid};db.photos.push(p);try{save();}catch(e){db.photos.pop();throw e;}return publicPhoto(p);},
 async photos(uid,gid,month){check(uid,gid);return db.photos.filter(p=>p.group_id===gid&&p.month===month).sort((a,b)=>a.uploaded_at.localeCompare(b.uploaded_at)||a.id.localeCompare(b.id)).map(publicPhoto);},
 async image(uid,id){const p=db.photos.find(p=>p.id===id);if(!p)throw new AppError(404,'Photo not found.');check(uid,p.group_id);return {bytes:Buffer.from(p.bytes,'base64'),mime:p.mime};}
 };
}
