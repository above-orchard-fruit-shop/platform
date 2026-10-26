# platform

## Project: Above Orchard Fruit Shop (ร้านผลไม้เบื้องบน)

### Background

- In-store fruit sales are limited to customers who live near the shop.
- Customers cannot view products and prices at any time.
- Manual stock and order management is prone to errors.
- The shop wants to be able to serve a larger number of customers.
- The shop wants to adopt Cloud technology so the system can scale easily.

### Project Scope

- Develop a website for buying and selling fruit online.
- Allow customers to browse products and place orders through the website.
- Store product, customer, and order data in the Cloud.
- Allow shop administrators to add/edit products and review orders.
- Design the system to support future growth in the number of users.
- Improve the security and reliability of the system using Cloud services.

### Project Structure

```
platform/
├── backend/          # FastAPI service for the storefront and admin management (products, orders)
├── frontend/         # Customer-facing website
└── frontend-admin/   # Admin dashboard (Next.js)
```

See [API.md](API.md) for the backend API contract used by both frontends.

## Running locally

| Part | Folder | URL | Details |
|---|---|---|---|
| Local AWS emulator (DynamoDB + S3) | `backend/` | http://localhost:4566 | [backend/README.md](backend/README.md) |
| Backend API (FastAPI) | `backend/` | http://localhost:8000 (docs: `/docs`) | [backend/README.md](backend/README.md) |
| Storefront (Next.js) | `frontend/` | http://localhost:3000 | [frontend/README.md](frontend/README.md) |
| Admin dashboard (Next.js) | `frontend-admin/` | http://localhost:3001 | [frontend-admin/README.md](frontend-admin/README.md) |

### Requirements

- Python 3.11+ and [uv](https://docs.astral.sh/uv/)
- Node.js 20+ and npm

No AWS account is needed for local development: the emulator stands in for DynamoDB and S3 and costs nothing.

### First-time setup

```bash
cd backend
uv sync
cp .env.example .env          # set ADMIN_PASSWORD and JWT_SECRET (see the comments in the file)
cd ../frontend
npm install
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL=http://localhost:8000
cd ../frontend-admin
npm install
cp .env.example .env.local    # set NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Start everything (four terminals, in this order)

```bash
# 1. local AWS emulator — keep it running
cd backend
uv run moto_server -p 4566

# 2. create tables + bucket and load the starter products (again after every emulator restart)
cd backend
uv run aws-setup --seed --public-images
uv run backend

# 3. storefront
cd frontend
npm run dev

# 4. admin dashboard — sign in with ADMIN_USERNAME / ADMIN_PASSWORD from backend/.env
cd frontend-admin
npm run dev
```

Shoppers browse freely but must sign up (`/register`) or sign in (`/login`) on the storefront before adding to the cart or ordering.

The emulator keeps data in memory: stopping it erases products, orders, customer accounts and uploaded images. Next.js reads `.env.local` only at startup, so restart `npm run dev` after changing it.

### Run the full stack with Docker Compose

Docker Compose starts Moto, the backend, the storefront, and the admin
dashboard. Create `backend/.env` first by following the first-time setup above,
then run these commands from the repository root:

```powershell
docker compose up --build
```

The services are available at:

- Moto: `http://localhost:4566`
- Backend API: `http://localhost:8000` (docs: `/docs`)
- Storefront: `http://localhost:3000`
- Admin dashboard: `http://localhost:3001`

The Compose backend overrides `AWS_ENDPOINT_URL` with
`http://moto:4566`, the Docker service name. This is necessary because
`localhost` inside a container refers to that container itself. The backend
automatically runs `aws-setup --seed --public-images` before starting the API.

Stop the stack with the following command. Moto stores its data in memory, so
the next start creates empty tables and the backend seeds the catalogue again:

```powershell
docker compose down
```

`NEXT_PUBLIC_API_URL` is embedded into each Next.js image during the build as
`http://localhost:8000`, so rebuild the frontend images after changing the
backend URL.

### Frontends only (no backend)

Leave `NEXT_PUBLIC_API_URL` empty in `.env.local` and run just `npm run dev` in each frontend. Both apps then use mock data stored in the browser (admin login: `admin` / `admin1234`; storefront: sign up on `/register`, the account is kept in that browser). Each app keeps its own copy, so orders placed on the storefront don't show up in the admin dashboard, and image upload is disabled.

### Tests

```bash
cd backend
uv run pytest
```

For both frontends: `npx tsc --noEmit` and `npm run lint` (run `npx next typegen` once after a fresh `npm install`).
