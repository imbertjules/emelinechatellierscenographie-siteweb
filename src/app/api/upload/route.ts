import { isAdmin } from "@/lib/auth";
import { deleteUploadByUrl, saveUpload } from "@/lib/uploads";

// Stay under Vercel's 4.5 MB function body limit, including multipart overhead.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return json({ error: "Session expirée. Reconnectez-vous." }, 401);
  }

  try {
    const form = await request.formData();
    const value = form.get("file");
    if (!(value instanceof File) || value.size <= 0) {
      return json({ error: "Fichier manquant." }, 400);
    }
    if (value.size > MAX_UPLOAD_BYTES) {
      return json({ error: `« ${value.name} » est trop volumineux pour être envoyé.` }, 413);
    }
    if (!ALLOWED_TYPES.has(value.type)) {
      return json({ error: `« ${value.name} » ne peut pas être utilisé.` }, 400);
    }

    const url = await saveUpload(value);
    return json({ url });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return json({ error: "Session expirée. Reconnectez-vous." }, 401);
  }

  let url = "";
  try {
    const body = await request.json();
    url = typeof body?.url === "string" ? body.url : "";
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }

  const allowed =
    url.startsWith("/uploads/") || url.includes("/storage/v1/object/public/uploads/");
  if (!allowed) {
    return json({ error: "URL refusée." }, 400);
  }

  const removed = await deleteUploadByUrl(url);
  return json({ ok: removed });
}
