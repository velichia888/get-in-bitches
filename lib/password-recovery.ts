/**
 * GIB's existing native scheme is registered in app.json.
 * Add exactly this destination to Supabase Authentication -> Redirect URLs
 * before sending recovery email from a device with a current GIB build.
 */
export const PASSWORD_RECOVERY_REDIRECT = 'getinbitches:///reset-password';

export type RecoveryPayload =
  | { kind: 'tokens'; accessToken: string; refreshToken: string }
  | { kind: 'code'; code: string }
  | { kind: 'token_hash'; tokenHash: string; type: 'recovery' | 'invite' }
  | { kind: 'error' };

export function parsePasswordRecoveryUrl(rawUrl: string): RecoveryPayload | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  // Never accept tokens from an arbitrary web page or unexpected app path.
  if (
    url.protocol !== 'getinbitches:' ||
    url.hostname !== '' ||
    url.pathname !== '/reset-password'
  ) {
    return null;
  }

  const query = url.searchParams;
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const get = (key: string) => hash.get(key) ?? query.get(key);

  if (get('error') || get('error_code')) return { kind: 'error' };
  const type = get('type');
  if (type !== 'recovery' && type !== 'invite') return null;

  const accessToken = get('access_token');
  const refreshToken = get('refresh_token');
  if (accessToken && refreshToken) {
    return { kind: 'tokens', accessToken, refreshToken };
  }

  const code = get('code');
  if (code) return { kind: 'code', code };

  const tokenHash = get('token_hash');
  if (tokenHash) return { kind: 'token_hash', tokenHash, type };

  return { kind: 'error' };
}
