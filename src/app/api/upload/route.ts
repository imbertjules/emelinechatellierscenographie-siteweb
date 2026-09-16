import { handleUpload } from "@vercel/blob/client";
import { isAdmin } from "@/lib/auth";

export async function POST(request: Request): Promise<Response> {
  if (!(await isAdmin())) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith("uploads/")) {
          throw new Error("Chemin d’envoi non autorisé.");
        }

        return {
          allowedContentTypes: ["image/*"],
          // Uploads go directly from the browser to Blob, not through the app server.
          maximumSizeInBytes: 5 * 1024 ** 4,
          addRandomSuffix: true,
        };
      },
    });
    return Response.json(json);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Échec de l’envoi" },
      { status: 400 },
    );
  }
}
