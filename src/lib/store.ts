import { head, put } from "@vercel/blob";
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

  const details = await head(BLOB_KEY, { token });
  if (!details) {
    const site = emptySite();
    await writeSite(site);
    return site;
  }

  const response = await fetch(details.url, {
    cache: "no-store",
    headers: { "cache-control": "no-cache" },
  });
  if (!response.ok) {
    throw new Error(`Impossible de lire ${BLOB_KEY}: ${response.status}`);
  }

  return (await response.json()) as SiteData;
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