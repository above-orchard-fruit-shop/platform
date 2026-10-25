# frontend-admin — admin dashboard

Shop admin dashboard for Above Orchard Fruit Shop (ร้านผลไม้เบื้องบน), built with Next.js 16 (App Router) and MUI.

## Pages

| Path | What it does |
|---|---|
| `/login` | Admin sign-in |
| `/` | Dashboard: today's sales, pending orders, total sales, low-stock products, latest orders (click one to see it and change its status right there) |
| `/products` | Product table: search, add, edit (price, stock, image, show/hide), delete |
| `/orders` | Orders by status, search, view details, move status forward or cancel |

Every page except `/login` requires a signed-in admin. The token is kept in `sessionStorage` and sent as `Authorization: Bearer …`. The backend must still check it on every `/admin/*` route.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional, see below
npm run dev                  # http://localhost:3001
```

Other scripts: `npm run build` (production build), `npm start` (serve the build), `npm run lint`.

### Backend connection

- `NEXT_PUBLIC_API_URL` **empty** → mock mode with demo products and orders stored in this browser. Sign in with **admin / admin1234**.
- `NEXT_PUBLIC_API_URL=http://localhost:8000` → calls the FastAPI backend. The endpoints are listed in [`../API.md`](../API.md). Start the emulator and the backend first (see [`../backend/README.md`](../backend/README.md)), then sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `backend/.env`.

Restart `npm run dev` after editing `.env.local`; Next.js reads it only at startup.

Mock data is per browser and per app, so an order placed on the storefront in mock mode does not show up here. Connect both apps to the backend to share data.

### Product images

In the product form, **อัปโหลดรูป** sends a JPG, PNG or WebP (up to 5 MB) straight to S3 through a presigned upload from the backend, then fills in the image link. It is disabled in mock mode. Products without an image show `public/notfound.png`.

## Code layout

```
src/
├── app/            # routes (see table above)
├── components/     # AdminShell (auth gate + sidebar), ProductDialog, OrderDialog, FruitImage, Toast
└── lib/
    ├── api.ts      # API client + mock implementation
    ├── auth.ts     # admin token store
    ├── types.ts    # Product / Order types shared with the backend contract
    └── format.ts   # THB/date formatting, status labels
```
