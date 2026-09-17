import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { readSite } from '@/lib/store';

export async function GET(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const site = await readSite();
    return NextResponse.json({ site });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
