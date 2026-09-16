import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { put, list } from "@vercel/blob";
import type { SiteData } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "site.json");
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

function hasBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function readSite(): Promise<SiteData> {
  if (hasBlob()) {
    try {
      const { blobs } = await list({
        prefix: BLOB_KEY,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      const file = blobs.find((b) => b.pathname === BLOB_KEY) ?? blobs[0];
      if (file) {
        const res = await fetch(file.url, { cache: "no-store" });
        if (res.ok) return (await res.json()) as SiteData;
      }
    } catch (e) {
      console.error("Erreur lecture blob site.json:", e);
    }
  }

  try {
    const raw = await readFile(DATA_PATH, "utf8");
    return JSON.parse(raw) as SiteData;
  } catch {
    const site = emptySite();
    await writeSite(site);
    return site;
  }
}

export async function writeSite(data: SiteData) {
  const payload = JSON.stringify(data, null, 2);

  if (hasBlob()) {
    await put(BLOB_KEY, payload, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return;
  }

  await mkdir(path.dirname(DATA_PATH), { recursive: true });
  await writeFile(DATA_PATH, payload, "utf8");
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