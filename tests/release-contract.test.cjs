'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const get = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));

test('app has original Crews → Night Out → Get Us Home → Home Safe route surfaces', () => {
  for (const p of [
    'app/(app)/crews/index.tsx',
    'app/(app)/crews/[id].tsx',
    'app/(app)/crews/night-out/new.tsx',
    'app/(app)/crews/night-out/[nightOutId].tsx',
    'app/(app)/crews/night-out/[nightOutId]/get-home.tsx',
    'app/(app)/safety.tsx'
  ]) assert.ok(exists(p), 'Missing release route: ' + p);
});

test('crew-specific service and RLS migration remain in release candidate', () => {
  for (const file of ['lib/crew-service.ts', 'lib/crew-types.ts', 'supabase/migrations/0002_crew_safety.sql', 'supabase/migrations/0003_night_out_ride_visibility.sql']) {
    assert.ok(exists(file), 'Missing: ' + file);
  }
  const sql = get('supabase/migrations/0002_crew_safety.sql');
  for (const table of ['crews','crew_members','night_outs','night_out_participants']) {
    assert.ok(sql.includes('alter table public.' + table + ' enable row level security;'), 'No RLS declaration: ' + table);
  }
});

test('Expo app is the standalone GIB bundle, not the starter template', () => {
  const pkg = JSON.parse(get('package.json'));
  const app = JSON.parse(get('app.json')).expo;
  assert.equal(pkg.name, 'get-in-bitches');
  assert.equal(app.ios.bundleIdentifier, 'com.getinbitches.app');
  assert.equal(app.name, 'Get In Bitches');
});

test('screenshot test login requires separately configured Codemagic secrets', () => {
  const yaml = get('codemagic.yaml');
  const simulator = yaml.split('  ios-simulator:')[1];
  assert.ok(simulator && simulator.includes('        - ios_test'), 'Missing isolated simulator env group');
  assert.doesNotMatch(yaml, /^\s*EXPO_PUBLIC_DEMO_EMAIL:\s*\S+/m);
  assert.doesNotMatch(yaml, /^\s*EXPO_PUBLIC_DEMO_PASSWORD:\s*\S+/m);
  assert.match(get('components/TestAutomationRunner.tsx'), /EXPO_PUBLIC_IOS_TEST_AUTOMATION !== '1'/);
});

test('normal App Store build does not enable screenshot automation', () => {
  const store = get('codemagic.yaml').split('  ios-app-store:')[1].split('  ios-simulator:')[0];
  assert.ok(store);
  assert.doesNotMatch(store, /EXPO_PUBLIC_IOS_TEST_AUTOMATION:\s*["']?1/);
  assert.match(store, /submit_to_app_store:\s*false/);
  assert.match(store, /submit_to_testflight:\s*false/);
});

test('proposed Supabase RPC hardening is narrowly scoped and not an app-wide revoke', () => {
  const sql = get('supabase/migrations/20261023074008_tighten_gib_rpc_privileges.sql');
  const protectedFunctions = [
    'add_crew_owner_as_member()', 'handle_new_user()',
    'can_read_profile(uuid)', 'find_crew_invitee_by_phone(uuid, text)',
    'get_my_private_profile()', 'set_updated_at()',
    'set_participant_status_updated_at()', 'protect_participant_identity()'
  ];
  for (const fn of protectedFunctions) {
    assert.ok(sql.includes('revoke execute on function public.' + fn), 'Unrestricted RPC: ' + fn);
  }
  for (const fn of ['can_read_profile(uuid)', 'find_crew_invitee_by_phone(uuid, text)', 'get_my_private_profile()']) {
    assert.ok(sql.includes('grant execute on function public.' + fn), 'Required authenticated RPC not preserved: ' + fn);
  }
  for (const fn of ['set_updated_at()', 'set_participant_status_updated_at()', 'protect_participant_identity()']) {
    assert.ok(sql.includes("alter function public." + fn + " set search_path = '';"), 'Search path not pinned: ' + fn);
  }
  assert.doesNotMatch(sql, /revoke\s+execute\s+on\s+all\s+functions/i);
  assert.doesNotMatch(sql, /drop\s+(table|function|schema)/i);
});

test('Home Safe requires participant self-confirmation rather than creator impersonation', () => {
  const formerPolicy = get('supabase/migrations/0002_crew_safety.sql');
  const tightening = get('supabase/migrations/20261023075907_restrict_home_safe_to_participant.sql');
  assert.match(formerPolicy, /create policy "night out creators update participants"/);
  assert.match(formerPolicy, /create policy "participants update their own safety status"/);
  assert.match(tightening, /drop policy if exists "night out creators update participants"/);
  assert.doesNotMatch(tightening, /drop policy.*"participants update their own safety status"/);
  assert.doesNotMatch(tightening, /delete from|truncate|drop table/i);
});

test('ride lifecycle protects route/fare and assigns transitions by role', () => {
  const sql = get('supabase/migrations/20261023080717_enforce_ride_lifecycle_authorization.sql');
  assert.match(sql, /create or replace function public\.enforce_ride_lifecycle_authorization\(\)/);
  assert.match(sql, /new\.fare_estimate/);
  assert.match(sql, /actor_is_driver/);
  assert.match(sql, /old\.status = 'requested'/);
  assert.match(sql, /new\.status = 'completed'/);
  assert.match(sql, /create trigger rides_lifecycle_authorization_guard/);
  const screen = get('app/(app)/ride/[id]/index.tsx');
  assert.match(screen, /Alert\.alert\(/);
  assert.match(screen, /\.maybeSingle\(\)/);
  assert.match(screen, /userId === ride\.rider_id \|\| isDriver/);
});
