import type { SiteData } from "./types";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SITE_ID = "main";

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
  const { data, error } = await supabase.from("site").select("data").eq("id", SITE_ID).maybeSingle();
  if (error) {
    console.error("Erreur Supabase readSite:", error);
    return emptySite();
  }

  if (!data || !data.data) {
    // create initial row
    const initial = emptySite();
    await writeSite(initial);
    return initial;
  }

  return data.data as SiteData;
}

export async function writeSite(dataToWrite: SiteData) {
  const payload = dataToWrite;
  const { error } = await supabase
    .from("site")
    .upsert({ id: SITE_ID, data: payload }, { returning: "minimal" });
  if (error) {
    throw new Error(`Erreur Supabase writeSite: ${error.message}`);
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
