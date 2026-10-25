"use client";

import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Link from "next/link";

export default function NotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
      <Typography sx={{ fontSize: 64 }} aria-hidden>
        🍂
      </Typography>
      <Typography variant="h5" sx={{ mb: 2 }}>
        ไม่พบหน้าที่คุณต้องการ
      </Typography>
      <Button component={Link} href="/" variant="contained">
        กลับหน้าแรก
      </Button>
    </Container>
  );
}
