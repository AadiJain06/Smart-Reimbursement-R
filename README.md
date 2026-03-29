# Smart Reimbursement Management System

A production-oriented expense reimbursement platform with multi-level and conditional approval workflows, OCR receipt parsing, JWT role-based access, and real-time updates.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 (Vite), Tailwind CSS, Zustand, React Router, React Hook Form, Zod, Recharts |
| Backend | Node.js, Express, Prisma ORM |
| Database | SQLite (file) |
| Auth | JWT (access tokens) |
| OCR | Tesseract.js |
| Real-time | Socket.IO |
| External APIs | [REST Countries](https://restcountries.com), [ExchangeRate-API](https://www.exchangerate-api.com/) |

## Folder Structure

```
odoo/
├── README.md
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.ts
│   │   └── server.ts
│   ├── uploads/          # created at runtime for receipts
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── store/
    │   ├── services/
    │   ├── hooks/
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    └── .env.example
```

## Prerequisites

- Node.js 20+
- npm or pnpm

## Setup

### 1. Backend (SQLite)

The default `DATABASE_URL` is `file:./prisma/dev.db` under `backend/` (the file is created when you run migrations). No separate database server is required.

Workflow definitions and OCR metadata are stored as JSON **strings** in SQLite; roles and statuses are stored as strings, with the same values as before (`ADMIN`, `PENDING`, etc.).

```bash
cd backend
cp .env.example .env
# Set JWT_SECRET; optional: FRONTEND_URL, PORT
npm install
npx prisma migrate dev
npm run seed
npm run dev
```

API runs at `http://localhost:4000` by default.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App runs at `http://localhost:5173` by default.

## Deployment

See **[DEPLOY.md](./DEPLOY.md)** for production build commands, environment variables (`VITE_API_URL`, `FRONTEND_URL`), migrations (`prisma migrate deploy`), and notes on SQLite vs PostgreSQL.

## Features

- **Auth & company**: Signup creates company + admin; default currency from country API.
- **Roles**: Admin, Manager, Employee with RBAC middleware.
- **Expenses**: Multi-currency amounts, conversion to company currency, receipt upload.
- **OCR**: Receipt image → extracted amount, date, vendor, description (heuristic parsing).
- **Workflows**: Sequential steps, percentage quorum, specific approver shortcuts, hybrid rules; combined with sequential blocks.
- **Approvals**: Approve/reject/escalate/override (admin), comments, audit log.
- **Bonus**: Offline cache (localStorage), role dashboards, analytics charts, mock email log.

## API Overview

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register company + admin |
| POST | `/api/auth/login` | Login |
| POST | `/api/users` | Create user (admin) |
| GET | `/api/users` | List users |
| POST | `/api/expenses` | Submit expense |
| GET | `/api/expenses` | List expenses (scoped by role) |
| GET | `/api/expenses/:id` | Expense detail |
| POST | `/api/approve` | Approve action |
| POST | `/api/reject` | Reject action |
| GET | `/api/pending` | Pending approvals for current user |
| POST | `/api/rules` | Create/update workflow rule |
| GET | `/api/rules` | List rules |
| POST | `/api/ocr/scan` | OCR receipt |
| GET | `/api/meta/countries` | Countries + currencies (proxied) |

## Git Workflow

This repo was initialized with feature branches:

- `feature/backend-setup` — API, Prisma, workflows, OCR
- `feature/frontend-ui` — Vite app, Tailwind, Zustand

Merge both into `main` for the full stack.

```bash
git checkout main
git log --oneline --graph --all -10
```

## License

MIT (hackathon / demo use).
