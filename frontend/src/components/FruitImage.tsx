"use client";

import Box from "@mui/material/Box";
import { useState } from "react";
import type { Product } from "@/lib/types";

/** Shown when a product has no image_url, or its image fails to load. */
const FALLBACK_SRC = "/notfound.png";

type Props = {
  product: Pick<Product, "name" | "image_url">;
  height?: number | string;
  rounded?: boolean;
};

/** Product picture from image_url (S3/CloudFront), or the "image not found" placeholder. */
export default function FruitImage({ product, height = 180, rounded = false }: Props) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = product.image_url && product.image_url !== failedSrc ? product.image_url : FALLBACK_SRC;

  return (
    <Box
      sx={{
        height,
        width: "100%",
        overflow: "hidden",
        borderRadius: rounded ? 3 : 0,
        bgcolor: "grey.200",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- remote bucket URLs vary per environment */}
      <img
        src={src}
        alt={product.name}
        onError={() => {
          if (src !== FALLBACK_SRC) setFailedSrc(src);
        }}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </Box>
  );
}
