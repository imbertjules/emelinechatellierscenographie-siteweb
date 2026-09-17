import { createClient } from "@supabase/supabase-js";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const runningInProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
if (!useSupabase && runningInProd) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production to enable uploads.");
}

const supabase = useSupabase
  ? createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })
  : null;

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function ensureUploadsDir() {
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function saveUpload(file: File) {
  const safe = sanitizeName(file.name);
  const name = `${Date.now()}-${safe}`;

  if (useSupabase && supabase) {
    const data = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage.from("uploads").upload(name, data, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      throw new Error(`Erreur upload Supabase: ${error.message}`);
    }

    const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(name);
    return publicData.publicUrl;
  }

  // Fallback: save to public/uploads
  const dir = await ensureUploadsDir();
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, name), buffer);
  return `/uploads/${name}`;
}

export async function deleteUploadByUrl(url: string) {
  try {
    if (useSupabase && supabase) {
      const marker = "/storage/v1/object/public/";
      const idx = url.indexOf(marker);
      if (idx === -1) {
        // Not a supabase storage url; nothing to do.
        return false;
      }

      const remainder = url.slice(idx + marker.length); // <bucket>/<path>
      const parts = remainder.split("/");
      const bucket = parts.shift();
      const pathName = parts.join("/");
      if (!bucket || !pathName) return false;

      const { error } = await supabase.storage.from(bucket).remove([pathName]);
      if (error) {
        console.error("Supabase remove error:", error);
        return false;
      }
      return true;
    }

    // Fallback: if url is local /uploads/<name>, remove file (best-effort)
    const prefix = "/uploads/";
    if (url.startsWith(prefix)) {
      const filepath = path.join(process.cwd(), "public", url.replace(/^\//, ""));
      try {
        // best-effort unlink
        await import("fs/promises").then((m) => m.unlink(filepath)).catch(() => null);
        return true;
      } catch (e) {
        return false;
      }
    }

    return false;
  } catch (e) {
    console.error("deleteUploadByUrl error:", e);
    return false;
  }
}
