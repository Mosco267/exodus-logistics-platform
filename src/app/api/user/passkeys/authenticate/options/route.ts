// src/app/api/user/passkeys/authenticate/options/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { ObjectId } from 'mongodb';

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
  const passkeys = user?.passkeys || [];

  if (passkeys.length === 0) return NextResponse.json({ error: 'No passkeys registered' }, { status: 400 });

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: passkeys.map((pk: any) => ({
      id: Buffer.from(pk.id, 'base64url'),
      type: 'public-key',
    })),
    userVerification: 'preferred',
  });

  await db.collection('users').updateOne(filter, {
    $set: { passkeyChallenge: options.challenge, passkeyChallengeAt: new Date() },
  });

  return NextResponse.json(options);
}