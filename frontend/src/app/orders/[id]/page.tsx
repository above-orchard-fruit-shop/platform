"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getOrder } from "@/lib/api";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  formatDateTime,
  formatTHB,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
  PAYMENT_LABEL,
} from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const FLOW: OrderStatus[] = ["pending", "confirmed", "shipping", "completed"];

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const orderId = decodeURIComponent(id);
  const {
    data: order,
    loading,
    error,
    reload,
  } = useLoad(() => getOrder(orderId), orderId);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {error ? (
        <Stack sx={{ gap: 2, alignItems: "flex-start" }}>
          <Alert severity="error" sx={{ width: "100%" }}>
            {error}
          </Alert>
          <Button component={Link} href="/track">
            ค้นหาคำสั่งซื้ออื่น
          </Button>
        </Stack>
      ) : loading && !order ? (
        <Stack sx={{ gap: 2 }}>
          <Skeleton width="50%" height={48} />
          <Skeleton variant="rounded" height={120} />
          <Skeleton variant="rounded" height={240} />
        </Stack>
      ) : order ? (
        <Stack sx={{ gap: 3 }}>
          {order.status === "pending" && (
            <Alert severity="success">
              ได้รับคำสั่งซื้อของคุณแล้ว ร้านจะตรวจสอบและยืนยันโดยเร็วที่สุด
              กรุณาบันทึกเลขคำสั่งซื้อไว้เพื่อติดตามสถานะ
            </Alert>
          )}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            sx={{ justifyContent: "space-between", gap: 1 }}
          >
            <Box>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                เลขคำสั่งซื้อ
              </Typography>
              <Typography
                variant="h5"
                component="h1"
                sx={{ fontFamily: "monospace" }}
              >
                {order.id}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                สั่งเมื่อ {formatDateTime(order.created_at)}
              </Typography>
            </Box>
            <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
              <Chip
                label={ORDER_STATUS_LABEL[order.status]}
                color={ORDER_STATUS_COLOR[order.status]}
              />
              <Button
                size="small"
                onClick={reload}
                disabled={loading}
                sx={{
                  maxWidth:"20px",
                  // 1. สร้าง Keyframes สำหรับแอนิเมชันตอนกำลังโหลด
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },

                  // 2. ตั้งค่าความนุ่มนวลในการหมุนของไอคอนในสภาวะปกติ
                  "& .MuiSvgIcon-root": {
                    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  },

                  // 3. เมื่อเมาส์วาง (Hover) และไม่ได้อยู่ในสถานะโหลด ให้หมุน 30 องศา
                  "&:hover:not(:disabled) .MuiSvgIcon-root": {
                    transform: "rotate(60deg)",
                  },

                  // 4. เมื่อกำลังโหลด (Button จะ disabled) ให้ไอคอนหมุนวนไม่สิ้นสุดจนกว่าจะโหลดเสร็จ
                  "&:disabled .MuiSvgIcon-root": {
                    animation: loading ? "spin 1s linear infinite" : "none",
                  },
                }}
              >
                <RefreshIcon />
              </Button>
            </Stack>
          </Stack>

          <Paper variant="outlined" sx={{ p: 3 }}>
            {order.status === "cancelled" ? (
              <Alert severity="error">คำสั่งซื้อนี้ถูกยกเลิกแล้ว</Alert>
            ) : (
              <Stepper activeStep={FLOW.indexOf(order.status)} alternativeLabel>
                {FLOW.map((s) => (
                  <Step
                    key={s}
                    completed={FLOW.indexOf(s) <= FLOW.indexOf(order.status)}
                  >
                    <StepLabel>{ORDER_STATUS_LABEL[s]}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              รายการสินค้า
            </Typography>
            <Stack sx={{ gap: 1 }}>
              {order.items.map((item) => (
                <Stack
                  key={item.product_id}
                  direction="row"
                  sx={{ justifyContent: "space-between", gap: 2 }}
                >
                  <Typography>
                    {item.name} × {item.quantity} {item.unit}
                  </Typography>
                  <Typography>
                    {formatTHB(item.price * item.quantity)}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Divider sx={{ my: 2 }} />
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="h6">ยอดรวม</Typography>
              <Typography variant="h6" sx={{ color: "primary.main" }}>
                {formatTHB(order.total)}
              </Typography>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              ข้อมูลการจัดส่ง
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>
              {order.customer.name}
            </Typography>
            <Typography>{order.customer.phone}</Typography>
            {order.customer.email && (
              <Typography>{order.customer.email}</Typography>
            )}
            <Typography sx={{ whiteSpace: "pre-line", mt: 1 }}>
              {order.customer.address}
            </Typography>
            <Typography sx={{ mt: 2, color: "text.secondary" }}>
              ชำระเงิน: {PAYMENT_LABEL[order.payment_method]}
            </Typography>
            {order.note && (
              <Typography sx={{ color: "text.secondary" }}>
                หมายเหตุ: {order.note}
              </Typography>
            )}
          </Paper>

          <Button
            component={Link}
            href="/"
            variant="outlined"
            sx={{ alignSelf: "flex-start" }}
          >
            เลือกซื้อสินค้าต่อ
          </Button>
        </Stack>
      ) : null}
    </Container>
  );
}
