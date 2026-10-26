import { getToken, setToken } from "./auth";
import { CognitoError, cognitoSignIn, loadCognitoConfig } from "./cognito";
import { SEED_PRODUCTS } from "./mock-data";
import type { Order, OrderStatus, Product } from "./types";

/**
 * Admin API client.
 *
 * - With NEXT_PUBLIC_API_URL set, calls the FastAPI backend and sends the
 *   admin token as `Authorization: Bearer <token>`.
 * - Without it, runs in mock mode against this browser's localStorage so the
 *   dashboard can be built and demoed before the backend is ready.
 *   Mock login: admin / admin1234
 *
 * See API.md at the repo root for the endpoint contract.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ?? "";
export const isMockMode = API_URL === "";

export type ProductInput = Omit<Product, "id">;

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
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้", 0);
  }
  // A 401 without a token is a failed login: fall through and show the server's message.
  if (res.status === 401 && token) {
    setToken(null); // expired or invalid session → back to login
    throw new ApiError("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", 401);
  }
  if (!res.ok) {
    let message = `เกิดข้อผิดพลาด (${res.status})`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // no JSON body
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login(username: string, password: string): Promise<void> {
  if (isMockMode) {
    await wait(400);
    if (username !== "admin" || password !== "admin1234") {
      throw new ApiError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", 401);
    }
    setToken("mock-admin-token");
    return;
  }
  const cognito = await loadCognitoConfig();
  if (cognito) {
    try {
      setToken(await cognitoSignIn(cognito, username, password));
    } catch (err) {
      if (err instanceof CognitoError) throw new ApiError(err.message, err.status);
      throw err;
    }
    return;
  }
  const res = await request<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(res.access_token);
}

export function logout() {
  setToken(null);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export function listProducts(): Promise<Product[]> {
  if (isMockMode) return mock.listProducts();
  return request<Product[]>("/admin/products");
}

export function createProduct(input: ProductInput): Promise<Product> {
  if (isMockMode) return mock.createProduct(input);
  return request<Product>("/admin/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProduct(id: string, input: ProductInput): Promise<Product> {
  if (isMockMode) return mock.updateProduct(id, input);
  return request<Product>(`/admin/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteProduct(id: string): Promise<void> {
  if (isMockMode) return mock.deleteProduct(id);
  return request<void>(`/admin/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Product images (S3)
// ---------------------------------------------------------------------------

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];
export const MAX_IMAGE_MB = 5;

type UploadTicket = {
  upload_url: string;
  fields: Record<string, string>;
  image_url: string;
};

function isImageType(type: string): type is ImageType {
  return (IMAGE_TYPES as readonly string[]).includes(type);
}

/**
 * Upload a product photo straight to S3 and return its public URL.
 * The backend only signs a short-lived upload policy; the file never passes through it.
 */
export async function uploadProductImage(file: File): Promise<string> {
  if (isMockMode) {
    throw new ApiError("อัปโหลดรูปได้เมื่อเชื่อมต่อ backend แล้ว (ตั้งค่า NEXT_PUBLIC_API_URL)", 0);
  }
  if (!isImageType(file.type)) throw new ApiError("รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP", 422);
  if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
    throw new ApiError(`ไฟล์ใหญ่เกินไป (สูงสุด ${MAX_IMAGE_MB} MB)`, 413);
  }

  const ticket = await request<UploadTicket>("/admin/uploads/product-image", {
    method: "POST",
    body: JSON.stringify({ content_type: file.type, size: file.size }),
  });

  // S3 requires the policy fields first and the file as the last field.
  const form = new FormData();
  for (const [key, value] of Object.entries(ticket.fields)) form.append(key, value);
  form.append("file", file);

  let res: Response;
  try {
    res = await fetch(ticket.upload_url, { method: "POST", body: form });
  } catch {
    throw new ApiError("อัปโหลดรูปไม่สำเร็จ: เชื่อมต่อที่เก็บไฟล์ไม่ได้", 0);
  }
  if (!res.ok) throw new ApiError(`อัปโหลดรูปไม่สำเร็จ (${res.status})`, res.status);
  return ticket.image_url;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export function listOrders(): Promise<Order[]> {
  if (isMockMode) return mock.listOrders();
  return request<Order[]>("/admin/orders");
}

