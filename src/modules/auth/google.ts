import "server-only";
import { env } from "@/lib/env";
import { secureToken } from "@/lib/ids";

/**
 * Minimal Google OAuth 2.0 (Authorization Code + PKCE-less server flow).
 * Enabled only when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are configured.
 */
export function googleEnabled() {
  const e = env();
  return Boolean(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri() {
  return `${env().APP_URL.replace(/\/$/, "")}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: env().GOOGLE_CLIENT_ID,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export type GoogleProfile = { sub: string; email: string; email_verified: boolean; name?: string; picture?: string };

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const body = new URLSearchParams({
    code,
    client_id: env().GOOGLE_CLIENT_ID,
    client_secret: env().GOOGLE_CLIENT_SECRET,
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${tokenRes.status}`);
  const tokens = (await tokenRes.json()) as { access_token: string; id_token?: string };
  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) throw new Error(`Google userinfo failed: ${profileRes.status}`);
  return (await profileRes.json()) as GoogleProfile;
}

export const newOAuthState = () => secureToken(16);
