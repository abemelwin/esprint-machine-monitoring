# ESPrint Machine Monitoring System

A modern, full-featured web application for monitoring printer/copier inventory units, managing client reservations, tracking TBA (To Be Allocated) queues, and enforcing role-based permissions with privacy data masking.

---

## 🚀 Overview

The **ESPrint Machine Monitoring System** provides end-to-end tracking of machine inventory lifecycle: from arrival (`Incoming`) and warehousing (`In Stock`, `Recertified`, `Demo`) to client reservation (`Reserved`), delivery (`Delivered`), and decommissioning (`Pullout Parts`).

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS**, and powered by **Supabase**.

---

## ✨ Features

### 1. 🖨️ Machine Inventory Tracking
- Real-time status management: `Incoming`, `In Stock`, `Recertified`, `Demo`, `Reserved`, `Delivered`, `Pullout Parts`.
- Detailed tracking per unit: Serial Number, PO Number, Brand, Model, Branch, Client Name & Code, Assigned Account Executive (AE), and Dispatch/Delivery Dates.
- Fast multi-column filtering and keyword search.

### 2. 📋 TBA (To Be Allocated) Queue
- Queue client reservations before physical units arrive in stock.
- One-click **Fulfillment** to assign available `In Stock` units directly to queued TBA requests.

### 3. 📊 Stock & Reorder Monitoring
- Aggregated stock counts categorized by Brand and Model.
- Configurable **Reorder Points** with visual low-stock indicator badges.

### 4. 🕒 Event History & Audit Trail
- Comprehensive timeline logs for every machine: records creation, edits, reservations, fulfillments, cancellations, and status changes with user attribution.

### 5. 🔐 Role-Based Access Control (RBAC) & Privacy
- Custom role permissions (`edit`, `reserve`, `deliver`, `unreserve`, `manageUsers`, `viewClient`).
- **Client Data Masking**: Automatic masking (`•••`) of client names, codes, and locations for non-assigned Account Executives to protect client confidentiality.

### 6. 💾 Import & Export Tools
- Privacy-aware CSV export (respects user viewing permissions).
- Complete JSON database backup and restore for disaster recovery and legacy data migration.

### 7. 🌗 Modern UI & Dynamic Features
- Light and Dark mode with persistent user preference.
- Live version polling for automated new deployment notifications.
- Fully responsive layout for desktop, tablet, and mobile devices.

---

## 🛠️ Tech Stack

- **Frontend Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **State & Data Fetching**: [TanStack Query v5](https://tanstack.com/query)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security, Auth)
- **Linter & Code Quality**: [Oxlint](https://oxc.rs/)

---

## 📁 Project Structure

```text
esprint-machine-monitoring/
├── public/                     # Static assets and version.json
├── src/
│   ├── components/
│   │   ├── admin/              # User management & role configuration
│   │   ├── machines/           # Machine table, modal, history, and actions
│   │   ├── stock/              # Aggregated stock and reorder points
│   │   ├── tba/                # TBA queue view and fulfillment modals
│   │   └── ui/                 # Reusable buttons, inputs, modals, badges
│   ├── hooks/                  # Custom React hooks (useAuth, useMachines, etc.)
│   ├── lib/                    # Supabase client, permissions, import/export
│   ├── pages/                  # Top-level views (LoginPage, etc.)
│   ├── types/                  # TypeScript types & Supabase schema models
│   ├── App.tsx                 # Core application shell & navigation
│   └── main.tsx                # Entry point
├── supabase/
│   └── migrations/             # SQL schema migrations and RLS policies
├── render.yaml                 # Render static site deployment blueprint
└── package.json
```

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm** or **pnpm**
- A **Supabase** project instance

### 1. Clone the Repository
```bash
git clone https://github.com/abemelwin/esprint-machine-monitoring.git
cd esprint-machine-monitoring
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Database Setup
Execute the SQL files inside the `supabase/migrations/` directory in sequence on your Supabase SQL Editor:
1. `001_initial_schema.sql` - Core schema, tables, RLS policies, and triggers
2. `002_auto_confirm_users.sql` - Auth confirmation trigger
3. `003_update_ae_codes_to_lastname.sql` - AE code formatting helper
4. `004_cleanup_ae_roles_only.sql` - Role sanitization
5. `005_create_brands_models_tables.sql` - Brands and models registry

### 5. Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📦 Production Build & Deployment

### Build for Production
```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

### Deploy to Render
The repository includes a ready-to-use `render.yaml` configuration:
1. Connect your repository to [Render](https://render.com/).
2. Create a new **Static Site** using the Blueprint.
3. Configure the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Render Dashboard.

---

## 📄 License

This project is proprietary software developed for ESPrint Machine Monitoring. All rights reserved.
