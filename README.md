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
2. Variable `ADMIN_PASSWORD`.
3. Créer un Blob Store sur le projet pour que les uploads et le contenu survivent en production.
# emelinechatellierscenographie-siteweb
