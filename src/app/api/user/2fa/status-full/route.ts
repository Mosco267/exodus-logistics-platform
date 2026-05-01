// src/app/api/user/2fa/status-full/route.ts
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

  const user = await db.collection('users').findOne(filter, {
    projection: { twoFactorEnabled: 1, twoFactorEmailEnabled: 1 }
  });

  return NextResponse.json({
    appEnabled: !!user?.twoFactorEnabled,
    emailEnabled: !!user?.twoFactorEmailEnabled,
  });
}