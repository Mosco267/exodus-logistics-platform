import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, token, password } = await req.json();

        /* Errors return codes rather than prose so the page can show them in
       the reader's language. */
    if (!email || !token || !password)
      return NextResponse.json({ error: "MISSING_FIELDS" }, { status: 400 });

    if (password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[0-9]/.test(password) ||
        !/[^A-Za-z0-9]/.test(password))
      return NextResponse.json({ error: "WEAK_PASSWORD" }, { status: 400 });

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const reset = await db.collection("password_resets").findOne({
      email: email.toLowerCase().trim(),
      token,
    });

        if (!reset)
      return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });

    if (new Date() > new Date(reset.expiry))
      return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });

   const user = await db.collection("users").findOne({ email: email.toLowerCase().trim() });
   /* Same code as a bad token, deliberately. A distinct "account not found"
      would let this endpoint be used to check which emails are registered. */
   if (!user) return NextResponse.json({ error: "INVALID_TOKEN" }, { status: 400 });

// Check current password
if (user.passwordHash) {
  const isSame = await bcrypt.compare(password, user.passwordHash);
  if (isSame) {
        return NextResponse.json({ error: "PASSWORD_REUSED" }, { status: 400 });
  }
}

// Check password history (last 10 passwords)
const history: string[] = user.passwordHistory || [];
for (const oldHash of history) {
  const isOld = await bcrypt.compare(password, oldHash);
  if (isOld) {
        return NextResponse.json({ error: "PASSWORD_REUSED" }, { status: 400 });
  }
}

const passwordHash = await bcrypt.hash(password, 12);

// Keep last 10 passwords in history
const updatedHistory = [user.passwordHash, ...history].filter(Boolean).slice(0, 10);

await db.collection("users").updateOne(
  { email: email.toLowerCase().trim() },
  {
    $set: {
      passwordHash,
      passwordHistory: updatedHistory,
    }
  }
);

await db.collection("password_resets").deleteMany({ email });

return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
       return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}