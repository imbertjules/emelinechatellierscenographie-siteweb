import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

function hasBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveUpload(file: File) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const name = `${Date.now()}-${safe}`;

  if (hasBlob()) {
    const blob = await put(`uploads/${name}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    return blob.url;
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);
  return `/uploads/${name}`;
}
