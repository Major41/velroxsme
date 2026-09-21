// lib/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export interface BusinessClaims {
  sub: string;              // business.id
  email: string;
  business_name: string;
  role: 'business';
}

export interface SuperAdminClaims {
  sub: string;              // super_admin.id
  email: string;
  role: 'super_admin';
}

export type AppClaims = BusinessClaims | SuperAdminClaims;

export async function signToken(
  claims: AppClaims,
  expiresIn: string = '7d'
) {
  return await new SignJWT(claims as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<AppClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AppClaims;
  } catch {
    return null;
  }
}