# StockSense — Enterprise Inventory Management System

**StockSense** is a centralized, production-ready full-stack Inventory Management System designed to replace manual stock registers and fragmented spreadsheets. Every stock change (**Receipt**, **Delivery**, **Internal Transfer**, **Adjustment**) is modeled as an atomic double-entry movement between two locations, permanently logged in an append-only, immutable **Stock Ledger**, accompanied by real-time KPI metrics and analytics.

---

## 🚀 Key Architectural Principles & Business Rules

1. **Transactional Double-Entry Movement Model**:
   - **Receipt**: `Vendors (LOC-VEND)` $\longrightarrow$ `Warehouse Internal Location` ($+\text{Stock}$)
   - **Delivery**: `Warehouse Internal Location` $\longrightarrow$ `Customers (LOC-CUST)` ($-\text{Stock}$)
   - **Internal Transfer**: `Location A` $\longrightarrow$ `Location B` ($\Delta \text{Net Company Stock} = 0$)
   - **Adjustment**: `LOC-ADJ` $\longleftrightarrow$ `Warehouse Location` ($\text{Stock} = \text{Counted Quantity}$)

2. **Strict Validation Invariant**:
   - Stock quantities update **ONLY** when a Document is validated to `"done"`.
   - Documents in `draft`, `waiting`, or `ready` states never alter inventory.
   - Deliveries and internal transfers strictly check source location availability and abort with descriptive errors if stock is insufficient.

3. **Immutable Audit Ledger**:
   - Every validated transaction writes a permanent, unalterable `StockMove` record.
   - Ledger records cannot be updated or deleted; corrections are handled via explicit Inventory Adjustments.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Recharts
- **Backend**: Next.js Server Route Handlers, Node.js runtime
- **Database & ORM**: PostgreSQL / Supabase compatible schema managed via Prisma ORM (SQLite enabled by default for zero-friction local execution)
- **Security & Auth**: JWT (JSON Web Tokens) with `bcryptjs` password hashing, HttpOnly cookie support, Role-Based Access Control (`manager` vs `staff`), and OTP password reset flow

---

## 🔐 Default Demo Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Manager** | `manager@stocksense.io` | `password123` | Full access (Warehouses, Locations, Reset Demo DB, CRUD) |
| **Staff** | `staff@stocksense.io` | `password123` | Operations, Receipts, Deliveries, Transfers, Adjustments |

---

## 📦 Getting Started & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
# SQLite (Local Zero-Config Default):
DATABASE_URL="file:./dev.db"

# Or for PostgreSQL / Supabase:
# DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"

JWT_SECRET="stocksense_super_secret_jwt_key_2026_prod"
NEXT_PUBLIC_APP_NAME="StockSense"
```

### 3. Initialize Database & Seed Demo Data
```bash
npx prisma db push
npx tsx prisma/seed.ts
```

### 4. Run Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Automated End-to-End Scenario Verification

To run the automated verification script that executes all 4 core problem statement scenarios:

```bash
npx tsx scripts/test-e2e.ts
```

### The 4 Verified Test Scenarios:
1. **Receive 100 kg Steel (Receipt)**: $+100\text{ kg}$ into Main Store.
2. **Transfer Main Store $\longrightarrow$ Production Rack**: $50\text{ kg}$ moved; location quantities updated, company net stock unchanged.
3. **Deliver 20 Units Finished Goods (Delivery)**: $-20\text{ units}$; attempts to deliver beyond available quantity correctly blocked.
4. **Adjust 3 kg Damaged Steel (Adjustment)**: Stock decremented to physical count ($47\text{ kg}$) with variance delta logged.
5. **Ledger Audit Verification**: All operations recorded in the immutable Stock Ledger.

---

## 📱 Modules & Features Walkthrough

- **Dashboard**: Real-time KPI cards (In Stock, Low Stock, Out of Stock, Pending Receipts, Pending Deliveries, Transfers), multi-attribute filter toolbar, and interactive Recharts visualizations.
- **Product Catalog**: SKU uniqueness enforcement, category tags, stock per location breakdown, and reorder warning badges.
- **Receipts**: Multi-product line items, supplier reference, draft-to-done workflow, and instant intake validation.
- **Deliveries**: Customer dispatches, picking & packing stages, stock availability indicators, and dispatch validation.
- **Internal Transfers**: Cross-warehouse and rack-to-rack stock transfers.
- **Inventory Adjustments**: Physical count variance calculator with automatic delta computation and mandatory audit reason.
- **Stock Ledger (Move History)**: Full audit table with search by product, SKU, location, type, date, and user.
- **Warehouses & Locations**: Facility setup, internal location/rack creation, and stock tracking per location.
- **Suppliers**: Vendor directory with linked document counts.
- **Settings & Profile**: Category management, password modification, and one-click demo data reset.

---

## 🚀 Production Deployment (Vercel / Node.js / Docker)

### Build for Production:
```bash
npm run build
npm start
```

### Connecting to Supabase / PostgreSQL in Production:
1. In Supabase, copy your connection string from **Project Settings > Database > URI**.
2. Set `DATABASE_URL` in your production environment variables.
3. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
4. Run `npx prisma db push` to synchronize tables and deploy.
