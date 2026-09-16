import { head, list, put } from "@vercel/blob";
import type { SiteData } from "./types";

const BLOB_KEY = "site.json";
const VERSIONED_PREFIX = "site-";

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
    const versioned = await list({
      prefix: VERSIONED_PREFIX,
      limit: 100,
      token,
    });
    const latestVersion = versioned.blobs
      .filter((blob) => blob.pathname.endsWith(".json"))
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())[0];
    const details = latestVersion || await head(BLOB_KEY, { token });

    if (details && details.url) {
      const response = await fetch(details.url, { cache: "no-store" });
      if (response.ok) {
        return (await response.json()) as SiteData;
      }
    }
  } catch {
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