// src/app/api/user/passkeys/register/verify/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { ObjectId } from 'mongodb';

const RP_ID = process.env.NEXT_PUBLIC_DOMAIN || 'localhost';
const ORIGIN = process.env.NEXT_PUBLIC_APP_URL || `https://${RP_ID}`;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { credential } = await req.json();

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';
  const filter = userId ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] } : { email: userEmail };

  const user = await db.collection('users').findOne(filter);
  if (!user?.passkeyChallenge) return NextResponse.json({ error: 'No challenge found' }, { status: 400 });

  try {
    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: user.passkeyChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
    }

    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

    const newPasskey = {
      id: Buffer.from(credentialID).toString('base64url'),
      publicKey: Buffer.from(credentialPublicKey).toString('base64url'),
      counter,
      name: 'Passkey',
      createdAt: new Date(),
    };

    await db.collection('users').updateOne(filter, {
      $push: { passkeys: newPasskey } as any,
      $unset: { passkeyChallenge: '', passkeyChallengeAt: '' },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Registration failed' }, { status: 400 });
  }
}