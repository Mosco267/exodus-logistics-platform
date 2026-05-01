// src/app/api/user/passkeys/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';
  const filter = userId ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] } : { email: userEmail };
  const user = await db.collection('users').findOne(filter, { projection: { passkeys: 1 } });
  const passkeys = (user?.passkeys || []).map((pk: any) => ({
    id: pk.id, name: pk.name || 'Passkey', createdAt: pk.createdAt || new Date(),
  }));
  return NextResponse.json({ passkeys });
}