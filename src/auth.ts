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
if ((user as any).isDeleted) return null;

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

    if (!existing) {
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
      (user as any).id = String(existing._id);
      (user as any).role = String(existing.role || "USER");
    }
  }
  return true;
},

    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || "USER";
        token.uid = (user as any).id;
      }
      return token;
    },

    async session({ session, token }) {
      (session.user as any).role = (token as any).role || "USER";
      (session.user as any).id = (token as any).uid || (token.sub ?? "");
      return session;
    },
  },
});