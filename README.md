# RosterIQ

Intelligent roster and club management platform built with **Next.js App Router**, **Supabase**, and **Tailwind CSS**.

---

## 🏗️ Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 + custom shadcn-style components |
| Auth + DB | Supabase (Auth + Postgres + RLS) |
| Package manager | pnpm |
| Deployment | Vercel (Git integration) |
| CI | GitHub Actions |

---

## 🚀 Local Development (GitHub Codespaces)

### 1. Open in Codespaces

Click **Code → Codespaces → Create codespace on main**.

The `.devcontainer` config auto-runs `pnpm install` after creation.

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Then fill in your values in `.env.local` (see `.env.example` for required keys).  
The file is gitignored — **never commit secrets**.

### 3. Run the dev server

```bash
pnpm dev
```

App runs at `http://localhost:3000`. Port 3000 is auto-forwarded.

### 4. Seed the database (first time)

After running the app and signing up with `ballew.coppellfc@gmail.com`:

```bash
curl -X POST http://localhost:3000/api/dev/seed \
  -H "x-rosteriq-harness-secret: dev-secret-change-me"
```

This creates the **Coppell FC** tenant and grants `platform_admin` to the seed email.

---

## 🗄️ Supabase Setup

### Apply Migrations

From your Supabase project dashboard, open the SQL editor and run both files in order:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`

Or use the Supabase CLI:

```bash
supabase db push --linked
```

### Auth Configuration

In **Authentication → URL Configuration**:

| Setting | Value |
|---------|-------|
| Site URL | `https://www.roster-iq.org` |
| Email confirmation | **OFF** |

**Redirect URLs** (add all four):

```
http://localhost:3000/**
https://www.roster-iq.org/**
https://roster-iq.org/**
https://*.vercel.app/**
```

---

## ▲ Vercel Setup

1. Import the GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Framework preset: **Next.js** (auto-detected)
3. Production branch: `main`
4. Add the following environment variables in **Settings → Environment Variables** for **Production**, **Preview**, and **Development**:

| Variable | Where to get value |
|----------|-------------------|
| `NEXT_PUBLIC_APP_URL` | `https://www.roster-iq.org` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API (secret) |
| `ROSTERIQ_HARNESS_SECRET` | Any strong random string (prod: leave empty or use a vault) |

Vercel Git integration handles deployments automatically:
- `main` → Production
- Pull requests → Preview deployments

---

## 🔒 Branch Protection (Recommended)

In **GitHub → Settings → Branches → Branch protection rules** for `main`:

- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass before merging
  - Status check: `Lint · Typecheck · Test · Build`
- ✅ Require branches to be up to date before merging

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/callback/route.ts        # Supabase auth code exchange
│   │   ├── dev/seed/route.ts             # Dev-only seed endpoint
│   │   └── platform/admin-users/route.ts # Create admin users (API)
│   ├── app/
│   │   ├── layout.tsx                    # AppShell wrapper (auth guard)
│   │   ├── home/page.tsx                 # Home dashboard
│   │   ├── roster/page.tsx
│   │   ├── reviews/page.tsx
│   │   ├── education/page.tsx
│   │   ├── recruitment/page.tsx
│   │   └── fields/page.tsx
│   ├── login/page.tsx                    # Login page
│   └── platform/
│       ├── layout.tsx                    # Platform admin guard
│       ├── tenants/page.tsx              # Tenant management
│       └── admins/page.tsx               # Admin user management
├── components/
│   ├── shell/
│   │   ├── Sidebar.tsx                   # Left navigation
│   │   └── Header.tsx                    # Top header w/ tenant/user
│   └── ui/                               # shadcn-style UI primitives
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── select.tsx
│       └── separator.tsx
├── lib/
│   ├── roles.ts                          # Role helpers & priority
│   ├── utils.ts                          # cn() utility
│   └── supabase/
│       ├── client.ts                     # Browser Supabase client
│       └── server.ts                     # Server Supabase clients (anon + admin)
└── types/
    └── database.ts                       # TypeScript DB types

supabase/
└── migrations/
    ├── 001_initial_schema.sql            # Tables + triggers
    └── 002_rls_policies.sql              # Row-level security

.devcontainer/devcontainer.json           # Codespaces config
.github/workflows/ci.yml                 # CI pipeline
middleware.ts                            # Auth session refresh + route guards
```

---

## 👥 RBAC Roles

| Role | Scope |
|------|-------|
| `platform_admin` | Cross-tenant (tenant_id = NULL) |
| `club_admin` | Tenant-scoped |
| `club_director` | Tenant-scoped |
| `director_of_coaching` | Tenant-scoped |
| `select_coach` | Tenant-scoped |
| `academy_coach` | Tenant-scoped |
| `select_player` | Tenant-scoped |
| `academy_player` | Tenant-scoped |

---

## 🛡️ Security Notes

- Service role key is **never** sent to the browser — used only in server-side route handlers
- `/api/dev/seed` is blocked in production (`NODE_ENV === "production"` check)
- All tables use Row-Level Security enforced at the Postgres level
- `platform_admin` RLS helper functions are `security definer` to prevent privilege escalation
