# CarMatchr

CarMatchr is a reverse used-car marketplace where buyers post requirements and brokers respond with offers.

This project includes:

- React + TypeScript frontend (Vite)
- Express + SQLite backend
- Admin console at `/admin`
- Dataset-driven brand/model catalog (seeded from CSV files in the project root)

## Key Features

- Role-based auth for Buyer, Broker, and Admin
- One email can have at most one Buyer account and one Broker account
- Broker contact number required and shared in broker offers
- Buyer and Broker dashboards with real API persistence
- Admin broker approval flow (no simulated approval button)
- Catalog management:
  - Brand logos
  - Model images
  - Features per model
- Marketplace section can be shown/hidden from UI
- Validation error popups using `react-hot-toast`

## Tech Stack

- Frontend: React, TypeScript, Vite, React Router
- Backend: Node.js, Express
- Database: SQLite via `better-sqlite3`
- Data ingest: `csv-parse`

## Project Structure

- `src/` - frontend app
- `server/` - backend API and catalog seed scripts
- `db/` - SQLite database and uploads folder
- `CAR DETAILS FROM CAR DEKHO.csv` - source dataset
- `Cars export 2026-04-28 12-08-05.csv` - source dataset

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Seed catalog from CSV datasets

```bash
npm run seed:catalog
```

### 3) Start backend API

```bash
npm run dev:server
```

Backend runs on `http://localhost:4000`.

### 4) Start frontend

```bash
npm run dev
```

Frontend runs on Vite dev server (usually `http://localhost:5173`) and proxies `/api` requests to backend.

## Admin Access

Default admin credentials:

- Email: `admin@carmatchr.com`
- Password: `admin123`

Use `/admin` after login to:

- Approve brokers
- Add/assign features
- Set brand logos and model images

## Available Scripts

- `npm run dev` - run frontend
- `npm run dev:server` - run backend
- `npm run seed:catalog` - import brands/models from CSV datasets
- `npm run lint` - run ESLint
- `npm run build` - type-check + production build
- `npm run preview` - preview frontend build

## Notes

- If `better-sqlite3` fails due to Node ABI mismatch, run:

```bash
npm rebuild better-sqlite3
```

- CSV datasets do not include official logo/image assets. Assign exact brand logos and model images from Admin.
