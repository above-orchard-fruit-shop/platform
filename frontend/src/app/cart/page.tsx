"use client";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import FruitImage from "@/components/FruitImage";
import QuantityStepper from "@/components/QuantityStepper";
import { useCart } from "@/lib/cart";
import { formatTHB } from "@/lib/format";

export default function CartPage() {
  const { items, count, total, setQuantity, remove } = useCart();

  if (items.length === 0) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <Typography sx={{ fontSize: 64 }} aria-hidden>
          🧺
        </Typography>
        <Typography variant="h5" sx={{ mb: 1 }}>
          ตะกร้าของคุณยังว่างอยู่
        </Typography>
        <Typography sx={{ color: "text.secondary", mb: 3 }}>
          เลือกผลไม้ที่ชอบแล้วกด “ใส่ตะกร้า” ได้เลย
        </Typography>
        <Button component={Link} href="/" variant="contained">
          เลือกซื้อสินค้า
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        ตะกร้าสินค้า
      </Typography>
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { md: "2fr 1fr" }, alignItems: "start" }}>
        <Paper variant="outlined">
          {items.map((line, i) => (
            <Box key={line.product.id}>
              {i > 0 && <Divider />}
              <Stack direction="row" sx={{ p: 2, gap: 2, alignItems: "center" }}>
                <Box sx={{ width: 72, flexShrink: 0 }}>
                  <FruitImage product={line.product} height={72} rounded />
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    component={Link}
                    href={`/products/${line.product.id}`}
                    sx={{ fontWeight: 600, display: "block" }}
                    noWrap
                  >
                    {line.product.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                    {formatTHB(line.product.price)} / {line.product.unit}
                  </Typography>
                  <QuantityStepper
                    value={line.quantity}
                    max={line.product.stock}
                    onChange={(q) => setQuantity(line.product.id, q)}
                  />
                </Box>
                <Stack sx={{ alignItems: "flex-end", gap: 1 }}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {formatTHB(line.product.price * line.quantity)}
                  </Typography>
                  <IconButton
                    aria-label={`ลบ ${line.product.name}`}
                    onClick={() => remove(line.product.id)}
                  >
                    <DeleteOutlineIcon />
                  </IconButton>
                </Stack>
              </Stack>
            </Box>
          ))}
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, position: { md: "sticky" }, top: { md: 96 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            สรุปคำสั่งซื้อ
          </Typography>
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 1 }}>
            <Typography sx={{ color: "text.secondary" }}>จำนวนสินค้า</Typography>
            <Typography>{count} ชิ้น</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 2 }}>
            <Typography sx={{ color: "text.secondary" }}>ค่าจัดส่ง</Typography>
            <Typography>ฟรี</Typography>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h6">ยอดรวม</Typography>
            <Typography variant="h6" sx={{ color: "primary.main" }}>
              {formatTHB(total)}
            </Typography>
          </Stack>
          <Button component={Link} href="/checkout" variant="contained" size="large" fullWidth>
            ดำเนินการสั่งซื้อ
          </Button>
          <Button component={Link} href="/" fullWidth sx={{ mt: 1 }}>
            เลือกสินค้าเพิ่ม
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}
