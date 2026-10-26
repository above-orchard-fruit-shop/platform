"use client";

import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { isMockMode, logout } from "@/lib/api";
import { useToken } from "@/lib/auth";

const DRAWER_WIDTH = 240;

const NAV = [
  { href: "/", label: "แดชบอร์ด", icon: <DashboardOutlinedIcon /> },
  { href: "/products", label: "จัดการสินค้า", icon: <Inventory2OutlinedIcon /> },
  { href: "/orders", label: "คำสั่งซื้อ", icon: <ReceiptLongOutlinedIcon /> },
];

function FullPageSpinner() {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <CircularProgress />
    </Box>
  );
}

/** Auth gate + layout (sidebar and top bar) for every admin page except /login. */
export default function AdminShell({ children }: { children: ReactNode }) {
  const token = useToken();
  // The static export uses trailing slashes (/login/); compare without them.
  const pathname = usePathname().replace(/(.)\/$/, "$1");
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (token === undefined) return; // still hydrating
    if (!token && !isLoginPage) router.replace("/login");
    if (token && isLoginPage) router.replace("/");
  }, [token, isLoginPage, router]);

  if (token === undefined) return <FullPageSpinner />;
  if (isLoginPage) return token ? <FullPageSpinner /> : <>{children}</>;
  if (!token) return <FullPageSpinner />;

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Toolbar sx={{ gap: 1 }}>
        <Box component="span" sx={{ fontSize: 26 }} aria-hidden>
          🍊
        </Box>
        <Box>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.2, color: "primary.main" }}>
            ร้านผลไม้เบื้องบน
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            ระบบหลังร้าน
          </Typography>
        </Box>
      </Toolbar>
      <List sx={{ px: 1 }}>
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <ListItemButton
              key={item.href}
              component={Link}
              href={item.href}
              selected={active}
              onClick={() => setMobileOpen(false)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
      <Box sx={{ mt: "auto", p: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<LogoutIcon />}
          onClick={() => logout()}
        >
          ออกจากระบบ
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        color="inherit"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            aria-label="เปิดเมนู"
            onClick={() => setMobileOpen(true)}
            sx={{ mr: 1, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))
              ?.label ?? "ระบบหลังร้าน"}
          </Typography>
          {isMockMode && (
            <Typography
              variant="caption"
              sx={{
                bgcolor: "secondary.main",
                color: "secondary.contrastText",
                px: 1,
                py: 0.25,
                borderRadius: 1,
              }}
            >
              โหมดทดลอง
            </Typography>
          )}
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": { width: DRAWER_WIDTH } }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flex: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
