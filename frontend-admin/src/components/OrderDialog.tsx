"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { errorMessage, updateOrderStatus } from "@/lib/api";
import {
  formatDateTime,
  formatTHB,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  PAYMENT_LABEL,
} from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { useToast } from "./Toast";

/** Allowed next statuses from each status (completed/cancelled are final). */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["shipping", "cancelled"],
  shipping: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** Order details with a status change, shared by the dashboard and the orders page. */
export default function OrderDialog({
  order,
  onClose,
  onUpdated,
}: {
  order: Order;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const toast = useToast();
  const options = NEXT[order.status];
  const [next, setNext] = useState<OrderStatus | "">(options[0] ?? "");
  const [saving, setSaving] = useState(false);

  async function handleUpdate() {
    if (!next) return;
    setSaving(true);
    try {
      await updateOrderStatus(order.id, next);
      toast(`อัปเดต ${order.id} เป็น “${ORDER_STATUS_LABEL[next]}” แล้ว`);
      onUpdated();
      onClose();
    } catch (err) {
      toast(errorMessage(err), "error");
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 1 }}>
          <Box component="span" sx={{ fontFamily: "monospace" }}>
            {order.id}
          </Box>
          <Chip label={ORDER_STATUS_LABEL[order.status]} color={ORDER_STATUS_COLOR[order.status]} />
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          สั่งเมื่อ {formatDateTime(order.created_at)} · {PAYMENT_LABEL[order.payment_method]}
        </Typography>

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          รายการสินค้า
        </Typography>
        <Stack sx={{ gap: 0.5, mb: 1 }}>
          {order.items.map((i) => (
            <Stack key={i.product_id} direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
              <Typography variant="body2">
                {i.name} × {i.quantity} {i.unit}
              </Typography>
              <Typography variant="body2">{formatTHB(i.price * i.quantity)}</Typography>
            </Stack>
          ))}
        </Stack>
        <Stack direction="row" sx={{ justifyContent: "space-between", mb: 2 }}>
          <Typography sx={{ fontWeight: 700 }}>ยอดรวม</Typography>
          <Typography sx={{ fontWeight: 700, color: "primary.main" }}>{formatTHB(order.total)}</Typography>
        </Stack>
        <Divider sx={{ mb: 2 }} />

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          ลูกค้า
        </Typography>
        <Typography variant="body2">{order.customer.name}</Typography>
        <Typography variant="body2">{order.customer.phone}</Typography>
        {order.customer.email && <Typography variant="body2">{order.customer.email}</Typography>}
        <Typography variant="body2" sx={{ whiteSpace: "pre-line", mt: 1 }}>
          {order.customer.address}
        </Typography>
        {order.note && (
          <Alert severity="info" sx={{ mt: 2 }}>
            หมายเหตุ: {order.note}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, gap: 1, flexWrap: "wrap" }}>
        {options.length > 0 ? (
          <>
            <TextField
              select
              size="small"
              label="เปลี่ยนสถานะเป็น"
              value={next}
              onChange={(e) => setNext(e.target.value as OrderStatus)}
              sx={{ minWidth: 200, mr: "auto" }}
            >
              {options.map((s) => (
                <MenuItem key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </MenuItem>
              ))}
            </TextField>
            <Button onClick={onClose} disabled={saving}>
              ปิด
            </Button>
            <Button
              variant="contained"
              color={next === "cancelled" ? "error" : "primary"}
              onClick={handleUpdate}
              disabled={saving || !next}
            >
              {saving ? "กำลังบันทึก..." : "อัปเดตสถานะ"}
            </Button>
          </>
        ) : (
          <>
            <Typography variant="body2" sx={{ color: "text.secondary", mr: "auto" }}>
              คำสั่งซื้อนี้ปิดแล้ว
            </Typography>
            <Button onClick={onClose}>ปิด</Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
