"use client";

import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import AppBar from "@mui/material/AppBar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { isMockMode, logoutCustomer } from "@/lib/api";
import { cartActions, useCart } from "@/lib/cart";
import { loginHref, useAuth } from "@/lib/session";
import type { CustomerAccount } from "@/lib/types";

export default function SiteHeader() {
  const auth = useAuth();
  const pathname = usePathname();
  // On the login/sign-up pages the button would only drop their ?next= target.
  const onAuthPage = pathname === "/login" || pathname === "/register";

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
          {auth.status === "signed-in" ? (
            <>
              <CartButton />
              <AccountMenu customer={auth.session.customer} />
            </>
          ) : auth.status === "signed-out" && !onAuthPage ? (
            <Button
              component={Link}
              href={loginHref(pathname)}
              variant="contained"
              startIcon={<LoginIcon />}
              sx={{ flexShrink: 0 }}
            >
              เข้าสู่ระบบ
            </Button>
          ) : (
            // Sign-in state is unknown until hydration; keep the space so nothing jumps.
            <Box sx={{ width: 40, height: 40 }} />
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}

function CartButton() {
  const { count } = useCart();
  return (
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
  );
}

function AccountMenu({ customer }: { customer: CustomerAccount }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  function logout() {
    setAnchor(null);
    // The cart belongs to this shopper; don't leave it for the next person on this device.
    cartActions.clear();
    logoutCustomer();
  }

  return (
    <>
      <IconButton
        aria-label={`บัญชีของ ${customer.name}`}
        aria-haspopup="menu"
        onClick={(e) => setAnchor(e.currentTarget)}
        color="primary"
      >
        <AccountCircleOutlinedIcon />
      </IconButton>
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ px: 2, py: 1, maxWidth: 260 }}>
          <Typography sx={{ fontWeight: 600 }} noWrap>
            {customer.name}
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }} noWrap>
            {customer.email}
          </Typography>
        </Box>
        <Divider />
        <MenuItem onClick={logout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          ออกจากระบบ
        </MenuItem>
      </Menu>
    </>
  );
}
