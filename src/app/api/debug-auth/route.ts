export async function GET() {
  return Response.json({
    clientId: process.env.GOOGLE_CLIENT_ID ? 
      process.env.GOOGLE_CLIENT_ID.slice(0, 30) + "..." : "MISSING",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 
      process.env.GOOGLE_CLIENT_SECRET.slice(0, 10) + "..." : "MISSING",
    nextAuthUrl: process.env.NEXTAUTH_URL || "NOT SET",
    nextAuthSecret: process.env.NEXTAUTH_SECRET ? "SET" : "MISSING",
  });
}