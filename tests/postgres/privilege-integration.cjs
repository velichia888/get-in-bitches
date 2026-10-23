'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {PGlite} = require('@electric-sql/pglite');
const root=path.resolve(__dirname, '../../supabase/migrations') + '/';
const A='10000000-0000-4000-8000-000000000001';
const B='10000000-0000-4000-8000-000000000002';
const C='10000000-0000-4000-8000-000000000003';
const checks=[];
function assert(c,msg){if(!c)throw Error(msg);checks.push('PASS '+msg)}
async function expectDenied(f,name){let denied=false;try{await f()}catch(e){denied=true} assert(denied,name)}
(async()=>{
 const db=new PGlite();
 let role='postgres';
 async function sql(s){return (await db.query(s)).rows}
 async function as(uid){await db.exec('reset role');role='postgres';if(uid){await db.exec('set role authenticated');role='authenticated'; await sql("select set_config('request.jwt.claim.sub', '"+uid+"', false)"); await sql("select set_config('request.jwt.claim.role', 'authenticated', false)")}else{await sql("select set_config('request.jwt.claim.sub', '', false)");await sql("select set_config('request.jwt.claim.role', '', false)")}}
 async function apply(name){let source=fs.readFileSync(root+name,'utf8');source=source.replace(/^create extension if not exists pgcrypto;\s*$/mi,'-- omitted only for PGlite: gen_random_uuid is native in PG17');await db.exec(source);checks.push('PASS applied '+name)}
 try{
  await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb not null default '{}'::jsonb);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.role() returns text language sql stable as $$select nullif(current_setting('request.jwt.claim.role',true),'')$$;grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.role() to authenticated,anon;create publication supabase_realtime");
  for(const m of ['0001_init.sql','0002_crew_safety.sql','0003_night_out_ride_visibility.sql'])await apply(m);
  await db.exec('grant usage on schema public to authenticated,anon; grant all on all tables in schema public to authenticated;');
  // Supabase production grants direct function EXECUTE to anon/authenticated; imitate those observed ACLs.
  await db.exec('grant execute on all functions in schema public to anon, authenticated');
  const before=(await sql("select has_function_privilege('anon','public.get_my_private_profile()','EXECUTE') as allowed"))[0];
  assert(before.allowed === true, 'baseline has unnecessary anonymous RPC grants');
  await db.exec('insert into auth.users(id,raw_user_meta_data) values '+
    "('"+A+"','{\"full_name\":\"Alice Test\"}'),('"+B+"','{\"full_name\":\"Briana Test\"}'),('"+C+"','{\"full_name\":\"Casey Test\"}')");
  assert((await sql('select count(*)::int as n from public.profiles'))[0].n===3,'user signup trigger created three profiles');
  await db.exec("update public.profiles set phone='5551230002' where id='"+B+"'");
  await apply('20261023074008_tighten_gib_rpc_privileges.sql');
  const privileges=await sql("select has_function_privilege('anon','public.get_my_private_profile()','EXECUTE') as anon,has_function_privilege('authenticated','public.get_my_private_profile()','EXECUTE') as auth");
  assert(privileges[0].anon===false && privileges[0].auth===true,'private-profile RPC anonymous denied, authenticated retained');
  for(const name of ['add_crew_owner_as_member','handle_new_user','set_updated_at','set_participant_status_updated_at','protect_participant_identity']){
    const row=(await sql("select has_function_privilege('anon','public."+name+"()','EXECUTE') as anon,has_function_privilege('authenticated','public."+name+"()','EXECUTE') as auth"))[0];
    assert(!row.anon&&!row.auth,'trigger-only RPC privileges revoked: '+name);
  }
  const paths=await sql("select proname, array_to_string(proconfig, ',') as cfg from pg_proc where proname in ('set_updated_at','set_participant_status_updated_at','protect_participant_identity')");
  assert(paths.length===3 && paths.every(x=>x.cfg==='search_path=""'),'all three trigger search paths fixed');
  await db.exec('set role authenticated');role='authenticated';
  await sql("select set_config('request.jwt.claim.sub','"+A+"',false)");
  await sql("select set_config('request.jwt.claim.role','authenticated',false)");
  const own=(await sql("insert into public.crews(owner_id,name) values ('"+A+"','Night Owls') returning id"))[0];
  assert(Boolean(own?.id),'authenticated owner creates Crew after revocation');
  const crewId=own.id;
  assert((await sql("select count(*)::int as n from public.crew_members where crew_id='"+crewId+"'"))[0].n===1,'owner membership trigger still fires');
  const users=(await sql("select count(*)::int as n from public.get_my_private_profile()"))[0];
  assert(users?.n===1,'authenticated private-profile helper still callable');
  const invited=await sql("select id from public.find_crew_invitee_by_phone('"+crewId+"','555-123-0002')");
  assert(invited.length===1 && invited[0].id===B,'Crew owner can resolve an invited user');
  await sql("insert into public.crew_members (crew_id,profile_id,role) values ('"+crewId+"','"+B+"','member')");
  assert((await sql("select count(*)::int as n from public.crew_members where crew_id='"+crewId+"'"))[0].n===2,'Crew owner can add a second member');
  const created=(await sql("select (public.create_night_out_with_participants('"+crewId+"','Test Night', 'Fictional Cafe',null,null,'Walk home',array['"+B+"'::uuid])).id as id"))[0];
  assert(!!created?.id,'atomic Night Out function runs for Crew owner');
  const outing=created.id;
  assert((await sql("select count(*)::int as n from public.night_out_participants where night_out_id='"+outing+"'"))[0].n===2,'Night Out includes both participants');
  await sql("update public.crews set name='Night Owls Updated' where id='"+crewId+"'");
  assert((await sql("select name from public.crews where id='"+crewId+"'"))[0].name==='Night Owls Updated','updated-at Crew trigger remains functional');
  await as(B);
  assert((await sql("select count(*)::int as n from public.crews"))[0].n===1,'Crew member can read their Crew');
  const updated=await sql("update public.night_out_participants set safety_status='home_safe' where night_out_id='"+outing+"' and profile_id='"+B+"' returning safety_status,status_updated_at");
  assert(updated.length===1 && updated[0].safety_status==='home_safe','member can mark self Home Safe');
  await expectDenied(()=>sql("update public.night_out_participants set profile_id='"+C+"' where night_out_id='"+outing+"' and profile_id='"+B+"'"),'participant cannot impersonate another identity');
  await as(C);
  assert((await sql('select count(*)::int as n from public.crews'))[0].n===0,'nonmember cannot read Crew');
  assert((await sql('select count(*)::int as n from public.night_outs'))[0].n===0,'nonmember cannot read Night Out');
  assert((await sql('select count(*)::int as n from public.night_out_participants'))[0].n===0,'nonmember cannot read Home Safe statuses');
  const changed=await sql("update public.night_out_participants set safety_status='home_safe' where night_out_id='"+outing+"' and profile_id='"+B+"' returning profile_id");
  assert(changed.length===0,'nonmember cannot change another Home Safe status');
  const forbidden=await sql("select id from public.find_crew_invitee_by_phone('"+crewId+"','5551230002')").then(()=>false,e=>true);
  assert(forbidden,'non-owner cannot use Crew invitation lookup');
  await as();
  await db.exec('set role anon');
  const anonDenied=await sql('select * from public.get_my_private_profile()').then(()=>false,e=>true);
  assert(anonDenied,'anonymous role cannot execute private-profile RPC');
  await db.exec('reset role');
  const D='10000000-0000-4000-8000-000000000004';
  await db.exec("insert into auth.users(id,raw_user_meta_data) values ('"+D+"','{\"full_name\":\"Diana Test\"}')");
  assert((await sql("select count(*)::int as n from public.profiles where id='"+D+"'"))[0].n===1,'signup trigger still fires for new users after revoke');
  console.log(checks.join('\n'));
  console.log('RESULT '+checks.length+'/'+checks.length+' PASS — isolated PGlite PostgreSQL 17; no production data');
 } finally {await db.close();}
})().catch(e=>{console.error('INTEGRATION FAILED:',e.message);process.exitCode=1});

