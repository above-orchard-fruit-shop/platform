import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

/** Centered card used by the login and sign-up pages. */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Container maxWidth="xs" sx={{ py: { xs: 4, md: 8 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="h5" component="h1">
            {title}
          </Typography>
          <Typography sx={{ color: "text.secondary" }}>{subtitle}</Typography>
        </Box>
        {children}
      </Paper>
    </Container>
  );
}

export function PageSpinner() {
  return (
    <Box sx={{ display: "grid", placeItems: "center", py: 12 }}>
      <CircularProgress />
    </Box>
  );
}