export function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  if (isMockMode) return mock.updateOrderStatus(id, status);
  return request<Order>(`/admin/orders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

// ---------------------------------------------------------------------------
// Mock implementation (localStorage)
// ---------------------------------------------------------------------------

type MockDb = { products: Product[]; orders: Order[] };
const MOCK_KEY = "aof-admin-mock-db-v1";

function wait(ms = 300) {
  return new Promise((r) => setTimeout(r, ms));
}

function seedOrders(): Order[] {
  const now = Date.now();
  const hour = 3_600_000;
  const p = (id: string) => SEED_PRODUCTS.find((x) => x.id === id)!;
  const line = (id: string, quantity: number) => {
    const prod = p(id);
    return { product_id: id, name: prod.name, price: prod.price, unit: prod.unit, quantity };
  };
  const make = (
    n: number,
    hoursAgo: number,
    status: OrderStatus,
    name: string,
    phone: string,
    items: ReturnType<typeof line>[],
  ): Order => ({
    id: `AO-DEMO${n}`,
    customer: { name, phone, address: "99/1 ถ.ฉลองกรุง แขวงลำปลาทิว เขตลาดกระบัง กรุงเทพฯ 10520" },
    items,
    total: items.reduce((s, i) => s + i.price * i.quantity, 0),
    status,
    payment_method: n % 2 ? "cod" : "transfer",
    created_at: new Date(now - hoursAgo * hour).toISOString(),
  });
  return [
    make(6, 0.5, "pending", "สมชาย ใจดี", "0812345678", [line("p-mango", 2), line("p-banana", 1)]),
    make(5, 2, "pending", "วิไล สุขสม", "0898765432", [line("p-grape", 1)]),
    make(4, 5, "confirmed", "อนันต์ รักผลไม้", "0861112222", [line("p-coconut", 6), line("p-pineapple", 2)]),
    make(3, 20, "shipping", "พรทิพย์ แสงทอง", "0823334444", [line("p-apple", 2), line("p-orange", 1)]),
    make(2, 30, "completed", "ธนพล มีสุข", "0835556666", [line("p-strawberry", 2)]),
    make(1, 50, "cancelled", "กมล ศรีสวัสดิ์", "0847778888", [line("p-watermelon", 3)]),
  ];
}

function loadDb(): MockDb {
  try {
    const raw = window.localStorage.getItem(MOCK_KEY);
    if (raw) return JSON.parse(raw) as MockDb;
  } catch {
    // fall through to seed
  }
  const db = { products: structuredClone(SEED_PRODUCTS), orders: seedOrders() };
  saveDb(db);
  return db;
}

function saveDb(db: MockDb) {
  try {
    window.localStorage.setItem(MOCK_KEY, JSON.stringify(db));
  } catch {
    // ignore
  }
}

function slugId(): string {
  return `p-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

const mock = {
  async listProducts() {
    await wait();
    return loadDb().products;
  },
  async createProduct(input: ProductInput) {
    await wait();
    const db = loadDb();
    const product: Product = { ...input, id: slugId() };
    db.products.push(product);
    saveDb(db);
    return product;
  },
  async updateProduct(id: string, input: ProductInput) {
    await wait();
    const db = loadDb();
    const idx = db.products.findIndex((p) => p.id === id);
    if (idx < 0) throw new ApiError("ไม่พบสินค้านี้", 404);
    db.products[idx] = { ...input, id };
    saveDb(db);
    return db.products[idx];
  },
  async deleteProduct(id: string) {
    await wait();
    const db = loadDb();
    db.products = db.products.filter((p) => p.id !== id);
    saveDb(db);
  },
  async listOrders() {
    await wait();
    return [...loadDb().orders].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async updateOrderStatus(id: string, status: OrderStatus) {
    await wait();
    const db = loadDb();
    const order = db.orders.find((o) => o.id === id);
    if (!order) throw new ApiError("ไม่พบคำสั่งซื้อนี้", 404);
    if (order.status === "cancelled" || order.status === "completed") {
      throw new ApiError("คำสั่งซื้อนี้ปิดแล้ว เปลี่ยนสถานะไม่ได้", 409);
    }
    // Return stock when an order is cancelled (mirrors what the backend should do).
    if (status === "cancelled") {
      for (const item of order.items) {
        const product = db.products.find((p) => p.id === item.product_id);
        if (product) product.stock += item.quantity;
      }
    }
    order.status = status;
    saveDb(db);
    return order;
  },
};
