import Box from "@mui/material/Box";
import type { Product } from "@/lib/types";

type Props = {
  product: Pick<Product, "name" | "emoji" | "image_url">;
  size?: number | string; // emoji font size
  height?: number | string;
  rounded?: boolean;
};

/** Product picture: uses image_url (S3/CloudFront) when set, otherwise the emoji. */
export default function FruitImage({
  product,
  size = 72,
  height = 180,
  rounded = false,
}: Props) {
  return (
    <Box
      sx={{
        height,
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: rounded ? 3 : 0,
        background:
          "radial-gradient(circle at 30% 30%, #fffbe6 0%, #eaf6e1 70%)",
      }}
    >
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote bucket URLs vary per environment
        <img
          src={product.image_url}
          alt={product.name}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Box
          component="span"
          role="img"
          aria-label={product.name}
          sx={{ fontSize: size, lineHeight: 1 }}
        >
          {product.emoji || "🧺"}
        </Box>
      )}
    </Box>
  );
}
