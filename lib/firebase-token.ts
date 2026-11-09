import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "arcion-ecommerce-8b2";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export interface VerifiedGoogle {
  email: string;
  name: string;
  uid: string;
}

export function googleAccountDecision(shopCount: number): "shop" | "choose" | "setup" {
  if (shopCount === 1) return "shop";
  if (shopCount > 1) return "choose";
  return "setup";
}

/** Verifies a Firebase ID token from Google sign-in. Email comes only from the token. */
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogle> {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });
  return claimsToGoogle(payload);
}

export function claimsToGoogle(payload: JWTPayload): VerifiedGoogle {
  const provider = (payload.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
  if (provider !== "google.com") throw new Error("Google sign-in chahiye.");
  if (payload.email_verified !== true) throw new Error("Google email verified nahi hai.");
  if (typeof payload.email !== "string" || !payload.email.includes("@")) throw new Error("Google email nahi mila.");
  const name = typeof payload.name === "string" && payload.name.trim().length >= 2 ? payload.name.trim() : payload.email.split("@")[0];
  const uid = typeof payload.sub === "string" ? payload.sub : "";
  return { email: payload.email.trim().toLowerCase(), name, uid };
}
