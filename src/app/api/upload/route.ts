import { isAdmin } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  try {
    const form = await request.formData();
    const files: Array<{ index: number; file: File }> = [];

    // The client sends pairs: file-<i>=File and index-<i>=<blockIndex>
    // Read file entries, then look up the corresponding index-<i> value so
    // we replace the correct block.src (and avoid saving blob: URLs).
    for (const [key, value] of form.entries()) {
      if (key.startsWith('file-') && value instanceof File) {
        const i = Number(key.split('-')[1]);
        const indexField = form.get(`index-${i}`);
        // form.get() returns FormDataEntryValue (string | File); parse string value safely
        const blockIndex = typeof indexField === 'string' ? Number(indexField) : NaN;
        files.push({ index: Number.isFinite(blockIndex) ? blockIndex : i, file: value });
      }
    }

    const results: Array<{ index: number; url: string }> = [];

    for (const { index, file } of files) {
      const url = await saveUpload(file as File);
      results.push({ index, url });
    }

    return new Response(JSON.stringify(results), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500 });
  }
}
