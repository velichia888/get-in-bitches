'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');

function loadTs(file, dependencies) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const compiled = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: (name) => {
      if (!(name in dependencies)) throw new Error('Unexpected import: ' + name);
      return dependencies[name];
    },
  }, { filename: file });
  return module.exports;
}

const a = { latitude: 33.44, longitude: -112.02 };
const b = { latitude: 33.52, longitude: -112.17 };
const loadLocations = (platform = 'ios', granted = true) => loadTs('lib/ride-locations.ts', {
  'expo-location': { geocodeAsync: async () => [], requestForegroundPermissionsAsync: async () => ({ granted }) },
  'react-native': { Platform: { OS: platform } },
});

test('real pickup and destination geocode sequentially, never invent a fallback', async () => {
  const calls = [];
  const { resolveRideLocations } = loadLocations();
  const data = await resolveRideLocations('  100 Fake St, Phoenix AZ ', '200 Example St, Phoenix AZ  ', async address => {
    calls.push(address);
    return [address.startsWith('100') ? a : b];
  });
  assert.deepEqual(calls, ['100 Fake St, Phoenix AZ', '200 Example St, Phoenix AZ']);
  assert.equal(data.pickup.latitude, a.latitude);
  assert.equal(data.dropoff.longitude, b.longitude);
  assert.equal(data.pickupAddress, '100 Fake St, Phoenix AZ');
  assert.equal(data.dropoffAddress, '200 Example St, Phoenix AZ');
});

test('empty addresses fail before geocoding', async () => {
  const { resolveRideLocations } = loadLocations();
  await assert.rejects(resolveRideLocations(' ', 'test'), /Enter a pickup/);
});

test('unknown, ambiguous, invalid and same-point results prevent a ride', async () => {
  const { resolveRideLocations } = loadLocations();
  await assert.rejects(resolveRideLocations('one', 'two', async () => []), /No location found for the pickup/);
  await assert.rejects(resolveRideLocations('one', 'two', async () => [a, b]), /multiple locations/);
  await assert.rejects(resolveRideLocations('one', 'two', async () => [{ latitude: 900, longitude: -112 }]), /could not be verified/);
  await assert.rejects(resolveRideLocations('one', 'two', async () => [a]), /same location/);
  await assert.rejects(resolveRideLocations('one', 'two', async () => { throw Error('offline') }), /Check your connection/);
});

test('Android permission refusal prevents geocoding', async () => {
  const { resolveRideLocations } = loadLocations('android', false);
  let called = false;
  await assert.rejects(resolveRideLocations('A', 'B', async () => { called = true; return [a] }), /permission/);
  assert.equal(called, false);
});

test('ride persistence uses preview coordinates and no fictional fare', async () => {
  let inserted = null;
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: 'fictional-user-id' } }, error: null }) },
    from: table => {
      assert.equal(table, 'rides');
      return {
        insert: row => { inserted = row; return { select: () => ({ single: async () => ({ data: { id: 'fictional-ride-id' }, error: null }) }) }; },
      };
    },
  };
  const { createRideRequest } = loadTs('lib/ride-service.ts', { './supabase': { supabase: client } });
  const addresses = { pickupAddress: 'A St', dropoffAddress: 'B St' };
  const locations = { ...addresses, pickup: a, dropoff: b };
  assert.equal((await createRideRequest(addresses, locations)).id, 'fictional-ride-id');
  assert.equal(inserted.pickup_lat, a.latitude);
  assert.equal(inserted.dropoff_lng, b.longitude);
  assert.equal(inserted.fare_estimate, null);
  await assert.rejects(createRideRequest({ pickupAddress: 'Wrong St', dropoffAddress: 'B St' }, locations), /Preview the locations again/);
});

test('both screens require user map confirmation before persistence', () => {
  for (const file of [
    'app/(app)/index.tsx',
    'app/(app)/crews/night-out/[nightOutId]/get-home.tsx',
  ]) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(source, /resolveRideLocations\(/, file);
    assert.match(source, /RideLocationPreview/, file);
    assert.match(source, /onConfirm=\{\(\) => void confirmRide\(\)\}/, file);
    assert.match(source, /createRideRequest\(/, file);
    assert.match(source, /setResolvedLocations\(null\)/, file);
  }
  const service = fs.readFileSync(path.join(root, 'lib/ride-service.ts'), 'utf8');
  assert.doesNotMatch(service, /34\.05|118\.24|pickupLat \+ 0\.03|dropoffLat = pickupLat/);
  assert.match(service, /fare_estimate: null/);
});
