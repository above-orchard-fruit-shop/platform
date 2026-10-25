"use client";

import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import InputAdornment from "@mui/material/InputAdornment";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import { listProducts } from "@/lib/api";
import { useLoad } from "@/lib/use-load";

const ALL = "ทั้งหมด";

const gridSx = {
  display: "grid",
  gap: 2,
  gridTemplateColumns: {
    xs: "repeat(2, minmax(0, 1fr))",
    sm: "repeat(3, minmax(0, 1fr))",
    md: "repeat(4, minmax(0, 1fr))",
  },
} as const;

export default function CatalogPage() {
  const { data: products, loading, error, reload } = useLoad(listProducts);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);

  const categories = [ALL, ...new Set((products ?? []).map((p) => p.category))];
  const q = query.trim().toLowerCase();
  const visible = (products ?? []).filter(
    (p) =>
      (category === ALL || p.category === category) &&
      (q === "" ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)),
  );

  return (
    <>
      <Box
        sx={{
          background: "linear-gradient(120deg, #e8f5e9 0%, #fff3e0 100%)",
          py: { xs: 5, md: 8 },
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h3"
            component="h1"
            sx={{ fontSize: { xs: 30, md: 44 }, mb: 1 }}
          >
            ผลไม้สดคัดเกรด ส่งตรงถึงบ้าน
          </Typography>
          <Typography
            variant="h6"
            component="p"
            sx={{ color: "text.secondary", fontWeight: 400, maxWidth: 560 }}
          >
            ดูสินค้าและราคาได้ตลอด 24 ชั่วโมง สั่งง่าย จ่ายสะดวก
            ไม่ต้องอยู่ใกล้ร้านก็ซื้อได้
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          sx={{ gap: 2, mb: 3, alignItems: { md: "center" } }}
        >
          <TextField
            placeholder="ค้นหาผลไม้..."
            size="small"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: { md: 320 }, bgcolor: "background.paper" }}
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
          <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
            {categories.map((c) => (
              <Chip
                key={c}
                label={c}
                color={c === category ? "primary" : "default"}
                variant={c === category ? "filled" : "outlined"}
                onClick={() => setCategory(c)}
              />
            ))}
          </Stack>
        </Stack>

        {error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={reload}>
                ลองใหม่
              </Button>
            }
          >
            โหลดรายการสินค้าไม่สำเร็จ: {error}
          </Alert>
        )}

        {loading && !products ? (
          <Box sx={gridSx}>
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} variant="rounded" height={300} />
            ))}
          </Box>
        ) : products && visible.length === 0 ? (
          <Typography sx={{ color: "text.secondary", textAlign: "center", py: 8 }}>
            ไม่พบสินค้าที่ค้นหา
          </Typography>
        ) : (
          <Box sx={gridSx}>
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </Box>
        )}
      </Container>
    </>
  );
}
