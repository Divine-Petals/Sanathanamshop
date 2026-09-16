# Netlify — three storefronts from one repo

Create **three Netlify sites** that all point at this GitHub repository.
Each site uses a different build command and env vars.

API + database are **not** on Netlify — deploy those to **Google Cloud Run** + **Supabase** (see root [README.md](../README.md)).

## Sites

| Netlify site | Build command | Env `VITE_TENANT` | Suggested domain |
|---|---|---|---|
| Divine Petals | `npm run build:divine-petals` | `divine-petals` | e.g. `www.divinepetals.in` |
| Divine Jewels | `npm run build:divine-jewels` | `divine-jewels` | e.g. `jewels.sanathanamshop.in` |
| Sanathanam | `npm run build:sanathanam` | `sanathanam` | e.g. `www.sanathanamshop.in` |

## Create each site (Dashboard)

1. **Add new site** → Import from Git → this repo
2. **Build settings**
   - Base directory: *(leave empty)*
   - Build command: one of the three above
   - Publish directory: `dist`
   - Node version: `20` (already in root `netlify.toml`)
3. **Environment variables** (Site settings → Environment variables)

```
VITE_API_URL=https://YOUR-CLOUD-RUN-URL.run.app
VITE_TENANT=divine-petals   # or divine-jewels / sanathanam
```

Copy values from the matching file under `netlify/env.*.example`.

Optional sibling links for `/brands`:

```
VITE_URL_DIVINE_PETALS=https://www.divinepetals.in
VITE_URL_DIVINE_JEWELS=https://jewels.sanathanamshop.in
VITE_URL_SANATHANAM=https://www.sanathanamshop.in
```

4. **Domain** → Add custom domain / subdomain
5. Deploy (or push to the connected branch)

Repeat steps 1–5 for the other two brands (same repo, different build command + `VITE_TENANT`).

## CLI (optional)

```bash
npm i -g netlify-cli

# Per site: link once, then set env and deploy
netlify init
netlify env:set VITE_TENANT divine-petals
netlify env:set VITE_API_URL https://YOUR-CLOUD-RUN-URL.run.app
netlify deploy --prod
```

## CORS (Cloud Run)

Cloud Run `Cors__Origins__*` must allow all three production origins, e.g.:

```
Cors__Origins__0=https://www.divinepetals.in
Cors__Origins__1=https://jewels.sanathanamshop.in
Cors__Origins__2=https://www.sanathanamshop.in
```

Also include Netlify preview URLs if you need preview deploys to hit the API.

Tenant resolution uses the `X-Tenant` header from the frontend (`VITE_TENANT`). Updating each tenant’s `Domain` column in Postgres is only needed if you resolve tenant from Host without the header.

## Files in this folder

| File | Purpose |
|---|---|
| `env.divine-petals.example` | Env template for Petals |
| `env.divine-jewels.example` | Env template for Jewels |
| `env.sanathanam.example` | Env template for Sanathanam |
| `site.divine-petals.toml` | Optional full site config snippet |
| `site.divine-jewels.toml` | Optional full site config snippet |
| `site.sanathanam.toml` | Optional full site config snippet |

Root `netlify.toml` + `public/_redirects` + `public/_headers` apply to every deploy.
