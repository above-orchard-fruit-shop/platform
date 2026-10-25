"use client";

import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import OrderDialog from "@/components/OrderDialog";
import { listOrders } from "@/lib/api";
import { formatDateTime, formatTHB, ORDER_STATUS_COLOR, ORDER_STATUS_LABEL } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const STATUSES: OrderStatus[] = ["pending", "confirmed", "shipping", "completed", "cancelled"];

type Filter = OrderStatus | "all";

export default function OrdersPage() {
  const { data: orders, loading, error, reload } = useLoad(listOrders);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const all = orders ?? [];
  const q = query.trim().toLowerCase();
  const visible = all.filter(
    (o) =>
      (filter === "all" || o.status === filter) &&
      (!q ||
        o.id.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.customer.phone.includes(q)),
  );
  const countOf = (s: Filter) => (s === "all" ? all.length : all.filter((o) => o.status === s).length);
  const selected = all.find((o) => o.id === selectedId) ?? null;

  return (
    <Stack sx={{ gap: 2 }}>
      <Paper variant="outlined">
        <Tabs
          value={filter}
          onChange={(_, v: Filter) => setFilter(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {(["all", ...STATUSES] as Filter[]).map((s) => (
            <Tab
              key={s}
              value={s}
              label={`${s === "all" ? "ทั้งหมด" : ORDER_STATUS_LABEL[s]} (${countOf(s)})`}
            />
          ))}
        </Tabs>
      </Paper>

      <TextField
        size="small"
        placeholder="ค้นหาเลขคำสั่งซื้อ ชื่อ หรือเบอร์โทร"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ maxWidth: 400, bgcolor: "background.paper" }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />

      {error && (
        <Alert severity="error" action={<Button color="inherit" onClick={reload}>ลองใหม่</Button>}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        {loading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>เลขคำสั่งซื้อ</TableCell>
                <TableCell>วันที่</TableCell>
                <TableCell>ลูกค้า</TableCell>
                <TableCell align="right">รายการ</TableCell>
                <TableCell align="right">ยอดรวม</TableCell>
                <TableCell>สถานะ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((o) => (
                <TableRow
                  key={o.id}
                  hover
                  onClick={() => setSelectedId(o.id)}
                  sx={{ cursor: "pointer" }}
                >
                  <TableCell sx={{ fontFamily: "monospace" }}>{o.id}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(o.created_at)}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{o.customer.name}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {o.customer.phone}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{o.items.reduce((s, i) => s + i.quantity, 0)}</TableCell>
                  <TableCell align="right">{formatTHB(o.total)}</TableCell>
                  <TableCell>
                    <Chip size="small" label={ORDER_STATUS_LABEL[o.status]} color={ORDER_STATUS_COLOR[o.status]} />
                  </TableCell>
                </TableRow>
              ))}
              {orders && visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    ไม่มีคำสั่งซื้อในรายการนี้
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {selected && (
        <OrderDialog
          key={selected.id}
          order={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={reload}
        />
      )}
    </Stack>
  );
}
