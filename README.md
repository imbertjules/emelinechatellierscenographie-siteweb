# Site scénographie — Emeline Chatellier

Next.js (React) + Vercel. Backoffice sur `/admin`.

## Local

Node.js 22+ est requis. Mot de passe backoffice par défaut : `emeline` (voir `.env.local`).

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000) et [http://localhost:3000/admin](http://localhost:3000/admin).

## Vercel

1. Importer le repo dans Vercel (framework Next.js).
2. Variables : `ADMIN_PASSWORD`, et si besoin `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (ou équivalent) pour persister le JSON site et les uploads.
3. Les images du backoffice passent par `/api/upload` vers **Supabase Storage** (bucket `uploads`). Sans Supabase en local, les fichiers sont écrits sous `public/uploads/` (non persistant sur Vercel).

## Placement

Accueil et pages projet utilisent un **canevas libre** (glisser-déposer). Pas de layout grille « secours ». Les légendes s’affichent sous chaque photo.
