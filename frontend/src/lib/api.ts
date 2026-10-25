import { SEED_PRODUCTS } from "./mock-data";
import type { CreateOrderInput, Order, Product } from "./types";

/**
 * Storefront API client.
 *
 * - When NEXT_PUBLIC_API_URL is set (e.g. http://localhost:8000 or the API
 *   Gateway / ALB URL on AWS) every call goes to the FastAPI backend.
 * - When it is not set, the app runs in "mock mode": data lives in this
 *   browser's localStorage so the UI can be developed and demoed before the
 *   backend endpoints exist. See API.md at the repo root for the contract.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
export const isMockMode = API_URL === "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้", 0);
  }
  if (!res.ok) {
    let message = `เกิดข้อผิดพลาด (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // response had no JSON body
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function listProducts(): Promise<Product[]> {
  if (isMockMode) return mock.listProducts();
  return request<Product[]>("/products");
}

export function getProduct(id: string): Promise<Product> {
  if (isMockMode) return mock.getProduct(id);
  return request<Product>(`/products/${encodeURIComponent(id)}`);
}

export function createOrder(input: CreateOrderInput): Promise<Order> {
  if (isMockMode) return mock.createOrder(input);
  return request<Order>("/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getOrder(id: string): Promise<Order> {
  if (isMockMode) return mock.getOrder(id);
  return request<Order>(`/orders/${encodeURIComponent(id)}`);
}

// ---------------------------------------------------------------------------
// Mock implementation (localStorage)
// ---------------------------------------------------------------------------

type MockDb = { products: Product[]; orders: Order[] };
const MOCK_KEY = "aof-storefront-mock-db-v1";

function loadDb(): MockDb {
  try {
    const raw = window.localStorage.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw) as MockDb;
  } catch {
    // storage unavailable or corrupted: start fresh
  }
  return { products: structuredClone(SEED_PRODUCTS), orders: [] };
}

function saveDb(db: MockDb) {
  try {
    window.localStorage.setItem(MOCK_KEY, JSON.stringify(db));
  } catch {
    // ignore quota / private-mode errors
  }
}

const wait = (ms = 300) => new Promise((r) => setTimeout(r, ms));

function newOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `AO-${stamp}-${rand}`;
}

const mock = {
  async listProducts() {
    await wait();
    return loadDb().products.filter((p) => p.is_active);
  },

  async getProduct(id: string) {
    await wait(150);
    const product = loadDb().products.find((p) => p.id === id && p.is_active);
    if (!product) throw new ApiError("ไม่พบสินค้านี้", 404);
    return product;
  },

  async createOrder(input: CreateOrderInput) {
    await wait(500);
    const db = loadDb();
    if (input.items.length === 0) throw new ApiError("ตะกร้าว่าง", 422);

    const items = input.items.map(({ product_id, quantity }) => {
      const product = db.products.find((p) => p.id === product_id);
      if (!product || !product.is_active) {
        throw new ApiError("มีสินค้าบางรายการไม่พร้อมขายแล้ว", 409);
      }
      if (quantity < 1 || quantity > product.stock) {
        throw new ApiError(
          `${product.name} มีในสต็อกเพียง ${product.stock} ${product.unit}`,
          409,
        );
      }
      return { product, quantity };
    });

    // Prices are taken from the product record, never from the client.
    for (const { product, quantity } of items) product.stock -= quantity;
    const order: Order = {
      id: newOrderId(),
      customer: input.customer,
      items: items.map(({ product, quantity }) => ({
        product_id: product.id,
        name: product.name,
        price: product.price,
        unit: product.unit,
        quantity,
      })),
      total: items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),
      status: "pending",
      payment_method: input.payment_method,
      note: input.note,
      created_at: new Date().toISOString(),
    };
    db.orders.unshift(order);
    saveDb(db);
    return order;
  },

  async getOrder(id: string) {
    await wait(150);
    const order = loadDb().orders.find((o) => o.id === id);
    if (!order) throw new ApiError("ไม่พบคำสั่งซื้อนี้", 404);
    return order;
  },
};
