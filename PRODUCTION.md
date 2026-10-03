# Production deployment guide

**Stack:** Netlify (3 storefronts) + **Google Cloud Run** (API) + **Supabase** (Postgres) + messaging (see below).

```text
Browsers → Netlify ×3 → Cloud Run API → Supabase Postgres
                              ↓
                    SMS OTP + WhatsApp (providers below)
```

Related templates:

- [`backend/env.production.example`](backend/env.production.example) — API env vars
- [`backend/env.cloudrun.example`](backend/env.cloudrun.example) — Cloud Run copy
- [`backend/cloudbuild.yaml`](backend/cloudbuild.yaml) — build & deploy API
- [`netlify/env.*.example`](netlify/) — per-site Netlify env vars

---

## Messaging: what Google offers (and what it doesn’t)

| Need | Google product? | Recommendation for this shop |
|------|-----------------|------------------------------|
| **SMS OTP** (login) | **Yes** — [Firebase Authentication](https://firebase.google.com/docs/auth/web/phone-auth) / [Identity Platform](https://cloud.google.com/identity-platform) Phone Auth | Optional Google path; needs GCP billing (you have this). ~10 SMS/day free, then ~$0.07/SMS in India (check current [pricing](https://cloud.google.com/identity-platform/pricing)). |
| **WhatsApp order messages** | **No** — Google does **not** provide WhatsApp Business API | Keep **MSG91** (already wired in this repo), or Meta Cloud API / Twilio later |
| Push notifications | FCM — not used for OTP/orders here | Skip for now |

**Practical choice (recommended):** keep **MSG91 for both SMS OTP + WhatsApp** — one vendor, already implemented in [`Messaging.cs`](backend/src/Sanathanam.Api/Messaging/Messaging.cs). No code rewrite.

**Google-only SMS OTP:** possible via Firebase Phone Auth, but it means rewriting customer login (reCAPTCHA, Firebase client SDK, verifying ID tokens on the API). WhatsApp would still need MSG91/Meta. Only worth it if you want Google-billed SMS instead of MSG91 SMS.

This guide assumes **MSG91** for production messaging (SMS + WhatsApp). Firebase is noted above as an optional future swap for OTP only.

---

## Prerequisites

| Tool / account | Why |
|----------------|-----|
| GitHub repo with this code | Netlify + Cloud Build source |
| [Supabase](https://supabase.com) project | Postgres |
| Google Cloud project **with billing enabled** | Cloud Run, Artifact Registry, Cloud Build |
| `gcloud` CLI | Deploy API |
| [Netlify](https://app.netlify.com) account | 3 frontends |
| MSG91 account | SMS OTP + WhatsApp orders |
| Domains (optional) | Custom hostnames |

Suggested domains (replace with yours):

| Brand | Frontend | API (shared) |
|-------|----------|--------------|
| Divine Petals | `https://www.divinepetals.in` | `https://api.sanathanamshop.in` |
| Divine Jewels | `https://jewels.sanathanamshop.in` | same |
| Sanathanam | `https://www.sanathanamshop.in` | same |

```bash
openssl rand -base64 48   # Jwt__Key
```

---

## Step 1 — Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste and run [`supabase/schema.sql`](supabase/schema.sql) (tables for tenants, products, orders, admin).
3. **Project Settings → API** → copy **Project URL** + **service_role** key → set as `SUPABASE_URL` / `SUPABASE_KEY` on Cloud Run. Products, orders, and admin use this client (PostgREST).
4. **Project Settings → Database** → connection string for EF (users / OTP / addresses). Use **Direct** or **Session** pooler (port `5432`), **not** Transaction mode.

Build the connection string from Supabase → **Project Settings → Database** and set it only on Cloud Run as `ConnectionStrings__Postgres`. Never commit that value. Prefer Session/Direct (port `5432`) and enable SSL; for Cloud Run also disable GSS encryption if the image lacks Kerberos libs.

With `SUPABASE_URL` + `SUPABASE_KEY` set, the API seeds tenants + admin via PostgREST on first boot. **You must run `schema.sql` before the first Production boot** — the API no longer uses `EnsureCreated` for that path (so OTP user tables come from SQL too).

---

## Step 2 — Google Cloud (one-time)

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

---

## Step 3 — Deploy API to Cloud Run

From **repo root**:

```bash
gcloud builds submit --config backend/cloudbuild.yaml \
  --substitutions=_REGION=asia-south1,_SERVICE=sanathanam-api,_REPO=sanathanam
```

Or local Docker:

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

### Environment variables

Cloud Run → service → **Edit & deploy** → Variables. Full list: [`backend/env.production.example`](backend/env.production.example).

| Variable | Required | Notes |
|----------|----------|--------|
| `ASPNETCORE_ENVIRONMENT` | Yes | `Production` |
| `UsePostgres` | Yes | `true` |
| `SUPABASE_URL` | Yes (catalog) | Project URL — products/orders/admin via PostgREST |
| `SUPABASE_KEY` | Yes (catalog) | **service_role** key (API only) |
| `ConnectionStrings__Postgres` | Yes | Users/OTP/addresses via EF |
| `Jwt__Key` | Yes | 32+ random chars |
| `Jwt__Issuer` / `Jwt__Audience` | Yes | e.g. `sanathanam` / `sanathanam-shops` |
| `Admin__Email` / `Admin__Password` | First boot | Password must not be `Admin@123` |
| `Cors__Origins__0` … `__2` | Yes | Exact Netlify HTTPS origins |
| `Msg91__AuthKey` | Before customers | Empty = OTP/WhatsApp only logged |
| `Msg91__OtpTemplateId` | Before customers | SMS OTP template |
| `Msg91__WhatsAppNumber` | Before customers | Integrated WhatsApp number |
| `Msg91__OrderTemplateName` | Optional | Default `order_details` |

```bash
curl https://YOUR-SERVICE-xxxxx.run.app/health
# → {"status":"ok"}
```

Optional custom domain: Cloud Run → Manage custom domains → e.g. `api.sanathanamshop.in`.

---

## Step 4 — Netlify (three sites)

| Site | Build command | `VITE_TENANT` |
|------|---------------|---------------|
| Divine Petals | `npm run build:divine-petals` | `divine-petals` |
| Divine Jewels | `npm run build:divine-jewels` | `divine-jewels` |
| Sanathanam | `npm run build:sanathanam` | `sanathanam` |

Publish dir: `dist`. Node 20. Per site:

```text
VITE_API_URL=https://YOUR-SERVICE-xxxxx.run.app
VITE_TENANT=divine-petals
```

Details: [`netlify/README.md`](netlify/README.md).

---

## Step 5 — Domains, CORS, smoke test

1. Point custom domains at Netlify sites.  
2. Set Cloud Run `Cors__Origins__*` to those exact URLs; redeploy.  
3. Browse products; admin login + site switcher.  
4. After MSG91: OTP login → place order → WhatsApp confirmation.

---

## Step 6 — MSG91 SMS OTP + WhatsApp

| Channel | When | Config |
|---------|------|--------|
| **SMS OTP** | Customer login | `Msg91__AuthKey` + `Msg91__OtpTemplateId` |
| **WhatsApp Utility** | After order place | Auth key + `Msg91__WhatsAppNumber` + template |

### SMS OTP

MSG91 OTP API with `template_id`, `mobile` = `91` + phone, `otp` = code.

### WhatsApp Utility template

Name: `order_details` (or `Msg91__OrderTemplateName`). Language `en`. **Exactly 3 body variables:**

| Var | Example | Source |
|-----|---------|--------|
| `{{1}}` | Divine Petals | Brand name |
| `{{2}}` | DP-… | Order number |
| `{{3}}` | Items… Total ₹… | Line items + total |

```text
Thank you for shopping at {{1}}.

Order {{2}} is confirmed.

{{3}}

We will update you when it ships.
```

Order is saved even if WhatsApp fails (logged in `MessageLogs` + Cloud Run logs).

```text
Msg91__AuthKey=...
Msg91__OtpTemplateId=...
Msg91__WhatsAppNumber=...
Msg91__OrderTemplateName=order_details
```

---

## Security checklist

- [ ] Strong `Jwt__Key` and `Admin__Password`
- [ ] Secrets only in Cloud Run / Supabase — never in git
- [ ] CORS limited to three production origins
- [ ] MSG91 OTP + WhatsApp templates approved and tested
- [ ] `ASPNETCORE_ENVIRONMENT=Production`

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| API won’t start | Postgres / weak JWT / default admin on first boot — Cloud Run logs |
| CORS errors | Origins must match frontend exactly |
| OTP not arriving | MSG91 env / template |
| WhatsApp missing | Number, template name, or not 3 body vars |
| Want Google SMS instead | Firebase Phone Auth — separate integration; WhatsApp still needs MSG91/Meta |

---

## Local vs production

| | Local | Production |
|--|-------|------------|
| Frontends | Vite `:5173`–`:5175` | Netlify ×3 |
| API | `dotnet run` `:5214` | Cloud Run |
| DB | SQLite | Supabase Postgres |
| OTP | `123456` | MSG91 SMS (or Firebase if you swap later) |
| WhatsApp | API console log | MSG91 Utility (Google has no WhatsApp API) |
| Admin | `admin@sanathanam.local` / `Admin@123` | `Admin__*` env |

---

## Appendix — Firebase Phone Auth (Google SMS OTP only)

Use only if you want Google-billed SMS instead of MSG91 SMS.

1. Create a Firebase project linked to the **same GCP billing** account.  
2. Enable **Authentication → Phone**.  
3. Allow SMS region **IN**.  
4. Add Netlify domains to authorized domains.  
5. Frontend: `signInWithPhoneNumber` + reCAPTCHA.  
6. Backend: verify Firebase ID token, then issue your existing shop JWT (or trust Firebase tokens end-to-end).  

**Not implemented in this repo today.** WhatsApp order messages still require MSG91 (or Meta Cloud API) — Google does not provide WhatsApp.
