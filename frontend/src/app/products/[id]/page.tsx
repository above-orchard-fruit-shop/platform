"use client";

import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import FruitImage from "@/components/FruitImage";
import QuantityStepper from "@/components/QuantityStepper";
import { useToast } from "@/components/Toast";
import { getProduct } from "@/lib/api";
import { cartActions, useCart } from "@/lib/cart";
import { formatTHB } from "@/lib/format";
import { useLoad } from "@/lib/use-load";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, loading, error } = useLoad(() => getProduct(id), id);
  const { items } = useCart();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);

  const inCart = items.find((l) => l.product.id === id)?.quantity ?? 0;
  const available = Math.max((product?.stock ?? 0) - inCart, 0);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Button component={Link} href="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        กลับไปหน้าสินค้า
      </Button>

      {error ? (
        <Alert severity="error">{error}</Alert>
      ) : loading || !product ? (
        <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { md: "1fr 1fr" } }}>
          <Skeleton variant="rounded" height={380} />
          <Box>
            <Skeleton width="60%" height={48} />
            <Skeleton width="30%" height={40} />
            <Skeleton height={100} />
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gap: 4, gridTemplateColumns: { md: "1fr 1fr" } }}>
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 3, overflow: "hidden" }}>
            <FruitImage product={product} height={380} />
          </Box>
          <Stack sx={{ gap: 2 }}>
            <Chip label={product.category} size="small" sx={{ width: "fit-content" }} />
            <Typography variant="h4" component="h1">
              {product.name}
            </Typography>
            <Stack direction="row" sx={{ alignItems: "baseline", gap: 1 }}>
              <Typography variant="h4" sx={{ color: "primary.main" }}>
                {formatTHB(product.price)}
              </Typography>
              <Typography sx={{ color: "text.secondary" }}>/ {product.unit}</Typography>
            </Stack>
            <Typography sx={{ color: "text.secondary", whiteSpace: "pre-line" }}>
              {product.description}
            </Typography>
            <Typography variant="body2">
              {product.stock > 0
                ? `คงเหลือ ${product.stock} ${product.unit}`
                : "สินค้าหมดชั่วคราว"}
              {inCart > 0 && ` · อยู่ในตะกร้าแล้ว ${inCart} ${product.unit}`}
            </Typography>

            {available > 0 && (
              <Stack direction="row" sx={{ gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <QuantityStepper
                  value={Math.min(quantity, available)}
                  max={available}
                  onChange={setQuantity}
                  size="medium"
                />
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AddShoppingCartIcon />}
                  onClick={() => {
                    const qty = Math.min(quantity, available);
                    cartActions.add(product, qty);
                    toast(`เพิ่ม ${product.name} ${qty} ${product.unit} ลงตะกร้าแล้ว`);
                    setQuantity(1);
                  }}
                >
                  ใส่ตะกร้า
                </Button>
              </Stack>
            )}
            {product.stock > 0 && available === 0 && (
              <Alert severity="info">คุณใส่สินค้านี้ในตะกร้าครบตามจำนวนที่มีแล้ว</Alert>
            )}
          </Stack>
        </Box>
      )}
    </Container>
  );
}
