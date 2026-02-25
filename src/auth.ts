import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },

  providers: [
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

        const hash = String((user as any).passwordHash || (user as any).password || "");
const ok = await bcrypt.compare(password, hash);
        if (!ok) return null;

        // ✅ IMPORTANT: include role here
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
    async jwt({ token, user }) {
      // When user signs in, copy role -> token
      if (user) {
        token.role = (user as any).role || "USER";
        token.uid = (user as any).id;
      }
      return token;
    },

    async session({ session, token }) {
      // Copy role -> session.user
      (session.user as any).role = (token as any).role || "USER";
      (session.user as any).id = (token as any).uid || (token.sub ?? "");
      return session;
    },
  },
});