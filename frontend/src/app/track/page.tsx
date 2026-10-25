"use client";

import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrackPage() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
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
    </Container>
  );
}
