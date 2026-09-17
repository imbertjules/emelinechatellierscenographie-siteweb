import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { readSite, writeSite } from '@/lib/store';

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const about = String(form.get('aboutHtml') || '');
    const site = await readSite();
    site.aboutHtml = about;
    await writeSite(site);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('save-about API error', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
