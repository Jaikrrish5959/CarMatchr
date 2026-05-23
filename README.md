# CarMatchr

CarMatchr is a reverse used-car marketplace where buyers post requirements and brokers respond with offers.

The project is split into two completely separate repositories/folders:
- `frontend/`: React + TypeScript frontend (Vite)
- `backend/`: Express + SQLite backend API, including an Admin console and Dataset-driven catalog

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

- **Frontend:** React, TypeScript, Vite, React Router (`frontend/`)
- **Backend:** Node.js, Express (`backend/`)
- **Database:** SQLite via `better-sqlite3` (`backend/db/`)
- **Data Ingest:** `csv-parse` for initial seed data

## Project Structure

- `frontend/` - React frontend application
  - `src/` - React components, pages, contexts, etc.
- `backend/` - Node.js Express backend API
  - `db/` - SQLite database and local uploads folder
  - `CAR DETAILS FROM CAR DEKHO.csv` - Source dataset for seeding
  - `companies.csv` - Source dataset for seeding

---

## How to Run Locally

Since the project is split, you need to start the backend and frontend separately in two different terminal windows.

### 1. Start the Backend

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend
```

**Install dependencies:**
```bash
npm install
```

**Configure environment:**
```bash
cp .env.example .env
```
*(Edit `.env` and set a strong `JWT_SECRET`)*

**Seed the catalog from the CSV datasets (First time only):**
```bash
npm run seed:catalog
```

**Start the API Server:**
```bash
npm start
```
*The backend API will run on `http://localhost:4001`.*

### 2. Start the Frontend

Open a **second** terminal and navigate to the `frontend/` directory:

```bash
cd frontend
```

**Install dependencies:**
```bash
npm install
```

**Start the Vite Dev Server:**
```bash
npm run dev
```
*The frontend will run on `http://localhost:5173` and automatically proxy `/api` requests to your backend at port 4001.*

---

## Admin Access

Default admin credentials are set during the first database initialization.
See `backend/.env.example` for configuration. **Change the default admin password immediately after first login.**

Use `/admin` after login to:
- Approve brokers
- Add/assign features
- Set brand logos and model images

## Notes

- If `better-sqlite3` fails due to Node ABI mismatch, run this in the backend folder:
  ```bash
  cd backend
  npm rebuild better-sqlite3
  ```
- CSV datasets do not include official logo/image assets. Assign exact brand logos and model images from Admin.

## Security

- JWT authentication on all protected API routes
- Role-based access control (Buyer / Broker / Admin)
- Ownership verification prevents IDOR attacks
- Rate limiting on auth endpoints (30 req / 15 min)
- Helmet security headers
- CORS restricted to configured origins
- bcrypt password hashing (no plaintext fallback)
- UUID-based resource IDs
- Database indexes on all lookup columns
