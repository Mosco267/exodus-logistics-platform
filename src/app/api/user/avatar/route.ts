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

  // Stream upload directly from buffer — no base64 conversion (saves 33% bandwidth + memory)
  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await new Promise<any>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "exodus-logistics/avatars",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
        resource_type: "image",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  // Delete old avatar from Cloudinary if present
  const existing = await db.collection("users").findOne({
    email: (session.user.email || '').toLowerCase()
  });
  if (existing?.avatarPublicId) {
    cloudinary.uploader.destroy(existing.avatarPublicId).catch(() => {});
  }

  await db.collection("users").updateOne(
    { email: (session.user.email || '').toLowerCase() },
    { $set: { avatarUrl: result.secure_url, avatarPublicId: result.public_id } }
  );

  return NextResponse.json({ url: result.secure_url });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB);

  const user = await db.collection("users").findOne({
    email: (session.user.email || '').toLowerCase()
  });

  // Delete from Cloudinary if we have the public ID
  if (user?.avatarPublicId) {
    cloudinary.uploader.destroy(user.avatarPublicId).catch(() => {});
  }

  await db.collection("users").updateOne(
    { email: (session.user.email || '').toLowerCase() },
    { $unset: { avatarUrl: "", avatarPublicId: "" } }
  );

  return NextResponse.json({ success: true });
}