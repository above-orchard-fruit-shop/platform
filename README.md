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
