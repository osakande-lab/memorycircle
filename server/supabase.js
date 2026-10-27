import {createClient} from '@supabase/supabase-js';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {AppError} from './validation.js';
export function supabaseStore(env){
 for(const key of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY'])if(!env[key])throw Error('Missing '+key);
 const opts={auth:{persistSession:false,autoRefreshToken:false}};
 const admin=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,opts);
 const auth=()=>createClient(env.SUPABASE_URL,env.SUPABASE_PUBLISHABLE_KEY,opts);
 const digest=t=>createHash('sha256').update(t).digest('hex');
 const ok=({data,error})=>{if(error)throw Error(error.message);return data;};
 const check=async(uid,gid)=>{const m=ok(await admin.from('memberships').select('group_id').eq('group_id',gid).eq('user_id',uid).maybeSingle());if(!m)throw new AppError(403,'Group access denied.');};
 return {mode:'supabase',
 async register(email,password){const {error}=await auth().auth.signUp({email,password});if(error)throw new AppError(400,'Registration failed. Check your details.');return {message:'Check your email to confirm your account, then sign in.'};},
 async login(email,password){const {data,error}=await auth().auth.signInWithPassword({email,password});if(error)throw new AppError(401,'Invalid credentials or unconfirmed email.');const token=randomBytes(32).toString('hex');ok(await admin.from('app_sessions').insert({token_hash:digest(token),user_id:data.user.id,expires_at:new Date(Date.now()+8*3600000).toISOString()}));return token;},
 // Opaque app sessions provide immediate logout instead of trusting an unexpired JWT.
 async user(token){if(!token)throw new AppError(401,'Please sign in.');const s=ok(await admin.from('app_sessions').select('user_id').eq('token_hash',digest(token)).gt('expires_at',new Date().toISOString()).maybeSingle());if(!s)throw new AppError(401,'Please sign in.');const {data,error}=await admin.auth.admin.getUserById(s.user_id);if(error||!data.user||data.user.banned_until&&new Date(data.user.banned_until)>new Date())throw new AppError(401,'Please sign in.');return {id:data.user.id,email:data.user.email};},
 async logout(token){ok(await admin.from('app_sessions').delete().eq('token_hash',digest(token)));},
 async groups(uid){const ms=ok(await admin.from('memberships').select('group_id').eq('user_id',uid));if(!ms.length)return [];return ok(await admin.from('groups').select('*').in('id',ms.map(m=>m.group_id)));},
 async createGroup(uid,name,schedule){return ok(await admin.rpc('create_private_group',{p_user:uid,p_name:name,p_schedule:schedule}));},
 async group(uid,gid){await check(uid,gid);return ok(await admin.from('groups').select('*').eq('id',gid).single());},
 async upload(uid,gid,p){
  await check(uid,gid);const id=randomUUID(),object_path=gid+'/'+uid+'/'+id;
  const {error}=await admin.storage.from('photos').upload(object_path,Buffer.from(p.bytes,'base64'),{contentType:p.mime,upsert:false});
  if(error)throw Error('Storage write failed');
  try{const {bytes,...metadata}=p;return ok(await admin.rpc('commit_photo',{p_user:uid,p_group:gid,p_id:id,p_path:object_path,p_caption:p.caption,p_mime:p.mime,p_width:p.width,p_height:p.height}));}
  catch(e){const cleanup=await admin.storage.from('photos').remove([object_path]);if(cleanup.error){ok(await admin.from('cleanup_queue').insert({object_path,last_error:cleanup.error.message}));}if(e.message.includes('monthly_limit'))throw new AppError(409,'Monthly limit of 30 photos reached.');if(e.message.includes('membership_denied'))throw new AppError(403,'Group access denied.');throw e;}
 },
 async photos(uid,gid,month){await check(uid,gid);return ok(await admin.from('photos').select('id,group_id,user_id,caption,mime,width,height,month,uploaded_at').eq('group_id',gid).eq('month',month).order('uploaded_at').order('id'));},
 async image(uid,id){const p=ok(await admin.from('photos').select('*').eq('id',id).maybeSingle());if(!p)throw new AppError(404,'Photo not found.');await check(uid,p.group_id);const data=ok(await admin.storage.from('photos').download(p.object_path));return {bytes:Buffer.from(await data.arrayBuffer()),mime:p.mime};}
 };
}
