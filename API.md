# API contract — Above Orchard Fruit Shop

The storefront (`frontend/`) and the admin dashboard (`frontend-admin/`) call the
FastAPI backend at `NEXT_PUBLIC_API_URL`. Until that variable is set, both apps run in
**mock mode** (data kept in the browser's localStorage), so the UI can be developed
before the endpoints below exist.

All bodies are JSON. Field names are `snake_case`. Errors return
`{"detail": "<message shown to the user>"}` with a matching HTTP status.

## Data models

```ts
Product {
  id: string
  name: string
  description: string
  category: string          // "ผลไม้ไทย", "ผลไม้นำเข้า", ...
  price: number             // THB per unit
  unit: string              // "กก.", "ลูก", "หวี", ...
  stock: number             // integer >= 0
  emoji?: string | null     // fallback picture
  image_url?: string | null // S3 / CloudFront URL (https://)
  is_active: boolean        // false = hidden from the storefront
}

Order {
  id: string                // hard-to-guess, e.g. "AO-MH2K3J1-7XQ2P"
  customer: { name, phone, email?, address }
  items: [{ product_id, name, price, unit, quantity }]  // price/name copied at order time
  total: number
  status: "pending" | "confirmed" | "shipping" | "completed" | "cancelled"
  payment_method: "cod" | "transfer"
  note?: string
  created_at: string        // ISO 8601, UTC
}
```

## Public (storefront)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/products` | – | `Product[]` (only `is_active = true`) |
| GET | `/products/{id}` | – | `Product` · 404 if missing or inactive |
| POST | `/orders` | `{ customer, items: [{product_id, quantity}], payment_method, note? }` | `Order` (201) |
| GET | `/orders/{id}` | – | `Order` · 404 if missing |

`POST /orders` rules the backend must enforce (never trust the client):

- Look up each product's current `price` and compute `total` on the server.
- Reject with **409** if a product is inactive or `quantity > stock`.
- Decrease stock atomically (DynamoDB `TransactWriteItems` with a
  `ConditionExpression: stock >= :qty`, or a SQL transaction) so two customers can't
  buy the last item at the same time.
- Validate phone (`^0\d{8,9}$`), name, and address; respond **422** otherwise.

## Auth

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/login` | `{ username, password }` | `{ access_token }` · 401 on bad credentials |

The admin app sends `Authorization: Bearer <access_token>` on every `/admin/*`
request and goes back to the login screen on **401**. The login gate in the admin UI
is only for convenience. **The backend must check the token and the admin role on
every `/admin/*` route.** (Amazon Cognito user pool + an `admin` group is a good fit
on AWS; a JWT signed with a secret from AWS Secrets Manager also works.)

## Admin (requires admin token)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/admin/products` | – | `Product[]` (including inactive) |
| POST | `/admin/products` | `Product` without `id` | `Product` (201) |
| PUT | `/admin/products/{id}` | `Product` without `id` | `Product` |
| DELETE | `/admin/products/{id}` | – | 204 |
| GET | `/admin/orders` | – | `Order[]`, newest first |
| PATCH | `/admin/orders/{id}` | `{ status }` | `Order` |

Status transitions accepted by `PATCH /admin/orders/{id}`:

```
pending   → confirmed | cancelled
confirmed → shipping  | cancelled
shipping  → completed | cancelled
completed, cancelled → (final, respond 409)
```

Cancelling an order puts its quantities back into stock.

## CORS

Allow the two frontend origins (dev: `http://localhost:3000`, `http://localhost:3001`)
with `Content-Type` and `Authorization` headers, using FastAPI's `CORSMiddleware`.
