# Production deployment guide

Stack: **Netlify** (3 storefronts) + **Google Cloud Run** (API) + **Supabase** (Postgres) + **MSG91** (SMS OTP / WhatsApp).

```text
Browsers → Netlify ×3 → Cloud Run API → Supabase Postgres
                              ↓
                           MSG91
```

Related templates:

- [`backend/env.cloudrun.example`](backend/env.cloudrun.example) — Cloud Run env vars
- [`netlify/env.*.example`](netlify/) — per-site Netlify env vars
- [`backend/cloudbuild.yaml`](backend/cloudbuild.yaml) — build & deploy API image

---

## Prerequisites

| Tool / account | Why |
|----------------|-----|
| GitHub repo with this code | Netlify + Cloud Build source |
| [Supabase](https://supabase.com) project | Postgres |
| Google Cloud project + billing | Cloud Run, Artifact Registry, Cloud Build |
| `gcloud` CLI | Deploy API |
| [Netlify](https://app.netlify.com) account | 3 frontends |
| MSG91 account | Real SMS OTP + WhatsApp orders |
| Domains (optional but recommended) | Custom hostnames for each brand + API |

Suggested domains (replace with yours):

| Brand | Frontend | API (shared) |
|-------|----------|--------------|
| Divine Petals | `https://www.divinepetals.in` | `https://api.sanathanamshop.in` |
| Divine Jewels | `https://jewels.sanathanamshop.in` | same |
| Sanathanam | `https://www.sanathanamshop.in` | same |

---

## Step 1 — Supabase Postgres

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → Database**.
3. Copy the connection info. Use **Direct** connection or **Session mode** pooler (port `5432`).
4. Do **not** use Transaction mode — Entity Framework needs session-scoped connections.
5. Build an Npgsql connection string:

```text
Host=db.YOUR_REF.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=YOUR_PASSWORD;SSL Mode=Require;Trust Server Certificate=true
```

Notes:

- Schema + seed data are created on **first API boot** (`EnsureCreated` + seeder).
- Later schema changes are **not** auto-migrated — plan a migration or recreate carefully.
- Keep the DB password out of git.

---

## Step 2 — Google Cloud (one-time setup)

```bash
gcloud auth login
gcloud config set project YOUR_GCP_PROJECT

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

gcloud artifacts repositories create sanathanam \
  --repository-format=docker \
  --location=asia-south1
```

Generate a strong JWT secret (32+ characters), e.g.:

```bash
openssl rand -base64 48
```

---

## Step 3 — Deploy the API to Cloud Run

### 3a. Build & deploy image

From the **repo root**:

```bash
gcloud builds submit --config backend/cloudbuild.yaml \
  --substitutions=_REGION=asia-south1,_SERVICE=sanathanam-api,_REPO=sanathanam
```

Or build locally:

```bash
cd backend/src/Sanathanam.Api
docker build -t asia-south1-docker.pkg.dev/YOUR_GCP_PROJECT/sanathanam/sanathanam-api:latest .
docker push asia-south1-docker.pkg.dev/YOUR_GCP_PROJECT/sanathanam/sanathanam-api:latest

gcloud run deploy sanathanam-api \
  --image=asia-south1-docker.pkg.dev/YOUR_GCP_PROJECT/sanathanam/sanathanam-api:latest \
  --region=asia-south1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=3
```

### 3b. Set environment variables

Cloud Run → **sanathanam-api** → **Edit & deploy new revision** → **Variables & secrets**.

Copy from [`backend/env.cloudrun.example`](backend/env.cloudrun.example) and fill in real values:

| Variable | Required | Notes |
|----------|----------|--------|
| `ASPNETCORE_ENVIRONMENT` | Yes | `Production` |
| `UsePostgres` | Yes | `true` |
| `ConnectionStrings__Postgres` | Yes | Supabase string from Step 1 |
| `Jwt__Key` | Yes | 32+ random chars; weak/default keys are rejected |
| `Jwt__Issuer` | Yes | e.g. `sanathanam` |
| `Jwt__Audience` | Yes | e.g. `sanathanam-shops` |
| `Admin__Email` | Yes (first boot) | Admin login email |
| `Admin__Password` | Yes (first boot) | Must **not** be `Admin@123` |
| `Cors__Origins__0` | Yes | Exact Netlify HTTPS origin #1 |
| `Cors__Origins__1` | Yes | Exact Netlify HTTPS origin #2 |
| `Cors__Origins__2` | Yes | Exact Netlify HTTPS origin #3 |
| `Msg91__AuthKey` | Before customers | Enables real SMS + WhatsApp (empty = dev loggers only) |
| `Msg91__OtpTemplateId` | Before customers | MSG91 SMS OTP template id |
| `Msg91__WhatsAppNumber` | Before customers | MSG91 integrated WhatsApp sender number |
| `Msg91__OrderTemplateName` | Optional | Default `order_details` — 3 body vars (brand, order #, summary) |

CORS origins must match exactly (https, no trailing slash), e.g.:

```text
Cors__Origins__0=https://www.divinepetals.in
Cors__Origins__1=https://jewels.sanathanamshop.in
Cors__Origins__2=https://www.sanathanamshop.in
```

If you use Netlify’s `*.netlify.app` URLs first, put those in CORS until custom domains are live.

### 3c. Verify API

```bash
curl https://YOUR-SERVICE-xxxxx.run.app/health
# → {"status":"ok"}
```

Optional: map a custom domain in Cloud Run (e.g. `api.sanathanamshop.in`).

---

## Step 4 — Netlify (three sites, one repo)

Create **three** Netlify sites, all connected to the **same GitHub repository**.

| Site | Build command | Publish dir | `VITE_TENANT` |
|------|---------------|-------------|---------------|
| Divine Petals | `npm run build:divine-petals` | `dist` | `divine-petals` |
| Divine Jewels | `npm run build:divine-jewels` | `dist` | `divine-jewels` |
| Sanathanam | `npm run build:sanathanam` | `dist` | `sanathanam` |

### Dashboard steps (repeat ×3)

1. **Add new site** → Import from Git → this repo  
2. **Build settings**
   - Base directory: *(empty)*
   - Build command: from table above
   - Publish directory: `dist`
   - Node: `20` (set in root `netlify.toml`)
3. **Environment variables**

```text
VITE_API_URL=https://YOUR-CLOUD-RUN-URL.run.app
VITE_TENANT=divine-petals
```

Optional `/brands` sibling links:

```text
VITE_URL_DIVINE_PETALS=https://www.divinepetals.in
VITE_URL_DIVINE_JEWELS=https://jewels.sanathanamshop.in
VITE_URL_SANATHANAM=https://www.sanathanamshop.in
```

Templates: [`netlify/env.divine-petals.example`](netlify/env.divine-petals.example), [`env.divine-jewels.example`](netlify/env.divine-jewels.example), [`env.sanathanam.example`](netlify/env.sanathanam.example).

4. **Domain** → add custom domain / DNS as Netlify instructs  
5. Deploy (or push to the linked branch)

### CLI alternative

```bash
npm i -g netlify-cli
netlify init
netlify env:set VITE_TENANT divine-petals
netlify env:set VITE_API_URL https://YOUR-CLOUD-RUN-URL.run.app
netlify deploy --prod
```

More Netlify detail: [`netlify/README.md`](netlify/README.md).

---

## Step 5 — Domains, CORS, smoke test

1. Point all three custom domains at their Netlify sites.  
2. Update Cloud Run `Cors__Origins__*` to those exact URLs; redeploy revision.  
3. Open each storefront → browse products → category/subcategory filters.  
4. Admin: `https://YOUR-PETALS-DOMAIN/admin/login` with `Admin__Email` / `Admin__Password`.  
5. Use the **site switcher** in admin to manage all three catalogs.  
6. After MSG91 is configured (Step 6): customer OTP login → place a test order → confirm WhatsApp order message.

---

## Step 6 — MSG91 SMS OTP + WhatsApp (required before real customers)

The API uses **MSG91** for:

| Channel | When | Config |
|---------|------|--------|
| **SMS OTP** | Customer login (`/api/auth/otp/send`) | `Msg91__AuthKey` + `Msg91__OtpTemplateId` |
| **WhatsApp Utility** | After a successful order place | `Msg91__AuthKey` + `Msg91__WhatsAppNumber` + template name |

If `Msg91__AuthKey` is empty, the API still starts but uses **dev loggers** (messages only appear in Cloud Run logs — no real SMS/WhatsApp).

### 6a. MSG91 account setup

1. Sign up / log in at [msg91.com](https://msg91.com).  
2. Copy your **Auth Key** (Dashboard → API / Authkey).  
3. Enable **WhatsApp** on the account and complete Meta / WhatsApp Business onboarding as MSG91 requires.  
4. Note your **integrated WhatsApp number** (digits only, country code included as MSG91 shows it — the API sends `to` as `91` + 10-digit Indian mobile).

### 6b. SMS OTP template

1. In MSG91, create an **OTP** template and get it approved.  
2. The API calls `POST https://control.msg91.com/api/v5/otp` with:
   - `template_id` = your OTP template id  
   - `mobile` = `91` + phone  
   - `otp` = the 6-digit code  
3. Put the template id in Cloud Run as `Msg91__OtpTemplateId`.

### 6c. WhatsApp order template (Utility)

Orders trigger WhatsApp via `Msg91WhatsAppSender` after checkout. The API sends a **template** message named by `Msg91__OrderTemplateName` (default: `order_details`).

Create and get approved a WhatsApp **Utility** template with **exactly 3 body variables**, in this order:

| Variable | Example | Source in API |
|----------|---------|----------------|
| `{{1}}` | `Divine Petals` | Tenant / brand name |
| `{{2}}` | `DP-20260916-AB12` | Order number |
| `{{3}}` | `Sandalwood x1, Rose x2. Total ₹538.00` | Line items + total |

Suggested template body (English):

```text
Thank you for shopping at {{1}}.

Order {{2}} is confirmed.

{{3}}

We will update you when it ships.
```

Template settings that must match the code:

- **Template name:** `order_details` (or set `Msg91__OrderTemplateName` to your exact name)  
- **Language code:** `en`  
- **Category:** Utility (order updates)  
- **Body parameters:** 3 text variables as above  

API payload (for reference — you do not call this manually):

- Endpoint: `POST https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/`  
- `integrated_number` = `Msg91__WhatsAppNumber`  
- `payload.to` = `91` + customer phone  
- Template body params: brand, order number, order summary string  

Order send failures are **logged** (`MessageLogs` + Cloud Run logs) and do **not** roll back the order.

### 6d. Cloud Run env for messaging

Set all of these on the API service, then deploy a new revision:

```text
Msg91__AuthKey=YOUR_AUTH_KEY
Msg91__OtpTemplateId=YOUR_OTP_TEMPLATE_ID
Msg91__WhatsAppNumber=YOUR_INTEGRATED_WHATSAPP_NUMBER
Msg91__OrderTemplateName=order_details
```

Also listed in [`backend/env.cloudrun.example`](backend/env.cloudrun.example).

### 6e. Verify messaging end-to-end

1. **SMS OTP:** open a storefront → Login → enter a real Indian mobile → receive OTP SMS → verify.  
2. **WhatsApp:** complete checkout with that phone → confirm the Utility message arrives with brand, order number, and item summary.  
3. If WhatsApp fails but order succeeds: check Cloud Run logs for `MSG91 WhatsApp failed` and that the template name/language/variable count match.  
4. Optional: inspect `MessageLogs` in Supabase for `channel = whatsapp` / `sms` and `status`.

---

## Security checklist

- [ ] Strong `Jwt__Key` (not the repo placeholder)
- [ ] Strong `Admin__Password` (not `Admin@123`)
- [ ] Supabase password only in Cloud Run secrets / env — never committed
- [ ] CORS limited to your three production origins
- [ ] MSG91 Auth Key set; OTP template approved
- [ ] WhatsApp integrated number set; `order_details` (or custom) Utility template approved with 3 body vars
- [ ] Test OTP SMS + WhatsApp order on a real phone before public launch
- [ ] Change admin password if it was ever shared
- [ ] Confirm `ASPNETCORE_ENVIRONMENT=Production`

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| API won’t start | Missing Postgres / weak JWT / default admin password on first boot — check Cloud Run logs |
| Browser CORS errors | `Cors__Origins__*` must match frontend origin exactly |
| Empty catalog / wrong brand | Netlify `VITE_TENANT` wrong, or missing `X-Tenant` (frontend sets it from env) |
| OTP not arriving | `Msg91__AuthKey` / `Msg91__OtpTemplateId` empty or wrong → check Cloud Run logs for DEV SMS or MSG91 errors |
| WhatsApp not arriving | `Msg91__WhatsAppNumber` empty; template name/language mismatch; template not approved; wrong variable count (must be 3) |
| WhatsApp error but order exists | Expected — order is saved first; fix MSG91 and retest next order |
| `/health` 200 but `/api/*` 404 store | Send `X-Tenant` or fix tenant seed |
| Netlify blank routes | SPA redirect is in `netlify.toml` (`/*` → `/index.html` 200) |

---

## Local vs production

| | Local | Production |
|--|-------|------------|
| Frontends | Vite `:5173`–`:5175` | Netlify ×3 |
| API | `dotnet run` `:5214` | Cloud Run |
| DB | SQLite (dev wipe/recreate) | Supabase Postgres |
| OTP | Always `123456` | Random + MSG91 SMS |
| WhatsApp orders | Logged to API console | MSG91 WhatsApp Utility template |
| Admin | `admin@sanathanam.local` / `Admin@123` | Your `Admin__*` env |
