import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import { sendWelcomeEmail } from "@/lib/sendWelcomeEmail";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },

  pages: {
    signIn: '/en/sign-in',
    error: '/en/auth/error',
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").toLowerCase().trim();
        const password = String(credentials?.password || "");

        if (!email || !password) return null;

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);

        const user = await db.collection("users").findOne({ email });
        if (!user) return null;

      // Block deleted/banned users
if ((user as any).deleted === true) return null;
if ((user as any).isDeleted === true) return null;

// Check blocked_emails collection
const blocked = await db.collection("blocked_emails").findOne({ email });
if (blocked) throw new Error('suspended');

        const hash = String((user as any).passwordHash || (user as any).password || "");
        const ok = await bcrypt.compare(password, hash);
        if (!ok) return null;

        return {
  id: String(user._id),
  name: String(user.name || ""),
  email: String(user.email || ""),
  role: String(user.role || "USER"),
  createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
} as any;
      },
    }),
  ],

  callbacks: {
   async signIn({ user, account }) {
  if (account?.provider === "google") {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const email = String(user.email || "").toLowerCase().trim();
    if (!email) return false;

    const blocked = await db.collection("blocked_emails").findOne({ email });
if (blocked) return '/en/auth/error?error=AccessDenied';

const existing = await db.collection("users").findOne({ email });
if (existing?.deleted === true) return '/en/auth/error?error=AccessDenied';

    if (!existing) {
      // New user — create account
      try {
        const result = await db.collection("users").insertOne({
          name: user.name || "",
          email,
          role: "USER",
          provider: "google",
          createdAt: new Date(),
        });
        (user as any).id = String(result.insertedId);
        (user as any).role = "USER";
        await sendWelcomeEmail(user.name || "there", email);
      } catch (e) {
        console.error("Google new user creation failed:", e);
      }
    } else {
      // Existing user — link Google to their account regardless of how it was created
      // Update provider to include google if not already
      await db.collection("users").updateOne(
        { email },
        { $set: { googleLinked: true, lastGoogleSignIn: new Date() } }
      );
      // Carry over their existing role (ADMIN, USER, etc)
      (user as any).id = String(existing._id);
      (user as any).role = String(existing.role || "USER");
      user.name = user.name || existing.name;
    }
  }
  return true;
},

   async jwt({ token, user, account }) {
  if (user) {
    token.role = (user as any).role || "USER";
    token.uid = (user as any).id || user.id;
    token.email = user.email;
    token.createdAt = (user as any).createdAt || new Date().toISOString();

    // Re-fetch email from DB in case it was changed
if (token.uid) {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const { ObjectId } = require('mongodb');
    const dbUser = await db.collection("users").findOne({ _id: new ObjectId(String(token.uid)) });
    if (dbUser?.email) {
      token.email = dbUser.email;
    }
  } catch {}
}
  }
  // Always re-fetch role from DB for Google sign-ins to ensure accuracy
  if (account?.provider === "google" && token.email) {
    try {
      const client = await clientPromise;
      const db = client.db(process.env.MONGODB_DB);
      const dbUser = await db.collection("users").findOne({
        email: String(token.email).toLowerCase().trim()
      });
      if (dbUser) {
        token.role = String(dbUser.role || "USER");
        token.uid = String(dbUser._id);
      }
    } catch (e) {
      console.error("JWT role fetch failed:", e);
    }
  }
  return token;
},

    async session({ session, token }) {
  (session.user as any).role = (token as any).role || "USER";
  (session.user as any).id = (token as any).uid || (token.sub ?? "");
  (session.user as any).createdAt = (token as any).createdAt || null;
  return session;
},
  },
});