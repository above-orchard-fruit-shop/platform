# frontend — storefront

Customer website for Above Orchard Fruit Shop (ร้านผลไม้เบื้องบน), built with Next.js 16 (App Router) and MUI.

## Pages

| Path | What it does |
|---|---|
| `/` | Product catalogue with search and category filter |
| `/products/[id]` | Product detail, choose quantity, add to cart |
| `/login` | Customer sign-in (returns to `?next=` afterwards) |
| `/register` | Customer sign-up: name, email, phone, password |
| `/cart` | Edit quantities, remove items, order summary (sign-in required) |
| `/checkout` | Delivery details + payment method, places the order (sign-in required) |
| `/orders/[id]` | Order confirmation and status tracking |
| `/track` | Look up an order by its number; signed-in shoppers also see their order history (status, date, items, total) and click a row for the details |

### Customer sign-in

- Anyone can browse products and track an order.
- **ใส่ตะกร้า** (add to cart), `/cart` and `/checkout` send signed-out shoppers to `/login?next=<page>`, and back to that page after signing in.
- The top-right corner shows a **เข้าสู่ระบบ** button when signed out, and the cart plus an account menu (name, email, sign out) when signed in. Signing out also empties the cart.
- The session (`access_token` + customer profile) is kept in `localStorage` under `aof-customer-session-v1` (`src/lib/session.ts`); the backend still checks the token on `POST /orders`.

The cart is kept in `localStorage`, so it survives reloads and stays in sync across tabs.

## Getting started

```bash
npm install
cp .env.example .env.local   # optional, see below
npm run dev                  # http://localhost:3000
```

Other scripts: `npm run build` (production build), `npm start` (serve the build), `npm run lint`.

### Backend connection

- `NEXT_PUBLIC_API_URL` **empty** → mock mode: products and orders are stored in this browser, so the UI works without the backend. An orange banner is shown.
- `NEXT_PUBLIC_API_URL=http://localhost:8000` → calls the FastAPI backend. The endpoints are listed in [`../API.md`](../API.md). Start the emulator and the backend first (see [`../backend/README.md`](../backend/README.md)), then `npm run dev`.

Restart `npm run dev` after editing `.env.local`; Next.js reads it only at startup.

### Product images

Pictures come from each product's `image_url` (uploaded to S3 from the admin dashboard). Products without one, or whose image fails to load, show `public/notfound.png`.

## Code layout

```
src/
├── app/            # routes (see table above)
├── components/     # SiteHeader, ProductCard, FruitImage, QuantityStepper, Toast…
└── lib/
    ├── api.ts      # API client + mock implementation
    ├── cart.ts     # cart store (useSyncExternalStore + localStorage)
    ├── session.ts  # customer sign-in state, login redirects (useAuth, useRequireCustomer)
    ├── types.ts    # Product / Order types shared with the backend contract
    └── format.ts   # THB/date formatting, status labels
```
