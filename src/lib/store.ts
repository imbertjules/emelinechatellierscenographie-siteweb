import type { SiteData } from "./types";
import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

// In production environments (e.g. Vercel), writing to the local filesystem at runtime is not reliable.
// We'll only enforce Supabase presence at runtime when attempting file/database writes.
const runningInProd = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

const supabase = useSupabase
  ? createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })
  : null;

const SITE_ID = "main";
const LOCAL_DATA_DIR = path.join(process.cwd(), "data");
const LOCAL_SITE_FILE = path.join(LOCAL_DATA_DIR, "site.json");

const emptySite = (): SiteData => ({
  settings: {
    name: "Emeline Chatellier",
    tagline: "Scénographie",
    email: "",
  },
  aboutHtml: "<p>Écrivez ici votre à propos depuis le backoffice.</p>",
  projects: [],
});

async function ensureLocalDir() {
  try {
    await stat(LOCAL_DATA_DIR);
  } catch (e) {
    await mkdir(LOCAL_DATA_DIR, { recursive: true });
  }
}

export async function readSite(): Promise<SiteData> {
  if (useSupabase && supabase) {
    const { data, error } = await supabase.from("site").select("data").eq("id", SITE_ID).maybeSingle();
    if (error) {
      console.error("Erreur Supabase readSite:", error);
      return emptySite();
    }

    if (!data || !data.data) {
      const initial = emptySite();
      await writeSite(initial);
      return initial;
    }

    return data.data as SiteData;
  }

  // Fallback to local file for dev / when env vars are not provided
  try {
    if (runningInProd && !useSupabase) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production. Set these environment variables to enable persistence.");
    }
    await ensureLocalDir();
    const raw = await readFile(LOCAL_SITE_FILE, "utf-8");
    return JSON.parse(raw) as SiteData;
  } catch (e) {
    const initial = emptySite();
    await writeSite(initial);
    return initial;
  }
}

export async function writeSite(dataToWrite: SiteData) {
  if (useSupabase && supabase) {
    const payload = dataToWrite;
    const { error } = await supabase
      .from("site")
      .upsert({ id: SITE_ID, data: payload });
    if (error) {
      throw new Error(`Erreur Supabase writeSite: ${error.message}`);
    }
    return;
  }

  // Fallback to local file
  if (runningInProd && !useSupabase) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in production. Set these environment variables to enable persistence.");
  }
  await ensureLocalDir();
  await writeFile(LOCAL_SITE_FILE, JSON.stringify(dataToWrite, null, 2), "utf-8");
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
