"use client";

import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

type Props = {
  value: number;
  max: number;
  min?: number;
  onChange: (value: number) => void;
  size?: "small" | "medium";
};

export default function QuantityStepper({
  value,
  max,
  min = 1,
  onChange,
  size = "small",
}: Props) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center",
        border: 1,
        borderColor: "divider",
        borderRadius: 999,
        width: "fit-content",
      }}
    >
      <IconButton
        size={size}
        aria-label="ลดจำนวน"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography sx={{ minWidth: 32, textAlign: "center", fontWeight: 600 }}>
        {value}
      </Typography>
      <IconButton
        size={size}
        aria-label="เพิ่มจำนวน"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
