import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { sendEmail2FADisableCodeEmail } from '@/lib/email';

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  const userEmail = session.user.email || '';
  const userId = (session.user as any).id || '';
  const filter = userId ? { $or: [{ email: userEmail }, { _id: new ObjectId(userId) }] } : { email: userEmail };

  await db.collection('users').updateOne(filter, {
    $set: { twoFactorEmailDisableCode: code, twoFactorEmailDisableCodeExpires: expires },
  });

  const user = await db.collection('users').findOne(filter);
  const name = user?.name || 'Customer';

  try {
    await sendEmail2FADisableCodeEmail(userEmail, { name, code });
  } catch (e) {
    console.error('Failed to send disable code email:', e);
    return NextResponse.json({ error: 'Failed to send code' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}