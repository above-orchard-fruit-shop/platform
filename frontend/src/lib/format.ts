import type { OrderStatus, PaymentMethod } from "./types";

const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatTHB(value: number): string {
  return thb.format(value);
}

const dateTime = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "รอยืนยัน",
  confirmed: "ยืนยันแล้ว",
  shipping: "กำลังจัดส่ง",
  completed: "สำเร็จ",
  cancelled: "ยกเลิก",
};

export const ORDER_STATUS_COLOR: Record<
  OrderStatus,
  "default" | "info" | "primary" | "warning" | "success" | "error"
> = {
  pending: "warning",
  confirmed: "info",
  shipping: "primary",
  completed: "success",
  cancelled: "error",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cod: "เก็บเงินปลายทาง",
  transfer: "โอนผ่านธนาคาร",
};
