# IBS Pro - Income & Billing System Pro

A complete SaaS platform for income management, invoicing, booking management, and business operations. Built with Next.js 16, TypeScript, Tailwind CSS, and PostgreSQL.

## Features

### Landing Page
- Animated hero section with canvas background
- Feature showcase, pricing (€40/mo, €360/yr), testimonials
- Multi-language support (English, Finnish, Arabic with RTL)

### Authentication
- **User Login**: Company Code + Username + Password
- **Admin Login**: Username + Password (separate portal)
- **Registration**: With company auto-creation and plan selection
- Session-based authentication with cookies

### Customer Dashboard (10 Modules)
1. **Overview** - KPIs, charts, recent activity
2. **Income** - Track all income entries with categories
3. **Expenses** - Manage expenses with vendor tracking
4. **Invoices** - Create, send, and manage invoices
5. **Customers** - Full CRM with contact management
6. **Bookings** - Schedule and manage appointments
7. **Work Orders** - Track jobs with priority and status
8. **Certificates** - Maintenance certificate management
9. **Reports** - Financial reports with date filtering
10. **Settings** - Profile, company, preferences

### Admin Portal (7 Sections)
1. **Overview** - System-wide KPIs and metrics
2. **Users** - Manage all user accounts
3. **Companies** - Company management
4. **Subscriptions** - Plan and billing management
5. **Support Chats** - Live chat with customers
6. **System Logs** - Activity audit trail
7. **Settings** - System configuration

### Additional Features
- **Real-time Chat** - REST API polling for customer support
- **PWA Support** - Installable on all devices
- **Responsive Design** - Mobile-first, works on all screen sizes
- **Dark Mode** - Full theme support
- **i18n** - English, Finnish, Arabic (RTL)

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Database**: PostgreSQL via Supabase (Prisma ORM)
- **State Management**: Zustand
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Auth**: Custom session-based auth

---

## Quick Start (One Command)

After cloning, just run the setup script — it does everything:

### Windows:
```cmd
setup-database.bat
```

### Mac / Linux:
```bash
chmod +x setup-database.sh
./setup-database.sh
```

This will: install deps → create `.env.local` → push schema to Supabase → seed admin + demo user.

---

## Deploy to Vercel

After running the setup script above:

1. Go to **[vercel.com/new](https://vercel.com/new)**
2. Import the repo: `kualaiq-pixel/ibspro.com-xver`
3. Framework: **Next.js** (auto-detected)
4. Add **Environment Variables**:
   - `DATABASE_URL` = `postgresql://postgres:May1921Sul%40%40102030@db.yolptlufhmpsdyjofdjj.supabase.co:5432/postgres`
   - `AUTH_SECRET` = `ibspro-secret-2024-change-in-production`
5. Click **Deploy**

That's it! Your app will be live in ~2 minutes.

---

## Test Accounts

| Type | Credentials |
|------|------------|
| **Admin** | username: `khaleel`, password: `586627` |
| **Demo User** | company: `DEMO001`, username: `demouser`, password: `demo1234` |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `AUTH_SECRET` | Secret key for session tokens |

---

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes (auth, CRUD for all modules)
│   ├── globals.css    # Global styles + Tailwind
│   ├── layout.tsx     # Root layout with PWA meta
│   └── page.tsx       # Main page router
├── components/
│   ├── admin/         # Admin portal components
│   ├── auth/          # Login, Register, AdminLogin
│   ├── chat/          # Chat widget (REST API polling)
│   ├── dashboard/     # 10 dashboard modules
│   ├── landing/       # Landing page
│   ├── providers.tsx  # Theme + query providers
│   └── ui/            # shadcn/ui components
├── hooks/             # Custom React hooks
└── lib/
    ├── db.ts          # Prisma client
    ├── i18n.ts        # Translations (EN/FI/AR)
    ├── store.ts       # Zustand global store
    └── utils.ts       # Utility functions
prisma/
├── schema.prisma      # 16 database models
└── seed.ts            # Admin + demo user seed
public/
├── manifest.json      # PWA manifest
└── sw.js              # Service worker
```

---

## License

Private - All rights reserved.
