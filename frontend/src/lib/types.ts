// Shared data shapes. Field names use snake_case to match the FastAPI backend.

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number; // THB per unit
  unit: string; // e.g. "กก.", "ลูก", "หวี"
  stock: number;
  image_url?: string | null; // e.g. an S3 / CloudFront URL
  is_active: boolean;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipping"
  | "completed"
  | "cancelled";

export type PaymentMethod = "cod" | "transfer";

export type Customer = {
  name: string;
  phone: string;
  email?: string;
  address: string;
};

export type OrderItem = {
  product_id: string;
  name: string;
  price: number;
  unit: string;
  quantity: number;
};

export type Order = {
  id: string;
  customer_id?: string | null; // account that placed the order
  customer: Customer; // delivery details
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  note?: string;
  created_at: string; // ISO 8601
};

export type CreateOrderInput = {
  customer: Customer;
  items: { product_id: string; quantity: number }[];
  payment_method: PaymentMethod;
  note?: string;
};

/** A signed-up shopper (POST /customers/register, /customers/login). */
export type CustomerAccount = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export type CustomerSession = {
  access_token: string;
  customer: CustomerAccount;
};

export type RegisterInput = Omit<CustomerAccount, "id"> & { password: string };
