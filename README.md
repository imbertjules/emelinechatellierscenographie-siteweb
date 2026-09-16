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
3. Créer un Blob Store sur le projet pour que les images et le contenu survivent en production. Les images du backoffice sont envoyées directement depuis le navigateur vers Blob : elles ne passent pas par le serveur Vercel et ne subissent donc pas sa limite d’envoi. Les fichiers image (JPEG, PNG, WebP, AVIF, HEIC, etc.) sont acceptés ; leur affichage dépend ensuite de la compatibilité du navigateur.
# emelinechatellierscenographie-siteweb
# emelinechatellierscenographie-siteweb
# emelinechatellierscenographie-siteweb
