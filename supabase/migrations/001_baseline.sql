-- Run once in a fresh Supabase project's SQL editor. Backend-only API surface.
begin;
create table public.groups(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name)) between 1 and 80),schedule text not null check(schedule in ('daily','weekly')),owner_id uuid not null references auth.users(id));
create table public.memberships(group_id uuid references public.groups(id) on delete cascade,user_id uuid references auth.users(id),primary key(group_id,user_id));
create table public.app_sessions(token_hash text primary key,user_id uuid not null references auth.users(id) on delete cascade,expires_at timestamptz not null);
create table public.photos(id uuid primary key,group_id uuid not null references public.groups(id),user_id uuid not null references auth.users(id),object_path text unique not null,caption text not null check(length(caption)<=200),mime text not null check(mime in ('image/jpeg','image/png')),width integer not null check(width>0),height integer not null check(height>0),month text not null,uploaded_at timestamptz not null default now(),check(width::bigint*height<=20000000));
create index photo_month on public.photos(group_id,user_id,month);
create table public.cleanup_queue(object_path text primary key,last_error text,created_at timestamptz not null default now());
alter table public.groups enable row level security;
alter table public.memberships enable row level security;
alter table public.app_sessions enable row level security;
alter table public.photos enable row level security;
alter table public.cleanup_queue enable row level security;
-- No browser/anon table or bucket access. All requests pass backend checks.
revoke all on public.groups,public.memberships,public.app_sessions,public.photos,public.cleanup_queue from anon,authenticated;
grant all on public.groups,public.memberships,public.app_sessions,public.photos,public.cleanup_queue to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('photos','photos',false,20971520,array['image/jpeg','image/png']);
-- Accepted source files are <=10 MB; re-encoded objects can be larger.
create function public.create_private_group(p_user uuid,p_name text,p_schedule text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare g public.groups;
begin
 insert into public.groups(name,schedule,owner_id) values(p_name,p_schedule,p_user) returning * into g;
 insert into public.memberships(group_id,user_id) values(g.id,p_user);
 return to_jsonb(g);
end;$$;
create function public.commit_photo(p_user uuid,p_group uuid,p_id uuid,p_path text,p_caption text,p_mime text,p_width integer,p_height integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.photos; current_month text; accepted_at timestamptz;
begin
 -- Serialize commits per group, including concurrent requests at 29 photos.
 perform 1 from public.groups where id=p_group for update;
 if not exists(select 1 from public.memberships where group_id=p_group and user_id=p_user) then raise exception 'membership_denied'; end if;
 accepted_at:=clock_timestamp();
 current_month:=to_char(accepted_at at time zone 'UTC','YYYY-MM');
 if (select count(*) from public.photos where group_id=p_group and user_id=p_user and month=current_month)>=30 then raise exception 'monthly_limit'; end if;
 insert into public.photos(id,group_id,user_id,object_path,caption,mime,width,height,month,uploaded_at) values(p_id,p_group,p_user,p_path,p_caption,p_mime,p_width,p_height,current_month,accepted_at) returning * into p;
 return to_jsonb(p)-'object_path';
end;$$;
revoke all on function public.create_private_group(uuid,text,text) from public,anon,authenticated;
revoke all on function public.commit_photo(uuid,uuid,uuid,text,text,text,integer,integer) from public,anon,authenticated;
grant execute on function public.create_private_group(uuid,text,text) to service_role;
grant execute on function public.commit_photo(uuid,uuid,uuid,text,text,text,integer,integer) to service_role;
commit;
