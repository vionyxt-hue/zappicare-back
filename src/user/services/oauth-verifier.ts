import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';

export interface GoogleTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export interface AppleTokenPayload {
  sub: string;
  email?: string;
  email_verified?: boolean | string;
}

export interface FacebookTokenPayload {
  id: string;
  email?: string;
  name?: string;
}

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string
): Promise<GoogleTokenPayload> {
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) {
    throw new Error('Invalid Google token payload');
  }
  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
    name: payload.name,
    given_name: payload.given_name,
    family_name: payload.family_name,
    picture: payload.picture,
  };
}

export async function verifyAppleIdentityToken(
  identityToken: string,
  audience: string
): Promise<AppleTokenPayload> {
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded?.header?.kid || typeof decoded.payload === 'string') {
    throw new Error('Invalid Apple token');
  }
  const client = jwksClient({
    jwksUri: APPLE_JWKS_URI,
    cache: true,
    cacheMaxAge: 600000,
  });
  const key = await client.getSigningKey(decoded.header.kid);
  const signingKey = key.getPublicKey();
  const payload = jwt.verify(identityToken, signingKey, {
    algorithms: ['RS256'],
    audience,
    issuer: 'https://appleid.apple.com',
  }) as { sub: string; email?: string; email_verified?: boolean | string };
  if (!payload?.sub) {
    throw new Error('Invalid Apple token payload');
  }
  return {
    sub: payload.sub,
    email: payload.email,
    email_verified: payload.email_verified,
  };
}

export async function verifyFacebookAccessToken(params: {
  accessToken: string;
  appId: string;
  appSecret: string;
}): Promise<FacebookTokenPayload> {
  const appAccessToken = `${params.appId}|${params.appSecret}`;
  const debugUrl =
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(params.accessToken)}` +
    `&access_token=${encodeURIComponent(appAccessToken)}`;
  const debugRes = await fetch(debugUrl);
  if (!debugRes.ok) {
    throw new Error('Invalid Facebook token');
  }
  const debugJson = (await debugRes.json()) as {
    data?: { is_valid?: boolean; app_id?: string; user_id?: string };
  };
  if (!debugJson.data?.is_valid) {
    throw new Error('Invalid Facebook token');
  }
  if (String(debugJson.data.app_id ?? '') !== params.appId) {
    throw new Error('Facebook token not issued for this app');
  }
  const meUrl =
    `https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(params.accessToken)}`;
  const meRes = await fetch(meUrl);
  if (!meRes.ok) {
    throw new Error('Invalid Facebook token');
  }
  const meJson = (await meRes.json()) as { id?: string; name?: string; email?: string };
  if (!meJson.id) {
    throw new Error('Invalid Facebook token payload');
  }
  return { id: meJson.id, name: meJson.name, email: meJson.email };
}
