"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import FruitImage from "@/components/FruitImage";
import { listOrders, listProducts } from "@/lib/api";
import {
  formatDateTime,
  formatTHB,
  LOW_STOCK,
  ORDER_STATUS_COLOR,
  ORDER_STATUS_LABEL,
} from "@/lib/format";
import { useLoad } from "@/lib/use-load";

function isToday(iso: string) {
  return new Date(iso).toDateString() === new Date().toDateString();
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {label}
        </Typography>
        <Typography variant="h4" sx={{ my: 0.5 }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const data = useLoad(() => Promise.all([listOrders(), listProducts()]));
  const [orders, products] = data.data ?? [[], []];

  const active = orders.filter((o) => o.status !== "cancelled");
  const todays = active.filter((o) => isToday(o.created_at));
  const pending = orders.filter((o) => o.status === "pending");
  const lowStock = products
    .filter((p) => p.is_active && p.stock <= LOW_STOCK)
    .sort((a, b) => a.stock - b.stock);

  if (data.error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" onClick={data.reload}>
            ลองใหม่
          </Button>
        }
      >
        {data.error}
      </Alert>
    );
  }

  if (!data.data) {
    return (
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { sm: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={120} />
        ))}
      </Box>
    );
  }

  return (
    <Stack sx={{ gap: 3 }}>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { sm: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
        <StatCard
          label="ยอดขายวันนี้"
          value={formatTHB(todays.reduce((s, o) => s + o.total, 0))}
          hint={`${todays.length} คำสั่งซื้อ (ไม่รวมที่ยกเลิก)`}
        />
        <StatCard label="รอยืนยัน" value={String(pending.length)} hint="คำสั่งซื้อที่ต้องตรวจสอบ" />
        <StatCard
          label="ยอดขายรวม"
          value={formatTHB(active.reduce((s, o) => s + o.total, 0))}
          hint={`${active.length} คำสั่งซื้อทั้งหมด`}
        />
        <StatCard
          label="สินค้าใกล้หมด"
          value={String(lowStock.length)}
          hint={`คงเหลือ ≤ ${LOW_STOCK} หน่วย`}
        />
      </Box>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { lg: "2fr 1fr" }, alignItems: "start" }}>
        <Card>
          <CardContent>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h6">คำสั่งซื้อล่าสุด</Typography>
              <Button component={Link} href="/orders" size="small">
                ดูทั้งหมด
              </Button>
            </Stack>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>เลขที่</TableCell>
                    <TableCell>ลูกค้า</TableCell>
                    <TableCell>เวลา</TableCell>
                    <TableCell align="right">ยอด</TableCell>
                    <TableCell>สถานะ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {orders.slice(0, 6).map((o) => (
                    <TableRow key={o.id} hover>
                      <TableCell sx={{ fontFamily: "monospace" }}>{o.id}</TableCell>
                      <TableCell>{o.customer.name}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(o.created_at)}</TableCell>
                      <TableCell align="right">{formatTHB(o.total)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={ORDER_STATUS_LABEL[o.status]}
                          color={ORDER_STATUS_COLOR[o.status]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: "text.secondary" }}>
                        ยังไม่มีคำสั่งซื้อ
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h6">สินค้าใกล้หมด</Typography>
              <Button component={Link} href="/products" size="small">
                จัดการสินค้า
              </Button>
            </Stack>
            {lowStock.length === 0 ? (
              <Typography sx={{ color: "text.secondary" }}>สต็อกเพียงพอทุกรายการ</Typography>
            ) : (
              <Stack sx={{ gap: 1 }}>
                {lowStock.map((p) => (
                  <Stack key={p.id} direction="row" sx={{ alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 36, flexShrink: 0, borderRadius: 1.5, overflow: "hidden" }}>
                      <FruitImage product={p} height={36} />
                    </Box>
                    <Typography sx={{ flex: 1 }} noWrap>
                      {p.name}
                    </Typography>
                    <Chip
                      size="small"
                      color={p.stock === 0 ? "error" : "warning"}
                      label={p.stock === 0 ? "หมด" : `${p.stock} ${p.unit}`}
                    />
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Box>
    </Stack>
  );
}
