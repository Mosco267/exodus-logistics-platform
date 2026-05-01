// src/app/api/user/passkeys/register/options/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { ObjectId } from 'mongodb';

const RP_NAME = 'Exodus Logistics';
const RP_ID = process.env.NEXT_PUBLIC_DOMAIN || 'localhost';

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';
  const filter = userId ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] } : { email: userEmail };

  const user = await db.collection('users').findOne(filter);
  const existingPasskeys = user?.passkeys || [];

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: userEmail,
    userName: userEmail,
    userDisplayName: user?.name || userEmail,
    attestationType: 'none',
    excludeCredentials: existingPasskeys.map((pk: any) => ({
      id: Buffer.from(pk.id, 'base64url'),
      type: 'public-key',
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Save challenge temporarily
  await db.collection('users').updateOne(filter, {
    $set: { passkeyChallenge: options.challenge, passkeyChallengeAt: new Date() },
  });

  return NextResponse.json(options);
}