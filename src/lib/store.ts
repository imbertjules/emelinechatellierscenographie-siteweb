import { put, head } from "@vercel/blob";
import type { SiteData } from "./types";

const BLOB_KEY = "site.json";

const emptySite = (): SiteData => ({
  settings: {
    name: "Emeline Chatellier",
    tagline: "Scénographie",
    email: "",
  },
  aboutHtml: "<p>Écrivez ici votre à propos depuis le backoffice.</p>",
  projects: [],
});

export async function readSite(): Promise<SiteData> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("ERREUR CRITIQUE: BLOB_READ_WRITE_TOKEN manquant en prod.");
    return emptySite();
  }

  try {
    // head() récupère les métadonnées et l'URL, ou lève une erreur si le fichier n'existe pas encore
    const details = await head(BLOB_KEY, { token });
    if (details && details.url) {
      const res = await fetch(details.url, { cache: "no-store" });
      if (res.ok) {
        return (await res.json()) as SiteData;
      }
    }
  } catch {
    // Le fichier n'existe pas encore sur le Blob, on l'initialise
    const site = emptySite();
    await writeSite(site);
    return site;
  }

  return emptySite();
}

export async function writeSite(data: SiteData) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error("ERREUR CRITIQUE: BLOB_READ_WRITE_TOKEN manquant en prod pour l'écriture.");
  }

  const payload = JSON.stringify(data, null, 2);

  await put(BLOB_KEY, payload, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token,
  });
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