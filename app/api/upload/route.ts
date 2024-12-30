import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert the file to a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename
    const filename = `${Date.now()}-${file.name}`;
    const filepath = join(process.cwd(), "public", "uploads", filename);

    // Save the file
    await writeFile(filepath, buffer);

    // Return the public URL for the file
    const url = `/uploads/${filename}`;

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Error uploading file" },
      { status: 500 },
    );
  }
}
