# Sanathanam shops

Three branded storefronts, one C# API. Customers sign in with SMS OTP. Order details via WhatsApp (MSG91 in production).

| Site | Category | Local URL |
|------|----------|-----------|
| Divine Petals | Soaps & naturals | http://localhost:5173 |
| Divine Jewels | Jewellery | http://localhost:5174 |
| Sanathanam | Textiles & dry fruits | http://localhost:5175 |

**Production stack:** Netlify (frontends) + Google Cloud Run (API) + Supabase Postgres.

**Go-live instructions:** [`PRODUCTION.md`](PRODUCTION.md)

---

## Run locally

```bash
cd backend/src/Sanathanam.Api && dotnet run --launch-profile http
```

```bash
npm install
npm run dev:divine-petals    # :5173
npm run dev:divine-jewels    # :5174
npm run dev:sanathanam       # :5175
```

### Development accounts

- Customer OTP: `123456`
- Admin: `admin@sanathanam.local` / `Admin@123`
- Tenant header: `divine-petals` | `divine-jewels` | `sanathanam`

---

## Project layout

| Path | Role |
|------|------|
| `PRODUCTION.md` | Full production deploy guide |
| `src/` | React storefronts (Vite modes per brand) |
| `backend/src/Sanathanam.Api/` | ASP.NET Core API |
| `backend/cloudbuild.yaml` | Cloud Build → Artifact Registry → Cloud Run |
| `backend/env.cloudrun.example` | Cloud Run env template |
| `netlify/` | Per-site env examples + deploy notes |
| `netlify.toml` | Shared SPA redirects + headers |
