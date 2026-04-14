import { NextResponse } from "next/server";
import { auth } from "@/auth";
import clientPromise from "@/lib/mongodb";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(base64, {
    folder: "exodus-logistics/avatars",
    transformation: [{ width: 200, height: 200, crop: "fill", gravity: "face" }],
  });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);
  await db.collection("users").updateOne(
    { email: (session.user.email || '').toLowerCase() },
    { $set: { avatarUrl: result.secure_url } }
  );

  return NextResponse.json({ url: result.secure_url });
}