import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

export async function saveUpload(file: File) {
  const safe = sanitizeName(file.name);
  const name = `${Date.now()}-${safe}`;

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

export async function deleteUploadByUrl(url: string) {
  try {
    // Expecting URLs like: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
    const marker = "/storage/v1/object/public/";
    const idx = url.indexOf(marker);
    if (idx === -1) {
      // Not a supabase storage url; nothing to do.
      return false;
    }

    const remainder = url.slice(idx + marker.length); // <bucket>/<path>
    const parts = remainder.split("/");
    const bucket = parts.shift();
    const path = parts.join("/");
    if (!bucket || !path) return false;

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) {
      console.error("Supabase remove error:", error);
      return false;
    }
    return true;
  } catch (e) {
    console.error("deleteUploadByUrl error:", e);
    return false;
  }
}
