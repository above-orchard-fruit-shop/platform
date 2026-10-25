import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";

export default function SiteFooter() {
  return (
    <Box
      component="footer"
      sx={{ borderTop: 1, borderColor: "divider", py: 4, mt: 8, bgcolor: "background.paper" }}
    >
      <Container maxWidth="lg">
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          ร้านผลไม้เบื้องบน
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          ผลไม้สดคัดเกรด สั่งออนไลน์ได้ตลอด 24 ชั่วโมง
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 2 }}>
          © {new Date().getFullYear()} Above Orchard Fruit Shop
        </Typography>
      </Container>
    </Box>
  );
}
