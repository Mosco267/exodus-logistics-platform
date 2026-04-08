import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import { sendWelcomeEmail } from "@/lib/sendWelcomeEmail";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },

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
      // Handle Google sign-in — auto-create or find user in MongoDB
      if (account?.provider === "google") {
        try {
          const client = await clientPromise;
          const db = client.db(process.env.MONGODB_DB);

          const email = String(user.email || "").toLowerCase().trim();
          if (!email) return false;

          // Check if blocked
          const blocked = await db.collection("blocked_emails").findOne({ email });
          if (blocked) return false;

          let existing = await db.collection("users").findOne({ email });

          if (!existing) {
  // Create new user from Google
  const result = await db.collection("users").insertOne({
    name: user.name || "",
    email,
    role: "USER",
    provider: "google",
    createdAt: new Date(),
  });
  (user as any).id = String(result.insertedId);
  (user as any).role = "USER";

  // Send welcome email to new Google user
  try {
  await sendWelcomeEmail(user.name || "there", email);
} catch (e) {
  console.error("Google welcome email failed:", e);
}
}
        } catch {
          return false;
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