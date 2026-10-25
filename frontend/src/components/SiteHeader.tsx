"use client";

import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import AppBar from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { isMockMode } from "@/lib/api";
import { useCart } from "@/lib/cart";

export default function SiteHeader() {
  const { count } = useCart();

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{ borderBottom: 1, borderColor: "divider" }}
    >
      {isMockMode && (
        <Box
          sx={{
            bgcolor: "secondary.main",
            color: "secondary.contrastText",
            textAlign: "center",
            fontSize: 12,
            py: 0.25,
          }}
        >
          โหมดทดลอง: ข้อมูลเก็บในเบราว์เซอร์นี้ (ยังไม่ได้ตั้งค่า NEXT_PUBLIC_API_URL)
        </Box>
      )}
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 1 }}>
          <Box
            component={Link}
            href="/"
            sx={{ display: "flex", alignItems: "center", gap: 1, mr: "auto" }}
          >
            <Box component="span" sx={{ fontSize: 28 }} aria-hidden>
              🍊
            </Box>
            <Typography
              variant="h6"
              component="span"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              ร้านผลไม้เบื้องบน
            </Typography>
          </Box>
          <Button
            component={Link}
            href="/"
            color="inherit"
            sx={{ display: { xs: "none", sm: "inline-flex" } }}
          >
            สินค้าทั้งหมด
          </Button>
          <Button component={Link} href="/track" color="inherit">
            ติดตามคำสั่งซื้อ
          </Button>
          <IconButton
            component={Link}
            href="/cart"
            aria-label={`ตะกร้าสินค้า ${count} ชิ้น`}
            color="primary"
          >
            <Badge badgeContent={count} color="secondary" max={99}>
              <ShoppingCartOutlinedIcon />
            </Badge>
          </IconButton>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
