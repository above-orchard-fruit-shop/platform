"use client";

import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cartActions } from "@/lib/cart";
import { formatTHB } from "@/lib/format";
import { loginHref, useAuth } from "@/lib/session";
import type { Product } from "@/lib/types";
import FruitImage from "./FruitImage";
import { useToast } from "./Toast";

export const LOW_STOCK = 10;

export default function ProductCard({ product }: { product: Product }) {
  const toast = useToast();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const soldOut = product.stock <= 0;

  return (
    <Card sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <CardActionArea component={Link} href={`/products/${product.id}`}>
        <FruitImage product={product} height={160} />
        <CardContent sx={{ pb: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {product.category}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
            {product.name}
          </Typography>
          <Stack direction="row" sx={{ alignItems: "baseline", gap: 0.5 }}>
            <Typography variant="h6" sx={{ color: "primary.main" }}>
              {formatTHB(product.price)}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              / {product.unit}
            </Typography>
          </Stack>
          {soldOut ? (
            <Chip label="สินค้าหมด" size="small" sx={{ mt: 0.5 }} />
          ) : product.stock <= LOW_STOCK ? (
            <Chip
              label={`เหลือ ${product.stock} ${product.unit}`}
              size="small"
              color="warning"
              variant="outlined"
              sx={{ mt: 0.5 }}
            />
          ) : null}
        </CardContent>
      </CardActionArea>
      <CardContent sx={{ pt: 0, mt: "auto" }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<AddShoppingCartIcon />}
          disabled={soldOut}
          onClick={() => {
            if (auth.status !== "signed-in") {
              router.push(loginHref(pathname));
              return;
            }
            cartActions.add(product, 1);
            toast(`เพิ่ม ${product.name} ลงตะกร้าแล้ว`);
          }}
        >
          {soldOut ? "สินค้าหมด" : "ใส่ตะกร้า"}
        </Button>
      </CardContent>
    </Card>
  );
}
