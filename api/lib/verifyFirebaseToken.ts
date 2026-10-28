// Platform-Agnostic Firebase Auth ID Token Verification for Serverless Runtimes
// Compatible with Node.js, Cloudflare Pages, and Netlify Functions.

import crypto from 'crypto';
import { Buffer } from 'buffer';

export const DEFAULT_FIREBASE_API_KEY = 'AIzaSyB8_w86FtF-uWWIofxRYODc2URCibEXY5U';
export const DEFAULT_FIREBASE_PROJECT_ID = 'tracklet-e3409';

export interface VerifiedTokenUser {
  uid: string;
  email?: string;
  emailVerified?: boolean;
}

interface CachedGoogleCerts {
  certs: Record<string, string>;
  expiresAt: number;
}
let cachedGoogleCerts: CachedGoogleCerts | null = null;

/**
 * Fetches and caches Google's public x509 certificates used for Firebase ID token verification.
 */
async function getGooglePublicCerts(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedGoogleCerts && cachedGoogleCerts.expiresAt > now) {
    return cachedGoogleCerts.certs;
  }

  try {
    const res = await fetch(
      'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
    );
    if (!res.ok) return {};

    const cacheControl = res.headers.get('cache-control') || '';
    const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
    const ttlSeconds = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) : 3600;

    const certs = (await res.json()) as Record<string, string>;
    cachedGoogleCerts = {
      certs,
      expiresAt: now + ttlSeconds * 1000,
    };
    return certs;
  } catch (err) {
    console.warn('[verifyFirebaseToken] Failed to fetch Google public certs:', err);
    return {};
  }
}

/**
 * Extracts the Bearer token from the HTTP request headers across Node, Web Standard Request,
 * and Lambda event shapes.
 */
export function extractBearerToken(req: any): string | null {
  if (!req) return null;

  let authHeader: string | undefined;

  // 1. Web Standard Request headers (req.headers.get)
  if (typeof req?.headers?.get === 'function') {
    authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || undefined;
  } 
  // 2. Node / Express / Serverless headers dictionary
  else if (req?.headers && typeof req.headers === 'object') {
    authHeader = req.headers['authorization'] || req.headers['Authorization'];
  }

  if (!authHeader || typeof authHeader !== 'string') return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Verifies a Firebase Auth ID Token using Google's accounts:lookup REST endpoint or
 * cryptographic signature & claim validation against Google's public certificates.
 */
export async function verifyFirebaseIdToken(
  token: string,
  env?: Record<string, string>
): Promise<VerifiedTokenUser | null> {
  if (!token || typeof token !== 'string') return null;

  // Test / mock token bypass strictly restricted to test environments
  const isTestEnv =
    process.env.NODE_ENV === 'test' ||
    process.env.VITEST === 'true' ||
    env?.NODE_ENV === 'test';
  if (isTestEnv && (token.startsWith('test-') || token.startsWith('mock-'))) {
    return {
      uid: 'test-user-123',
      email: 'tester@tracklet.app',
      emailVerified: true,
    };
  }

  // Fast format validation: Firebase Auth ID tokens are strictly 3-part JWTs
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const apiKey =
    env?.VITE_FIREBASE_API_KEY ||
    env?.FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    process.env.FIREBASE_API_KEY ||
    DEFAULT_FIREBASE_API_KEY;
  const projectId =
    env?.VITE_FIREBASE_PROJECT_ID ||
    env?.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    DEFAULT_FIREBASE_PROJECT_ID;

  // 1. If Firebase API Key is configured, verify via Firebase Auth REST accounts:lookup
  if (apiKey && apiKey !== 'YOUR_API_KEY') {
    let res: Response | null = null;
    try {
      res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        }
      );
    } catch (err) {
      console.warn('[verifyFirebaseToken] accounts:lookup request failed with network error:', err);
      res = null;
    }

    if (res) {
      if (res.ok) {
        try {
          const data = await res.json();
          const user = data.users?.[0];
          if (user && user.localId) {
            return {
              uid: user.localId,
              email: user.email,
              emailVerified: Boolean(user.emailVerified),
            };
          }
        } catch {
          return null;
        }
      }
      // If accounts:lookup returned a response with configured API key, a non-ok status
      // means the token was explicitly rejected (e.g. invalid or expired). Never fall through.
      return null;
    }
  }

  // 2. Cryptographic signature and claim verification against Google's public certificates
  try {
    // Decode and parse JWT header
    const headerJson = Buffer.from(parts[0], 'base64url').toString('utf8');
    const header = JSON.parse(headerJson);
    if (header.alg !== 'RS256' || !header.kid) {
      return null;
    }

    // Decode and parse JWT payload
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);

    // Validate expiration and timestamps (with 60s clock skew tolerance)
    if (typeof payload.exp !== 'number' || payload.exp < now - 60) {
      return null;
    }
    if (typeof payload.iat === 'number' && payload.iat > now + 60) {
      return null;
    }
    if (typeof payload.auth_time === 'number' && payload.auth_time > now + 60) {
      return null;
    }

    // Validate project issuer and audience if projectId is configured
    if (projectId) {
      if (payload.iss !== `https://securetoken.google.com/${projectId}`) {
        return null;
      }
      if (payload.aud !== projectId) {
        return null;
      }
    }

    const uid = payload.user_id || payload.sub;
    if (!uid || typeof uid !== 'string') return null;

    // Cryptographic signature verification using Google's public certificates
    const certs = await getGooglePublicCerts();
    const cert = certs[header.kid];
    if (!cert) {
      return null;
    }

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${parts[0]}.${parts[1]}`);
    const isSignatureValid = verifier.verify(cert, Buffer.from(parts[2], 'base64url'));
    if (!isSignatureValid) {
      return null;
    }

    return {
      uid,
      email: payload.email,
      emailVerified: Boolean(payload.email_verified),
    };
  } catch {
    return null;
  }
}
