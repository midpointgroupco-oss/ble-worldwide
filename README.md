# BLE Worldwide — Global Homeschool Management Platform

A full-stack school management system built with React + Vite, Supabase, and Netlify.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + Vite |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| Hosting | Netlify |
| Repo | GitHub |

---

## Roles

- **Admin** — Full platform oversight, all students, all data
- **Teacher** — Their assigned classes and students only
- **Parent** — Their child's data only (grades, schedule, billing)

---

## Setup Instructions

### 1. GitHub
```bash
git init
git add .
git commit -m "Initial BLE Worldwide setup"
gh repo create midpointgroupco-oss/ble-worldwide --public
git remote add origin https://github.com/midpointgroupco-oss/ble-worldwide.git
git push -u origin main
```

### 2. Supabase
1. Go to [supabase.com](https://supabase.com) → New Project
2. Name it: `ble-worldwide`
3. Copy your **Project URL** and **anon public key** from Settings → API
4. Open SQL Editor → paste the full contents of `supabase/migrations/001_initial_schema.sql` → Run
5. In Authentication → Settings:
   - Disable "Confirm email" for testing
   - Enable "Allow new users to sign up"

### 3. Create first Admin user
In Supabase → Authentication → Users → Add user:
- Email: `admin@bleworldwide.edu`
- Password: (set a strong one)
- After creating, run in SQL Editor:
```sql
update public.profiles set role = 'admin', full_name = 'Marcelle Brown' where id = (
  select id from auth.users where email = 'admin@bleworldwide.edu'
);
```

### 4. Local Development
```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 5. Netlify Deployment
1. Push to GitHub
2. Go to [app.netlify.com](https://app.netlify.com) → Add new site → Import from GitHub
3. Select your repo
4. Build settings are auto-detected from `netlify.toml`
5. In Site settings → Environment variables, add:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
6. Trigger deploy

---

## Creating Users

To add a teacher:
```sql
-- After they sign up (or you create them in Supabase Auth):
update public.profiles 
set role = 'teacher', full_name = 'Ms. Nguyen' 
where id = (select id from auth.users where email = 'teacher@email.com');
```

To add a parent:
```sql
update public.profiles 
set role = 'parent', full_name = 'Johnson Family' 
where id = (select id from auth.users where email = 'parent@email.com');
```

---

## Project Structure

```
ble-worldwide/
├── src/
│   ├── components/
│   │   └── layout/        # Sidebar, Topbar, Admin/Teacher/ParentLayout
│   ├── pages/
│   │   ├── admin/         # Dashboard, Students, Schedule, Grades, Messages, Reports, Settings
│   │   ├── teacher/       # Dashboard, Classes, Grades, Schedule, Messages
│   │   └── parent/        # Dashboard, Progress, Schedule, Messages, Billing
│   ├── lib/
│   │   ├── supabase.js    # Supabase client
│   │   └── AuthContext.jsx # Auth state + role management
│   └── styles/
│       └── global.css
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full DB schema + RLS
├── netlify.toml
├── vite.config.js
└── .env.example
```
