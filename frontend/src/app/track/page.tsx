"use client";

import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { listMyOrders } from "@/lib/api";
import { formatDateTime, formatTHB, ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from "@/lib/format";
import { loginHref, useAuth } from "@/lib/session";
import type { CustomerSession, Order } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

export default function TrackPage() {
  const auth = useAuth();

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack sx={{ gap: 3 }}>
        <LookupByNumber />
        {auth.status === "signed-in" ? (
          <OrderHistory session={auth.session} />
        ) : auth.status === "signed-out" ? (
          <Alert
            severity="info"
            action={
              <Button component={Link} href={loginHref("/track")} color="inherit" size="small">
                เข้าสู่ระบบ
              </Button>
            }
          >
            เข้าสู่ระบบเพื่อดูประวัติคำสั่งซื้อทั้งหมดของคุณ
          </Alert>
        ) : null}
      </Stack>
    </Container>
  );
}

/** Anyone with an order number can look it up, signed in or not. */
function LookupByNumber() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");

  return (
    <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
      <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
        ติดตามคำสั่งซื้อ
      </Typography>
      <Typography sx={{ color: "text.secondary", mb: 3 }}>
        กรอกเลขคำสั่งซื้อที่ได้รับหลังสั่งซื้อ เช่น AO-XXXXXXX-XXXXX
      </Typography>
      <Stack
        component="form"
        direction={{ xs: "column", sm: "row" }}
        sx={{ gap: 2 }}
        onSubmit={(e) => {
          e.preventDefault();
          const id = orderId.trim();
          if (id) router.push(`/orders/${encodeURIComponent(id)}`);
        }}
      >
        <TextField
          label="เลขคำสั่งซื้อ"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value.toUpperCase())}
          fullWidth
          size="small"
        />
        <Button type="submit" variant="contained" disabled={!orderId.trim()}>
          ค้นหา
        </Button>
      </Stack>
    </Paper>
  );
}

function OrderHistory({ session }: { session: CustomerSession }) {
  // Keyed by customer so switching accounts reloads the list.
  const { data: orders, loading, error, reload } = useLoad(listMyOrders, session.customer.id);

  return (
    <Paper variant="outlined">
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
        <Typography variant="h6" component="h2">
          ประวัติคำสั่งซื้อของฉัน
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          กดที่คำสั่งซื้อเพื่อดูรายละเอียดและสถานะการจัดส่ง
        </Typography>
      </Box>
      <Divider />
      {error ? (
        <Box sx={{ p: 2 }}>
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={reload}>
                ลองใหม่
              </Button>
            }
          >
            โหลดประวัติคำสั่งซื้อไม่สำเร็จ: {error}
          </Alert>
        </Box>
      ) : loading && !orders ? (
        <Stack sx={{ p: 2, gap: 1 }}>
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} variant="rounded" height={64} />
          ))}
        </Stack>
      ) : !orders || orders.length === 0 ? (
        <Stack sx={{ p: 4, gap: 2, alignItems: "center", textAlign: "center" }}>
          <Typography sx={{ color: "text.secondary" }}>ยังไม่มีคำสั่งซื้อ</Typography>
          <Button component={Link} href="/" variant="contained">
            เลือกซื้อสินค้า
          </Button>
        </Stack>
      ) : (
        orders.map((order, i) => (
          <Fragment key={order.id}>
            {i > 0 && <Divider />}
            <OrderRow order={order} />
          </Fragment>
        ))
      )}
    </Paper>
  );
}

/** "มะม่วง × 2" or "มะม่วง × 2 และอีก 3 รายการ" */
function itemSummary(order: Order): string {
  const [first, ...rest] = order.items;
  if (!first) return "";
  const head = `${first.name} × ${first.quantity}`;
  return rest.length > 0 ? `${head} และอีก ${rest.length} รายการ` : head;
}

function OrderRow({ order }: { order: Order }) {
  return (
    <Box
      component={Link}
      href={`/orders/${encodeURIComponent(order.id)}`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: { xs: 2, sm: 3 },
        py: 1.5,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontWeight: 600, fontFamily: "monospace" }}>{order.id}</Typography>
          <Chip
            size="small"
            label={ORDER_STATUS_LABEL[order.status]}
            color={ORDER_STATUS_COLOR[order.status]}
          />
        </Stack>
        <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
          {formatDateTime(order.created_at)} · {itemSummary(order)}
        </Typography>
      </Box>
      <Typography sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>{formatTHB(order.total)}</Typography>
      <ChevronRightIcon sx={{ color: "text.secondary" }} aria-hidden />
    </Box>
  );
}
