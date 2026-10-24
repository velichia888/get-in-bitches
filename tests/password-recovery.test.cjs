'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const compiled = ts.transpileModule(
  fs.readFileSync(path.join(root, 'lib/password-recovery.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }
).outputText;
const mod = { exports: {} };
vm.runInNewContext(compiled, { module: mod, exports: mod.exports, URL, URLSearchParams });
const { PASSWORD_RECOVERY_REDIRECT, parsePasswordRecoveryUrl } = mod.exports;

test('password recovery uses the configured GIB native scheme and the public reset route', () => {
  assert.equal(PASSWORD_RECOVERY_REDIRECT, 'getinbitches:///reset-password');
  assert.ok(fs.existsSync(path.join(root, 'app/reset-password.tsx')));
});

test('parses recovery token fragments without returning unrecognized URL types', () => {
  const parsed = parsePasswordRecoveryUrl(
    PASSWORD_RECOVERY_REDIRECT + '#access_token=fake-access&refresh_token=fake-refresh&type=recovery'
  );
  assert.equal(parsed.kind, 'tokens');
  assert.equal(parsed.accessToken, 'fake-access');
  assert.equal(parsed.refreshToken, 'fake-refresh');
  assert.equal(parsePasswordRecoveryUrl('http://localhost:3000/#access_token=x&refresh_token=y&type=recovery'), null);
  assert.equal(parsePasswordRecoveryUrl('https://malicious.invalid/reset-password#access_token=x&refresh_token=y&type=recovery'), null);
  assert.equal(parsePasswordRecoveryUrl('getinbitches:///another#access_token=x&refresh_token=y&type=recovery'), null);
  assert.equal(parsePasswordRecoveryUrl('getinbitches:///reset-password#access_token=x&refresh_token=y&type=signup'), null);
});

test('accepts recovery PKCE codes or recovery/invite token hashes only', () => {
  assert.equal(parsePasswordRecoveryUrl(PASSWORD_RECOVERY_REDIRECT + '?code=abc&type=recovery').kind, 'code');
  const hash = parsePasswordRecoveryUrl(PASSWORD_RECOVERY_REDIRECT + '?token_hash=abc&type=invite');
  assert.equal(hash.kind, 'token_hash');
  assert.equal(hash.type, 'invite');
  assert.equal(parsePasswordRecoveryUrl(PASSWORD_RECOVERY_REDIRECT + '#error=access_denied').kind, 'error');
});

test('password screen requires verified recovery session and never logs tokens', () => {
  const source = fs.readFileSync(path.join(root, 'app/reset-password.tsx'), 'utf8');
  assert.match(source, /parsePasswordRecoveryUrl\(linkUrl\)/);
  assert.match(source, /supabase\.auth\.setSession\(/);
  assert.match(source, /supabase\.auth\.exchangeCodeForSession\(/);
  assert.match(source, /supabase\.auth\.verifyOtp\(/);
  assert.match(source, /supabase\.auth\.resetPasswordForEmail\(/);
  assert.match(source, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.match(source, /readyToUpdate \? \(/);
  assert.doesNotMatch(source, /console\.(log|error|warn)|Alert\.alert\(.*token/);
  const signin = fs.readFileSync(path.join(root, 'app/(auth)/sign-in.tsx'), 'utf8');
  assert.match(signin, /href="\/reset-password"/);
});
