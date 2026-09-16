import { put, list } from "@vercel/blob";
import type { SiteData } from "./types";

const BLOB_KEY = "site.json";

const emptySite = (): SiteData => ({
  settings: {
    name: "Emeline Chatellier",
    tagline: "Scénographie",
    email: "",
  },
  aboutHtml:
      "<p>Écrivez ici votre à propos depuis le backoffice.</p>",
  projects: [],
});

export async function readSite(): Promise<SiteData> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("ERREUR: BLOB_READ_WRITE_TOKEN est manquant !");
    return emptySite();
  }

  try {
    const { blobs } = await list({
      prefix: BLOB_KEY,
      token: token
    });
    const file = blobs.find((b) => b.pathname === BLOB_KEY) ?? blobs[0];

    if (file) {
      const res = await fetch(file.url, { cache: "no-store" });
      if (res.ok) {
        return (await res.json()) as SiteData;
      }
    }
  } catch (e) {
    console.error("Erreur lors de la lecture de site.json sur le Blob:", e);
  }

  // Si le fichier n'existe pas encore sur le Blob, on l'initialise
  const site = emptySite();
  await writeSite(site);
  return site;
}

export async function writeSite(data: SiteData) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("ERREUR CRITIQUE: BLOB_READ_WRITE_TOKEN est introuvable sur Vercel.");
  }

  const payload = JSON.stringify(data, null, 2);

  try {
    await put(BLOB_KEY, payload, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token: token,
    });
    console.log("Succès : site.json a bien été mis à jour sur Vercel Blob.");
  } catch (err) {
    console.error("Erreur critique lors de l'écriture sur le Blob:", err);
    throw err;
  }
}

export function slugify(value: string) {
  return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || "projet";
}