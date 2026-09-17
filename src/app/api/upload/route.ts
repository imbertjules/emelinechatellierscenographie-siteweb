import { isAdmin } from "@/lib/auth";
import { saveUpload } from "@/lib/uploads";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
  }

  try {
    const form = await request.formData();
    const files: Array<{ index: number; file: File }> = [];

    for (const [key, value] of form.entries()) {
      if (key.startsWith('file-') && value instanceof File) {
        const index = Number(key.split('-')[1]);
        files.push({ index, file: value });
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
